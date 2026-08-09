class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.3.15"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "776aff40e810ed5e1400d4c4187f673f733c42654fd74c6e013974e31d9bea60"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "a2f92e2e99c4d29c49e8be8c57c1f83c2d59f1d8e57b25d809f20d6fa3a4ff6d"
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
