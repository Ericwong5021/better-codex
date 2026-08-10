class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.4.0"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "d06334a750ef843d9b5c0f63522073bf4d9f990e1da91d398488c9ce22a9cffe"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "655a602e775ce142d0322fc8532ba88e27b836291809e876a099cd7737b8776b"
  end

  def install
    bin.install "better-codex"
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
