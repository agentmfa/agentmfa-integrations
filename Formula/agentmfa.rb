class Agentmfa < Formula
  desc "Multi-Factor Authentication for AI agents"
  homepage "https://agentmfa.ai"
  version "1.0.0"
  license "MIT"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/agentmfa/agentmfa-integrations/releases/download/v1.0.0/agentmfa-darwin-arm64.tar.gz"
    sha256 "71cf8c2b5e41c54b5004c8b3681b5cc735e90d4443853c73d486c7c47a934c6f"
  elsif OS.mac? && Hardware::CPU.intel?
    url "https://github.com/agentmfa/agentmfa-integrations/releases/download/v1.0.0/agentmfa-darwin-amd64.tar.gz"
    sha256 "343ec550e90b72e022a401969937ad15afbc98bfe783c8a4e49f8c204d1dd7cc"
  elsif OS.linux?
    url "https://github.com/agentmfa/agentmfa-integrations/releases/download/v1.0.0/agentmfa-linux-amd64.tar.gz"
    sha256 "62161ac8e47517ffcd49da648ca82fa4ca2e9b7b6cf943f6da5e2e2e57e98b55"
  end

  def install
    bin.install "agentmfa"
  end

  test do
    assert_match "agentmfa", shell_output("#{bin}/agentmfa --help 2>&1", 0)
  end
end
