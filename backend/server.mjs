import http from 'node:http';

import { PORT, SUBMISSIONS_FILE } from './config.mjs';
import { handleRequest } from './routes.mjs';
import { sendJson } from './http.mjs';

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    const status = Number(error?.status) || 500;
    sendJson(response, status, {
      code: error?.code ?? 'BACKEND_ERROR',
      message: error?.message ?? 'Backend driver error.',
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('SPM backend driver listening at http://localhost:' + PORT);
  console.log('Persistent submission data: ' + SUBMISSIONS_FILE);
});
