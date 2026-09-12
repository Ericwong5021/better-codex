import datetime
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import uuid


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def read(path):
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return None


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + "." + str(os.getpid()) + ".tmp")
    with temporary.open("w") as stream:
        json.dump(value, stream, separators=(",", ":"))
        stream.flush()
        os.fsync(stream.fileno())
    os.chmod(temporary, 0o660)
    os.replace(temporary, path)
    descriptor = os.open(path.parent, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def publish(directory, operation, **patch):
    previous = operation.get("updatedAt")
    stage = operation.get("stage")
    if previous and patch.get("stage", stage) != stage:
        elapsed = (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(previous.replace("Z", "+00:00"))).total_seconds()
        operation.setdefault("stageDurations", {})[stage] = round(elapsed, 3)
    operation.update(patch, updatedAt=now())
    write(directory / "operations" / (operation["id"] + ".json"), operation)
    write(directory / "state.json", operation)
    print("BETTER_CODEX_DIAGNOSTIC " + json.dumps({"scope": "vps_update", "update_id": operation["id"], "stage": operation.get("stage"), "target": operation["targetVersion"], "current": operation.get("currentVersion"), "recovery": operation.get("recovery"), "error": operation.get("error"), "at": operation["updatedAt"]}), file=sys.stderr, flush=True)


def main():
    directory = Path(os.environ.get("BETTER_CODEX_UPDATER_DIRECTORY", "/var/lib/better-codex-updater"))
    directory.mkdir(parents=True, exist_ok=True)
    if sys.argv[1] == "progress":
        operation = read(directory / "state.json")
        if not operation or operation["id"] != os.environ.get("BETTER_CODEX_UPDATER_OPERATION_ID"):
            raise RuntimeError("update_operation_identity_mismatch")
        patch = {"stage": sys.argv[2], "progress": int(sys.argv[3])}
        if len(sys.argv) > 4:
            patch["recovery"] = sys.argv[4]
        if len(sys.argv) > 5:
            patch["currentVersion"] = sys.argv[5]
        publish(directory, operation, **patch)
        return
    with (directory / "executor.lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        request = directory / "request"
        running = directory / "request.running"
        interrupted = running.exists()
        if not interrupted:
            if not request.exists():
                return
            os.replace(request, running)
        try:
            operation = read(running)
        except json.JSONDecodeError:
            target = running.read_text().strip()
            operation = {"schemaVersion": 2, "id": str(uuid.uuid4()), "targetVersion": target, "sourceVersion": "", "createdAt": now(), "status": "installing", "stage": "queued", "error": None}
            write(running, operation)
        if not re.fullmatch(r"[a-fA-F0-9-]{36}", operation.get("id", "")) or not re.fullmatch(r"v\d+\.\d+\.\d+(?:-beta\.\d+)?", operation.get("targetVersion", "")):
            raise RuntimeError("update_request_invalid")
        latest = read(directory / "operations" / (operation["id"] + ".json"))
        if latest:
            operation = latest
        if operation.get("status") in ("current", "error") and operation.get("recovery") != "pending":
            running.unlink()
            return
        attempts = operation.get("attempts", 0)
        if attempts >= 2:
            publish(directory, operation, status="error", stage="recovery_failed", recovery="failed", error="update_recovery_interrupted")
            running.unlink()
            return
        source = os.environ.get("BETTER_CODEX_SELFHOST_DIR") or Path("/etc/better-codex/updater-directory").read_text().strip()
        publish(directory, operation, status="installing", stage="recovering" if interrupted else "preparing", attempts=attempts + 1, error=None)
        environment = {**os.environ, "BETTER_CODEX_SELFHOST_DIR": source, "BETTER_CODEX_UPDATER_STATE_FILE": str(directory / "state.json"), "BETTER_CODEX_UPDATER_TARGET_VERSION": operation["targetVersion"], "BETTER_CODEX_UPDATER_OPERATION_ID": operation["id"], "BETTER_CODEX_UPDATER_RECOVER": "1" if interrupted else "0"}
        pinned_source = operation.get("manifest", {}).get("payload", {}).get("source", {}).get("commit", "")
        if pinned_source and not re.fullmatch(r"[a-fA-F0-9]{40}", pinned_source):
            raise RuntimeError("update_source_invalid")
        environment["BETTER_CODEX_UPDATER_SOURCE_COMMIT"] = pinned_source
        command = os.environ.get("BETTER_CODEX_SELFHOST_EXECUTABLE", "/usr/local/libexec/better-codex-selfhost")
        child = subprocess.Popen(["bash", command, "upgrade", "vps", operation["targetVersion"]], env=environment, start_new_session=True, pass_fds=(lock.fileno(),))

        def stop(signum, frame):
            os.killpg(child.pid, signal.SIGTERM)
            child.wait(timeout=15)
            latest = read(directory / "operations" / (operation["id"] + ".json")) or operation
            publish(directory, latest, status="installing", stage="interrupted", recovery="pending", error="update_executor_interrupted")
            raise SystemExit(75)

        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        result = child.wait()
        operation = read(directory / "operations" / (operation["id"] + ".json")) or operation
        if result == 0 and operation.get("stage") == "verified":
            publish(directory, operation, status="current", stage="complete", progress=100, currentVersion=operation["targetVersion"][1:], recovery=None, error=None)
        else:
            publish(directory, operation, status="error", stage="error", error="update_install_failed", exitCode=result, failureStage=operation.get("stage"), recovery="failed" if operation.get("recovery") == "pending" else operation.get("recovery"))
        running.unlink()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        directory = Path(os.environ.get("BETTER_CODEX_UPDATER_DIRECTORY", "/var/lib/better-codex-updater"))
        running = directory / "request.running"
        try:
            queued = read(running)
        except (ValueError, OSError):
            queued = None
        operation = (read(directory / "operations" / (queued["id"] + ".json")) or queued) if isinstance(queued, dict) and re.fullmatch(r"[a-fA-F0-9-]{36}", queued.get("id", "")) and queued.get("targetVersion") else None
        if operation:
            publish(directory, operation, status="error", stage="recovery_failed", recovery="failed", error=str(error))
        if running.exists():
            os.replace(running, directory / ("rejected-" + str(uuid.uuid4()) + ".json"))
        raise
