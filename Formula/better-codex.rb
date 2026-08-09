class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.3.16"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "6c994bbb686a1f7c3d855e19f25e2303827304174cad30dfd728d83dd75b00cb"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "21c1aad45c517cb466b198c0b8d95652dc59cef957d821206b7216208cdb2664"
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
