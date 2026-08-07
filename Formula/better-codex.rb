class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.3.11"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "c40993c0f752059998c14f80efec0c3d50da87446292917c290ecbe881dd0e8a"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "63193e4381de1c2004194ce6f8faba8e0f279eff58d670da9167eb98c37d23e5"
  end

  def install
    bin.install "better-codex"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/better-codex version")
  end
end
