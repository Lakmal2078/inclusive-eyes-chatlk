import { serve } from '@hono/node-server';
import app from './src/index.js';
import { createNodeEnv, setupWebSocketServer } from './src/lib/node-env.js';

const PORT = 3000;
const HOST = '0.0.0.0';

const env = createNodeEnv();

const server = serve(
  {
    fetch: (req) => app.fetch(req, env),
    port: PORT,
    hostname: HOST
  },
  (info) => {
    console.log(`[ChatLK] Server running on http://${info.address}:${info.port}`);
  }
);

setupWebSocketServer(server, env);

export default server;
