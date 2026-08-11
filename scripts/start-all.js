const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const treeKill = require('tree-kill');

const boDir = path.resolve(__dirname, '..');
const developmentMode = process.argv.slice(2).includes('--dev');
const beDir = process.env.HARADAN_BE_DIR
  ? path.resolve(boDir, process.env.HARADAN_BE_DIR)
  : path.resolve(boDir, '..', 'haradan-be');

const services = [];
let stopping = false;
let shutdownPromise;

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

function environmentFromFile(filename, overrides = {}) {
  const parsed = dotenv.parse(fs.readFileSync(filename));
  return {
    ...parsed,
    ...process.env,
    ...overrides,
  };
}

function addAllowedOrigin(value, requiredOrigin) {
  const origins = (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.includes(requiredOrigin)) {
    origins.push(requiredOrigin);
  }
  return origins.join(',');
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

function startService(label, command, args, cwd, env) {
  const child = spawn(command, args, {
    cwd,
    env,
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

function signalService(service, signal) {
  if (service.closed || !service.child.pid) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    treeKill(service.child.pid, signal, (error) => {
      if (error && error.code !== 'ESRCH' && !/no such process|not found/i.test(error.message)) {
        process.stderr.write(`[START] ${service.label} durdurulamadı: ${error.message}\n`);
      }
      resolve();
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function stopService(service, signal) {
  if (service.closed) {
    return;
  }

  await signalService(service, signal);
  const stopped = await Promise.race([
    service.exitPromise.then(() => true),
    delay(5000).then(() => false),
  ]);

  if (!stopped) {
    await signalService(service, 'SIGKILL');
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

  const beEnvironment = environmentFromFile(path.join(beDir, '.env'));
  const apiEnvironment = {
    ...beEnvironment,
    HTTP_ADDR: ':8080',
  };
  const boEnvironment = environmentFromFile(path.join(boDir, '.env.local'), {
    PORT: '3000',
    BACKEND_API_URL: 'http://localhost:8080',
  });
  if (developmentMode) {
    boEnvironment.CORS_ALLOWED_ORIGINS = addAllowedOrigin(
      boEnvironment.CORS_ALLOWED_ORIGINS,
      'http://localhost:3001',
    );
  }

  process.once('SIGINT', () => {
    void shutdown(0, 'Haradan yerel servisleri durduruluyor.', 'SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown(0, 'Haradan yerel servisleri durduruluyor.', 'SIGTERM');
  });
  // npm may close its child with SIGHUP after Ctrl+C. Handling it gives the
  // orchestrator a chance to finish any cleanup still in progress.
  process.once('SIGHUP', () => {
    void shutdown(0, 'Haradan yerel servisleri durduruluyor.', 'SIGTERM');
  });

  startService('API', 'go', ['run', './cmd/api'], beDir, apiEnvironment);
  startService('WORKER', 'go', ['run', './cmd/worker'], beDir, beEnvironment);
  startService('BO', 'go', ['run', 'main.go'], boDir, boEnvironment);
  if (developmentMode) {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const nextEnvironment = environmentFromFile(path.join(boDir, '.env.local'), {
      NEXT_PUBLIC_DEV_PROXY_URL: 'http://localhost:3000',
    });
    startService('NEXT', npmCommand, ['run', 'dev'], boDir, nextEnvironment);
  }

  try {
    const readinessChecks = [
      waitForReady('API', 'http://localhost:8080/api/health'),
      waitForReady('BO', 'http://localhost:3000'),
    ];
    if (developmentMode) {
      readinessChecks.push(waitForReady('Next.js', 'http://localhost:3001/login'));
    }
    await Promise.all(readinessChecks);
  } catch (error) {
    if (!stopping) {
      await shutdown(1, error.message);
    }
  }

  if (!stopping) {
    process.stdout.write(
      '\nHaradan local stack ready\n' +
      'BO:   http://localhost:3000\n' +
      (developmentMode ? 'NEXT: http://localhost:3001\n' : '') +
      'API:  http://localhost:8080\n' +
      (developmentMode ? 'OPEN: http://localhost:3001\n\n' : 'OPEN: http://localhost:3000\n\n'),
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
