import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

const fastifyExitHandler: FastifyPluginCallback = (app, _, done) => (
  [
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGKILL',
    'SIGTRAP',
    'SIGABRT',
    'SIGBUS',
    'SIGFPE',
    'SIGUSR1',
    'SIGSEGV',
    'SIGUSR2',
    'SIGTERM',
  ].forEach(signal => process.on(signal, signal => handleExit(signal, undefined, 0, app))),
  ['uncaughtException', 'unhandledRejection'].forEach(event =>
    process.on(event, error => handleExit(undefined, error, 0, app)),
  ),
  app.decorate('exit', (code: number, error?: Error) => handleExit(undefined, error, code, app)),
  done()
);

export default fp(fastifyExitHandler);

async function handleExit(
  signal: NodeJS.Signals | undefined,
  err: Error | undefined,
  code: number,
  app: FastifyInstance,
) {
  if (signal) app.log.info({ signal }, 'caught NodeJS exit signal');
  if (err) app.log.info({ err }, 'error caused process to exit');
  app.log.info('shutting down app...');
  try {
    await app.close();
  } catch (error) {
    app.log.error(error, 'failed to shut down app gracefully');
  }
  app.log.info('exiting process. Goodbye!');
  process.exit(code);
}

declare module 'fastify' {
  interface FastifyInstance {
    exit: (code: number, error?: Error) => Promise<never>;
  }
}
