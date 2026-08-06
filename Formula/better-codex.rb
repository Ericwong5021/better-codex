class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.3.5"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "5bbdfe3b6845d8a87b976bfaf909a3e6878335631902b3cc67c2d9e223882757"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "cb7e98495440d5fcb452a5642abf01dafe357b8b5ffb3ab2ee2d11dde8652f7a"
  end

  def install
    bin.install "better-codex"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/better-codex version")
  end
end
