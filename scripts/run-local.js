const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const boDir = path.resolve(__dirname, '..');
const envPath = path.join(boDir, '.env.local');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const fileEnv = loadEnv(envPath);
const isWin = process.platform === 'win32';

const child = spawn('go', ['run', 'main.go'], {
  cwd: boDir,
  env: { ...process.env, ...fileEnv },
  shell: isWin,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
