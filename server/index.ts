import fastify from 'fastify';
import path from 'path';
import sirv from 'sirv';
import { renderPage } from 'vite-plugin-ssr';
import { createServer as createViteServer } from 'vite';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { createContext } from './context';
import { appRouter } from './router';
import fastifyStatic from '@fastify/static';

const isProduction = process.env.NODE_ENV === 'production';
const root = path.resolve();

async function startServer () {
  const app = fastify({
    maxParamLength: 5000,
    logger: {
      transport:
        !isProduction
          ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname'
            }
          }
          : undefined
    },
  });

  try {
    if (isProduction) {
      const staticAssetsPath = `${root}/dist/client`;
      const assets = sirv(staticAssetsPath, {
        immutable: true,
        dev: !isProduction
      });

      // await app.register(fastifyStatic, { root: staticAssetsPath})
      app.addHook('onRequest', (req, reply, done) => {assets(req.raw, reply.raw, done);});
    } else {
      const viteDevMiddleware = await createViteServer({
        root,
        server: {
          middlewareMode: true,
        },
      });

      app.addHook('onRequest', (req, reply, done) => {
        viteDevMiddleware.middlewares(req.raw, reply.raw, done);
      });
    }

    await app.register(fastifyTRPCPlugin, {
      prefix: '/trpc',
      trpcOptions: { router: appRouter, createContext },
    });

    app.get('*', async (req, reply) => {
      const pageContextInit = { url: req.url };
      const pageContext = await renderPage(pageContextInit);
      const { httpResponse } = pageContext;

      if (!httpResponse) return;

      const { body, statusCode, contentType } = httpResponse;

      reply.status(statusCode).type(contentType).send(body);
    });

    const port = (process.env.PORT || 3000) as number;

    await app.listen({ port });

    console.log(`Server running at http://localhost:${port}`);
  } catch (error) {
    app.log.fatal(error);
  }
}

startServer();
