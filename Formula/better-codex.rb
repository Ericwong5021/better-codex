class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "0.3.10"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "b1a1aff2f34caf5b9388f706180a2bb8733ca265c3a27270e43065cbec3619d2"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "9e490d500740a0551a0a0d8fe22896c4ee38559556897412c733c9e44670b3d7"
  end

  def install
    bin.install "better-codex"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/better-codex version")
  end
end
