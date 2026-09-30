import AppKit
import Foundation
import Darwin

struct Snapshot: Decodable {
    let schemaVersion: Int
    let runtime: String
    let desktop: String
    let version: String?
    let error: String?
}

struct LaunchState: Decodable {
    let baseCommand: [String]?
    let launcher: String
    let launcherArguments: [String]?
}

struct Payload: Codable, Equatable {
    let version: String
    let archive: String
    let sha256: String
}

struct CommandFailure: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

final class MenuBarApp: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var item: NSStatusItem!
    private let menu = NSMenu()
    private let runtimeItem = NSMenuItem(title: "Runtime：正在检查…", action: nil, keyEquivalent: "")
    private let desktopItem = NSMenuItem(title: "看板：等待连接", action: nil, keyEquivalent: "")
    private let versionItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    private var actionItems: [NSMenuItem] = []
    private var timer: Timer?
    private var refreshing = false
    private var busy = false
    private var lastError: String?
    private var lockFD: Int32 = -1
    private let environment = ProcessInfo.processInfo.environment
    private let profile: String
    private let home: URL
    private let background: Bool

    override init() {
        let args = CommandLine.arguments
        profile = Bundle.main.object(forInfoDictionaryKey: "BetterCodexProfile") as? String ?? "stable"
        let index = args.firstIndex(of: "--home")
        let specified = index.flatMap { $0 + 1 < args.count ? args[$0 + 1] : nil }
        let fallback = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(profile == "development" ? ".better-codex-dev" : ".better-codex").path
        home = URL(fileURLWithPath: specified ?? ProcessInfo.processInfo.environment["BETTER_CODEX_HOME"] ?? fallback)
        background = args.contains("--background")
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            try FileManager.default.createDirectory(at: home.appendingPathComponent("run"), withIntermediateDirectories: true)
            lockFD = Darwin.open(home.appendingPathComponent("run/menubar.lock").path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
            guard lockFD >= 0, flock(lockFD, LOCK_EX | LOCK_NB) == 0 else { NSApp.terminate(nil); return }
            try FileManager.default.createDirectory(at: home.appendingPathComponent("logs"), withIntermediateDirectories: true)
            item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
            if let imageURL = Bundle.main.url(forResource: "MenuBarTemplate", withExtension: "png"), let image = NSImage(contentsOf: imageURL) {
                image.size = NSSize(width: 18, height: 18)
                image.isTemplate = true
                item.button?.image = image
            } else { item.button?.title = ">_" }
            item.button?.setAccessibilityLabel(profile == "development" ? "Better Codex Dev" : "Better Codex")
            menu.autoenablesItems = false
            menu.delegate = self
            for row in [runtimeItem, desktopItem, versionItem] { row.isEnabled = false; menu.addItem(row) }
            menu.addItem(.separator())
            add("打开 Codex / 启用看板…", #selector(openCodex))
            add("打开网页任务面板", #selector(openWeb))
            add("启动 Runtime", #selector(startRuntime))
            add("刷新状态", #selector(refreshAction))
            menu.addItem(.separator())
            add("查看日志", #selector(openLogs))
            add("查看最近错误", #selector(showLastError))
            menu.addItem(.separator())
            add("退出 Better Codex", #selector(quit))
            item.menu = menu
            timer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in self?.refresh() }
            bootstrap()
        } catch { show(error.localizedDescription) }
    }

    private func add(_ title: String, _ action: Selector) {
        let row = NSMenuItem(title: title, action: action, keyEquivalent: "")
        row.target = self
        menu.addItem(row)
        actionItems.append(row)
    }

    private func context() -> [String: String] {
        var env = environment
        env["BETTER_CODEX_HOME"] = home.path
        env["BETTER_CODEX_PROFILE"] = profile
        // The current base launcher alone selects the active core.
        env.removeValue(forKey: "BETTER_CODEX_BASE_ENTRYPOINT")
        env.removeValue(forKey: "BETTER_CODEX_LAUNCHER_PATH")
        return env
    }

    private func command() throws -> [String] {
        let state = try JSONDecoder().decode(LaunchState.self, from: Data(contentsOf: home.appendingPathComponent("run/launch-integration.json")))
        let args = state.baseCommand ?? ([state.launcher] + (state.launcherArguments ?? []))
        guard let executable = args.first, executable.hasPrefix("/"), FileManager.default.isExecutableFile(atPath: executable) else {
            throw CommandFailure(message: "安装入口不可用，请重新打开 DMG 中的 Better Codex。")
        }
        return args
    }

    // Run off the main thread. Files avoid blocking a verbose child on a full pipe.
    private func run(_ args: [String], env: [String: String]? = nil, timeout: TimeInterval = 30) throws -> Data {
        let output = home.appendingPathComponent("run/desktop-command-\(UUID().uuidString).log")
        let errors = output.appendingPathExtension("stderr")
        FileManager.default.createFile(atPath: output.path, contents: nil, attributes: [.posixPermissions: 0o600])
        FileManager.default.createFile(atPath: errors.path, contents: nil, attributes: [.posixPermissions: 0o600])
        let handle = try FileHandle(forWritingTo: output)
        let errorHandle = try FileHandle(forWritingTo: errors)
        defer { try? handle.close(); try? errorHandle.close(); try? FileManager.default.removeItem(at: output); try? FileManager.default.removeItem(at: errors) }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: args[0])
        process.arguments = Array(args.dropFirst())
        process.environment = env ?? context()
        process.standardInput = FileHandle.nullDevice
        process.standardOutput = handle
        process.standardError = errorHandle
        let finished = DispatchSemaphore(value: 0)
        process.terminationHandler = { _ in finished.signal() }
        try process.run()
        if finished.wait(timeout: .now() + timeout) == .timedOut {
            if process.isRunning { process.terminate() }
            throw CommandFailure(message: "操作等待超时，结果尚未确认。请查看日志，勿重复安装或升级。")
        }
        var data = try Data(contentsOf: output)
        if process.terminationStatus != 0 {
            data.append((try? Data(contentsOf: errors)) ?? Data())
            let log = home.appendingPathComponent("logs/desktop.log")
            if !FileManager.default.fileExists(atPath: log.path) { FileManager.default.createFile(atPath: log.path, contents: nil, attributes: [.posixPermissions: 0o600]) }
            if let file = try? FileHandle(forWritingTo: log) { _ = try? file.seekToEnd(); try? file.write(contentsOf: data); try? file.close() }
            throw CommandFailure(message: String(data: data.suffix(6000), encoding: .utf8) ?? "操作失败，详见日志。")
        }
        return data
    }

    private func bootstrap(forceStart: Bool = false) {
        perform(title: "Runtime：正在启动…") {
            if (!self.background || forceStart), let url = Bundle.main.url(forResource: "desktop-payload", withExtension: "json") {
                let payload = try JSONDecoder().decode(Payload.self, from: Data(contentsOf: url))
                let receipt = self.home.appendingPathComponent("desktop-install.json")
                let previous = (try? Data(contentsOf: receipt)).flatMap { try? JSONDecoder().decode(Payload.self, from: $0) }
                if previous != payload {
                    guard Bundle.main.bundleURL.path == "/Applications/Better Codex.app" else {
                        throw CommandFailure(message: "请先把 Better Codex 拖入“应用程序”文件夹，再打开。")
                    }
                    guard let resources = Bundle.main.resourceURL else { throw CommandFailure(message: "安装资源缺失") }
                    var env = self.context()
                    env["BETTER_CODEX_ARCHIVE"] = resources.appendingPathComponent(payload.archive).path
                    env["BETTER_CODEX_CHECKSUMS"] = resources.appendingPathComponent("checksums.txt").path
                    env["BETTER_CODEX_BUNDLED_NODE"] = resources.appendingPathComponent("node/bin/node").path
                    env["BETTER_CODEX_DESKTOP_APP"] = Bundle.main.bundleURL.path
                    env["BETTER_CODEX_BACKGROUND_SETUP"] = "1"
                    env["PATH"] = resources.appendingPathComponent("node/bin").path + ":/usr/bin:/bin:/usr/sbin:/sbin"
                    _ = try self.run(["/bin/bash", resources.appendingPathComponent("install.sh").path], env: env, timeout: 720)
                    try JSONEncoder().encode(payload).write(to: receipt, options: .atomic)
                }
            }
            if forceStart || !self.background { _ = try self.run(try self.command() + ["desktop", "start"], timeout: 75) }
        }
    }

    private func perform(title: String, task: @escaping () throws -> Void, success: (() -> Void)? = nil) {
        guard !busy else { return }
        busy = true
        runtimeItem.title = title
        item.button?.title = "…"
        for row in actionItems { row.isEnabled = false }
        DispatchQueue.global(qos: .utility).async {
            var failure: Error?
            do { try task() } catch { failure = error }
            DispatchQueue.main.async {
                self.busy = false
                for row in self.actionItems { row.isEnabled = true }
                if let error = failure { self.lastError = error.localizedDescription; self.show(error.localizedDescription) }
                else { success?() }
                self.refresh()
            }
        }
    }

    private func show(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "Better Codex"
        alert.informativeText = message
        alert.addButton(withTitle: "关闭")
        alert.addButton(withTitle: "查看日志")
        NSApp.activate(ignoringOtherApps: true)
        if alert.runModal() == .alertSecondButtonReturn { openLogs() }
    }

    func menuWillOpen(_ menu: NSMenu) { refresh() }
    private func refresh() {
        guard !busy && !refreshing else { return }
        refreshing = true
        DispatchQueue.global(qos: .utility).async {
            var snapshot: Snapshot?
            var failure: String?
            do {
                snapshot = try JSONDecoder().decode(Snapshot.self, from: self.run(try self.command() + ["desktop", "status"], timeout: 12))
                if snapshot?.schemaVersion != 1 { snapshot = nil; throw CommandFailure(message: "Runtime 状态接口版本不兼容") }
            }
            catch { failure = error.localizedDescription }
            DispatchQueue.main.async {
                self.refreshing = false
                guard !self.busy else { return }
                let labels = ["ready": "已就绪", "degraded": "已启动，但暂不可用", "stopped": "未启动", "unavailable": "无法连接"]
                let desktops = ["ready": "已注入", "waiting_window": "等待 Codex 窗口", "disabled": "已停用", "failed": "注入失败", "unknown": "等待连接"]
                self.runtimeItem.title = "Runtime：" + (labels[snapshot?.runtime ?? ""] ?? "状态未知")
                self.desktopItem.title = "看板：" + (desktops[snapshot?.desktop ?? ""] ?? "等待连接")
                self.versionItem.title = "版本：" + (snapshot?.version ?? "—") + (self.profile == "development" ? " · Dev" : "")
                self.item.button?.title = snapshot?.runtime == "ready" ? "" : "!"
                self.item.button?.toolTip = "Better Codex · \(self.runtimeItem.title) · \(self.desktopItem.title)"
                if let error = failure ?? snapshot?.error { self.lastError = error }
            }
        }
    }

    @objc private func refreshAction() { refresh() }
    @objc private func openCodex() { perform(title: "正在打开 Codex…") { _ = try self.run(try self.command() + ["launch"], timeout: 180) } }
    @objc private func openWeb() { perform(title: "正在打开任务面板…") { _ = try self.run(try self.command() + ["web"], timeout: 75) } }
    @objc private func startRuntime() { bootstrap(forceStart: true) }
    @objc private func openLogs() { NSWorkspace.shared.open(home.appendingPathComponent("logs")) }
    @objc private func showLastError() { show(lastError ?? "没有记录到错误。") }
    @objc private func quit() {
        perform(title: "正在退出（保留运行中的任务）…", task: {
            _ = try self.run(try self.command() + ["desktop", "stop"], timeout: 30)
        }, success: { NSApp.terminate(nil) })
    }

    func applicationWillTerminate(_ notification: Notification) {
        timer?.invalidate()
        if lockFD >= 0 { flock(lockFD, LOCK_UN); Darwin.close(lockFD) }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = MenuBarApp()
app.delegate = delegate
app.run()
