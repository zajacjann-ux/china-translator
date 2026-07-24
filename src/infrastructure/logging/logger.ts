type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_PREFIX = '[Rabbitalk]';

function log(level: LogLevel, message: string, data?: unknown): void {
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`${LOG_PREFIX} ${message}`, data ?? '');
}

export const logger = {
  debug: (message: string, data?: unknown) => log('debug', message, data),
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
};
