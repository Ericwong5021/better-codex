class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.3.4"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "e59609cd239c0a1abafb0a9c20e8b90b2f531ea524945631d704f9b449a0be64"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "29ed2b0b4a3729946c47623831db32c743d2251f87bf58bb603cfa48f28ccd7a"
  end

  def install
    bin.install "better-codex"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/better-codex version")
  end
end
