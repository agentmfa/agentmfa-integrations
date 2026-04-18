#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

const VERSION = require('./package.json').version;

const PLATFORM_MAP = {
  'darwin-arm64':  'agentmfa-mcp-darwin-arm64',
  'darwin-x64':    'agentmfa-mcp-darwin-amd64',
  'linux-arm64':   'agentmfa-mcp-linux-arm64',
  'linux-x64':     'agentmfa-mcp-linux-amd64',
  'win32-x64':     'agentmfa-mcp-windows-amd64.exe',
};

function getBinaryName() {
  const key = `${process.platform}-${process.arch}`;
  return PLATFORM_MAP[key] || null;
}

function download(url, dest, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest, redirects + 1)
          .then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} downloading binary`));
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = dest + '.tmp';
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          fs.renameSync(tmp, dest);
          resolve();
        });
      });
      out.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const binaryName = getBinaryName();
  if (!binaryName) {
    process.stderr.write(
      `agentmfa-mcp: unsupported platform: ${process.platform}-${process.arch}\n`
    );
    process.exit(1);
  }

  const binaryPath = path.join(__dirname, 'bin', binaryName);

  if (!fs.existsSync(binaryPath)) {
    const url = `https://github.com/agentmfa/agentmfa-integrations/releases/download/${VERSION}/${binaryName}`;
    process.stderr.write(`agentmfa-mcp: downloading binary for ${process.platform}-${process.arch}...\n`);
    try {
      await download(url, binaryPath);
      fs.chmodSync(binaryPath, 0o755);
    } catch (err) {
      process.stderr.write(`agentmfa-mcp: download failed: ${err.message}\n`);
      process.exit(1);
    }
  }

  const child = spawn(binaryPath, process.argv.slice(2), {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}

main().catch(err => {
  process.stderr.write(`agentmfa-mcp: ${err.message}\n`);
  process.exit(1);
});
