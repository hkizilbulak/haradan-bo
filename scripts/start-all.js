const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const boDir = path.resolve(__dirname, '..');
const beDir = process.env.HARADAN_BE_DIR
  ? path.resolve(boDir, process.env.HARADAN_BE_DIR)
  : path.resolve(boDir, '..', 'haradan-be');

const services = [];
let stopping = false;
let shutdownPromise;

function parseEnvFile(filePath) {
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

function assertDirectory(directory, message) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(message);
  }
}

function assertFile(filename, message) {
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    throw new Error(message);
  }
}

function validateSetup() {
  assertDirectory(beDir, `haradan-be bulunamadı: ${beDir}\nHARADAN_BE_DIR ile konumu belirtebilirsiniz.`);
  assertFile(path.join(beDir, '.env'), `BE .env bulunamadı: ${path.join(beDir, '.env')}`);
  assertFile(path.join(boDir, '.env.local'), `BO .env.local bulunamadı: ${path.join(boDir, '.env.local')}`);
  assertDirectory(
    path.join(boDir, 'out'),
    'BO out/ bulunamadı. Önce `npm run build` çalıştırın.',
  );
}

function prefixOutput(stream, label, destination) {
  let pending = '';

  stream.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop();
    for (const line of lines) {
      destination.write(`[${label}] ${line}\n`);
    }
  });

  stream.on('end', () => {
    if (pending) {
      destination.write(`[${label}] ${pending}\n`);
    }
  });
}

function startService(label, rawCommand, args, cwd, customEnv = {}) {
  const isWin = process.platform === 'win32';
  let command = rawCommand;
  if (isWin && command === 'npm') {
    command = 'npm.cmd';
  }

  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...customEnv },
    detached: false,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const service = {
    label,
    child,
    closed: false,
    exitPromise: null,
  };

  service.exitPromise = new Promise((resolve) => {
    child.once('close', (code, signal) => {
      service.closed = true;
      resolve({ code, signal });
    });
  });

  prefixOutput(child.stdout, label, process.stdout);
  prefixOutput(child.stderr, label, process.stderr);

  child.once('error', (error) => {
    if (!stopping) {
      void shutdown(1, `${label} başlatılamadı: ${error.message}`);
    }
  });

  child.once('exit', (code, signal) => {
    if (!stopping) {
      const detail = signal ? `signal ${signal}` : `kod ${code}`;
      void shutdown(code && code > 0 ? code : 1, `${label} beklenmedik şekilde durdu (${detail}).`);
    }
  });

  services.push(service);
  return service;
}

function processTree(rootPid) {
  if (process.platform === 'win32') {
    return [rootPid];
  }

  try {
    const rows = execFileSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8' });
    const childrenByParent = new Map();

    for (const row of rows.split('\n')) {
      const [pidText, parentPidText] = row.trim().split(/\s+/);
      const pid = Number(pidText);
      const parentPid = Number(parentPidText);
      if (!Number.isInteger(pid) || !Number.isInteger(parentPid)) {
        continue;
      }
      const children = childrenByParent.get(parentPid) || [];
      children.push(pid);
      childrenByParent.set(parentPid, children);
    }

    const result = [];
    function visit(pid) {
      for (const childPid of childrenByParent.get(pid) || []) {
        visit(childPid);
      }
      result.push(pid);
    }
    visit(rootPid);
    return result;
  } catch (_error) {
    return [rootPid];
  }
}

