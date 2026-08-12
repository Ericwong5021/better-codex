class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.4.4"
  depends_on "node"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "104bfc3176216746e2e493a367bb5a8051d0ea5f3e6934d055919cc66ef17226"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "1a3b3b185a03ba5336ace27225abe48af8c940a430fb05bb54cad54ea9d40d44"
  end

  def install
    bin.install "better-codex", "better-codex.cjs"
    libexec.install "skills"
    libexec.install "update-public-key.pem"
  end

  def caveats
    <<~EOS
      Run `better-codex setup` to install the Codex skills and launcher.
    EOS
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/better-codex version")
  end
end
