const { spawn } = require('child_process');
const path = require('path');

const beDir = path.resolve(__dirname, '../../haradan-be');
const boDir = path.resolve(__dirname, '../');

console.log('\x1b[36m%s\x1b[0m', '🚀 Haradan Backend (3001) ve BO Proxy (8080) başlatılıyor...\n');

const be = spawn('go', ['run', './cmd/api'], { cwd: beDir, stdio: 'inherit', shell: true });
const bo = spawn('go', ['run', 'main.go'], { cwd: boDir, stdio: 'inherit', shell: true });

function cleanup() {
    console.log('\x1b[31m%s\x1b[0m', '\n🛑 Sunucular kapatılıyor...');
    if (be && !be.killed) be.kill();
    if (bo && !bo.killed) bo.kill();
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
