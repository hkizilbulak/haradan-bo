import http from 'node:http';

const runId = process.env.E2E_RUN_ID || 'local';
const horseNumber = `E2E-${runId}`;
const horseName = `E2E TAY ${runId}`;

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (url.pathname === '/TR/YarisSever/Query/DataRows/Atlar') {
    if (url.searchParams.get('PageNumber') === '0') {
      response.end(`<!doctype html><html><body>
        <a href="/TR/YarisSever/Query/Page/Atlar?QueryParameter_AtId=${horseNumber}">${horseName}</a>
        İngiliz
        <a href="/TR/YarisSever/Query/Page/Atlar?QueryParameter_BabaAdi=E2E-BABA">E2E BABA</a>
        <a href="/TR/YarisSever/Query/Page/Atlar?QueryParameter_AnneAdi=E2E-ANNE">E2E ANNE</a>
      </body></html>`);
      return;
    }
    response.end('<html><body><div>Toplam 0</div></body></html>');
    return;
  }

  response.end('<html><body></body></html>');
});

server.listen(18081, '127.0.0.1');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
