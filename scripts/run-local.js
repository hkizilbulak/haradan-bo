const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const treeKill = require('tree-kill');

const boDir = path.resolve(__dirname, '..');
const envPath = path.join(boDir, '.env.local');

let child;
let childClosed;
let stopping = false;
let shutdownPromise;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function signalChildTree(signal) {
  if (!child || !child.pid) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    treeKill(child.pid, signal, (error) => {
      if (error && error.code !== 'ESRCH' && !/no such process|not found/i.test(error.message)) {
        process.stderr.write(`BO durdurulamadı: ${error.message}\n`);
      }
      resolve();
    });
  });
}

function shutdown(signal) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  stopping = true;
  shutdownPromise = (async () => {
    await signalChildTree(signal);
    const stopped = await Promise.race([
      childClosed.then(() => true),
      delay(5000).then(() => false),
    ]);

    if (!stopped) {
      await signalChildTree('SIGKILL');
      await Promise.race([childClosed, delay(2000)]);
    }
  })();
  return shutdownPromise;
}

async function main() {
  if (!fs.existsSync(envPath) || !fs.statSync(envPath).isFile()) {
    throw new Error(`BO .env.local bulunamadı: ${envPath}`);
  }

  const fileEnvironment = dotenv.parse(fs.readFileSync(envPath));
  const environment = {
    ...fileEnvironment,
    ...process.env,
  };
  if (environment.PORT === undefined) {
    environment.PORT = '8080';
  }
  if (environment.BACKEND_API_URL === undefined) {
    environment.BACKEND_API_URL = 'http://localhost:3001';
  }

  child = spawn('go', ['run', 'main.go'], {
    cwd: boDir,
    env: environment,
    detached: false,
    shell: false,
    stdio: 'inherit',
  });

  childClosed = new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }));
  });

  process.once('SIGINT', () => {
    process.exitCode = 0;
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    process.exitCode = 0;
    void shutdown('SIGTERM');
  });
  process.once('SIGHUP', () => {
    process.exitCode = 0;
    void shutdown('SIGTERM');
  });

  child.once('error', (error) => {
    process.exitCode = 1;
    process.stderr.write(`BO başlatılamadı: ${error.message}\n`);
  });

  const result = await childClosed;
  if (shutdownPromise) {
    await shutdownPromise;
  }
  if (!stopping) {
    process.exitCode = result.code === 0 ? 0 : (result.code || 1);
  }
}

main().catch((error) => {
  process.exitCode = 1;
  process.stderr.write(`${error.message}\n`);
});