function signalService(service, signal) {
  if (service.closed || !service.child.pid) {
    return;
  }

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/F', '/T', '/PID', String(service.child.pid)], { stdio: 'ignore' });
    } catch (_error) {
      // process already exited
    }
    return;
  }

  for (const pid of processTree(service.child.pid)) {
    try {
      process.kill(pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') {
        process.stderr.write(`[START] ${service.label} durdurulamadı: ${error.message}\n`);
      }
    }
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function stopService(service, signal) {
  if (service.closed) {
    return;
  }

  signalService(service, signal);
  const stopped = await Promise.race([
    service.exitPromise.then(() => true),
    delay(5000).then(() => false),
  ]);

  if (!stopped && process.platform !== 'win32') {
    signalService(service, 'SIGKILL');
    await Promise.race([service.exitPromise, delay(2000)]);
  }
}

function shutdown(exitCode, reason, signal = 'SIGTERM') {
  if (shutdownPromise) {
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
    return shutdownPromise;
  }

  stopping = true;
  process.exitCode = exitCode;
  if (reason) {
    const destination = exitCode === 0 ? process.stdout : process.stderr;
    destination.write(`[START] ${reason}\n`);
  }

  shutdownPromise = Promise.all(services.map((service) => stopService(service, signal))).then(() => undefined);
  return shutdownPromise;
}

function isReady(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });

    request.setTimeout(2000, () => request.destroy());
    request.once('error', () => resolve(false));
  });
}

async function waitForReady(label, url, timeoutMilliseconds = 45000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!stopping && Date.now() < deadline) {
    if (await isReady(url)) {
      return;
    }
    await delay(500);
  }

  if (!stopping) {
    throw new Error(`${label} hazır olmadı: ${url}`);
  }
}

async function main() {
  validateSetup();

  process.once('SIGINT', () => {
    void shutdown(0, 'Haradan yerel servisleri durduruluyor.', 'SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown(0, 'Haradan yerel servisleri durduruluyor.', 'SIGTERM');
  });
  process.once('SIGHUP', () => {
    void shutdown(0, 'Haradan yerel servisleri durduruluyor.', 'SIGTERM');
  });

  const beEnv = parseEnvFile(path.join(beDir, '.env'));
  const boEnv = parseEnvFile(path.join(boDir, '.env.local'));

  const apiEnv = {
    ...beEnv,
    HTTP_ADDR: ':3001',
  };

  const workerEnv = {
    ...beEnv,
    TJK_ENABLED: process.env.TJK_ENABLED || beEnv.TJK_ENABLED || 'true',
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || beEnv.STORAGE_PROVIDER || 'b2',
    IMAGE_PROCESSOR_PROVIDER: process.env.IMAGE_PROCESSOR_PROVIDER || beEnv.IMAGE_PROCESSOR_PROVIDER || 'tinify',
    S3_ENDPOINT: process.env.S3_ENDPOINT || beEnv.S3_ENDPOINT || 'http://localhost:9000',
    S3_REGION: process.env.S3_REGION || beEnv.S3_REGION || 'us-east-1',
    S3_BUCKET: process.env.S3_BUCKET || beEnv.S3_BUCKET || 'test',
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || beEnv.S3_ACCESS_KEY || 'test',
    S3_SECRET_KEY: process.env.S3_SECRET_KEY || beEnv.S3_SECRET_KEY || 'test',
    TINIFY_API_KEY: process.env.TINIFY_API_KEY || beEnv.TINIFY_API_KEY || 'test',
  };

  startService('API', 'go', ['run', './cmd/api'], beDir, apiEnv);
  startService('WORKER', 'go', ['run', './cmd/worker'], beDir, workerEnv);
  startService('BO', 'go', ['run', 'main.go'], boDir, boEnv);

  try {
    await Promise.all([
      waitForReady('API', 'http://localhost:3001/api/health'),
      waitForReady('BO', 'http://localhost:8080'),
    ]);
  } catch (error) {
    if (!stopping) {
      await shutdown(1, error.message);
    }
  }

  if (!stopping) {
    process.stdout.write(
      '\nHaradan local stack ready\n' +
      'BO:  http://localhost:8080\n' +
      'API: http://localhost:3001\n\n',
    );
  }

  await Promise.all(services.map((service) => service.exitPromise));
  if (shutdownPromise) {
    await shutdownPromise;
  }
}

main().catch(async (error) => {
  await shutdown(1, error.message);
});
