class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.4.3"
  depends_on "node"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "8285b508c398b7db83a923911aa4b9dada0274ea99a4e7588a291e293bbd9a53"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "98b40b75e280d8eed778b0c6164eee74e43ed9ff1110cdcc5fc81062d949c064"
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
