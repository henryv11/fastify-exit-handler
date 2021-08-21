import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

const PLUGIN_NAME = 'fastify-exit-handler';

const EXIT_SIGNALS = [
  'SIGHUP',
  'SIGINT',
  'SIGQUIT',
  'SIGTRAP',
  'SIGABRT',
  'SIGBUS',
  'SIGFPE',
  'SIGUSR1',
  'SIGSEGV',
  'SIGUSR2',
  'SIGTERM',
] as const;

export default fp(
  async app => {
    const log = app.log.child({ plugin: PLUGIN_NAME });
    EXIT_SIGNALS.forEach(signal => process.once(signal, signal => handleExit(signal, undefined, 0, app, log)));
    process.once('uncaughtException', error => handleExit(undefined, error, 0, app, log));
    process.once('unhandledRejection', (error, promise) =>
      handleExit(undefined, new UnhandledRejectionError(error, promise), 0, app, log),
    );
    app.decorate('exit', (code: number, error?: Error) => handleExit(undefined, error, code, app, log));
  },
  { name: PLUGIN_NAME },
);

async function handleExit(
  signal: NodeJS.Signals | undefined,
  err: Error | undefined,
  code: number,
  app: FastifyInstance,
  log: FastifyInstance['log'],
) {
  if (signal) log.info({ signal }, 'caught NodeJS exit signal');
  if (err) log.info({ err }, 'error caused process to exit');
  log.info('shutting down app...');
  try {
    await app.close();
  } catch (error) {
    log.error(error, 'failed to shut down app gracefully');
  }
  log.info('exiting process. Goodbye!');
  process.exit(code);
}

class UnhandledRejectionError extends Error {
  constructor(public error: Record<string, unknown> | null | undefined, public promise: Promise<unknown>) {
    super('Unhandled promise rejection');
    Error.captureStackTrace(this);
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    exit: (code: number, error?: Error) => Promise<never>;
  }
}
