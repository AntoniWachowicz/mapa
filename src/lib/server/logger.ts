/**
 * Structured Logger
 * JSON logging for production log aggregation.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const isDev = process.env.NODE_ENV !== 'production';

function formatLog(entry: LogEntry): string {
  if (isDev) {
    // Human-readable format for development
    const prefix = `[${entry.timestamp}] ${entry.level.toUpperCase()}`;
    const ctx = entry.context ? ` [${entry.context}]` : '';
    let msg = `${prefix}${ctx}: ${entry.message}`;
    if (entry.data) {
      msg += ` ${JSON.stringify(entry.data)}`;
    }
    if (entry.error) {
      msg += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        msg += `\n  ${entry.error.stack}`;
      }
    }
    return msg;
  }
  // JSON format for production
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>, error?: Error): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    data
  };

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: isDev ? error.stack : undefined
    };
  }

  const output = formatLog(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Create a logger with a specific context
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, context, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, context, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, context, data),
    error: (message: string, error?: Error, data?: Record<string, unknown>) => log('error', message, context, data, error)
  };
}

// Default logger for quick use
export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => log('debug', message, undefined, data),
  info: (message: string, data?: Record<string, unknown>) => log('info', message, undefined, data),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, undefined, data),
  error: (message: string, error?: Error, data?: Record<string, unknown>) => log('error', message, undefined, data, error)
};
