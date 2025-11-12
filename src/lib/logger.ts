/**
 * Structured Logger for Raiken
 * Provides contextual logging with proper formatting and error tracking
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp.substring(11, 23); // HH:MM:SS.mmm
    const prefix = `[${timestamp}] [${entry.level}] [${entry.component}]`;
    
    let message = `${prefix} ${entry.message}`;
    
    if (entry.data && Object.keys(entry.data).length > 0) {
      const dataStr = this.formatData(entry.data);
      message += ` ${dataStr}`;
    }
    
    // Add error stack in development
    if (entry.error && this.isDev) {
      message += `\n${entry.error.stack}`;
    } else if (entry.error && !this.isDev) {
      message += ` Error: ${entry.error.message}`;
    }
    
    return message;
  }

  private formatData(data: Record<string, unknown>): string {
    const formatted: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 100) {
        formatted[key] = `${value.substring(0, 100)}...`;
      } else if (typeof value === 'object' && value !== null) {
        formatted[key] = Array.isArray(value) ? `Array(${value.length})` : '[Object]';
      } else {
        formatted[key] = value;
      }
    }
    
    return JSON.stringify(formatted);
  }

  log(entry: Omit<LogEntry, 'timestamp'>): void {
    const fullEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    const formatted = this.formatLog(fullEntry);

    const consoleMethod = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
    }[fullEntry.level];
    
    consoleMethod(formatted);

    if (fullEntry.level === LogLevel.ERROR && this.isProduction) {
      this.reportError(fullEntry);
    }
  }

  debug(component: string, message: string, data?: Record<string, unknown>): void {
    if (this.isDev) {
      this.log({ level: LogLevel.DEBUG, component, message, data });
    }
  }

  info(component: string, message: string, data?: Record<string, unknown>): void {
    this.log({ level: LogLevel.INFO, component, message, data });
  }

  warn(component: string, message: string, data?: Record<string, unknown>): void {
    this.log({ level: LogLevel.WARN, component, message, data });
  }

  error(component: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log({ level: LogLevel.ERROR, component, message, error, data });
  }

  apiRequest(component: string, method: string, path: string, data?: Record<string, unknown>): void {
    this.info(component, `${method} ${path}`, data);
  }

  apiResponse(component: string, method: string, path: string, status: number, data?: Record<string, unknown>): void {
    const level = status >= 400 ? LogLevel.ERROR : status >= 300 ? LogLevel.WARN : LogLevel.INFO;
    this.log({ 
      level, 
      component, 
      message: `${method} ${path} → ${status}`, 
      data: { status, ...data } 
    });
  }

  performance(component: string, operation: string, duration: number, data?: Record<string, unknown>): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
    this.log({ 
      level, 
      component, 
      message: `${operation} completed`, 
      data: { duration: `${duration}ms`, ...data } 
    });
  }

  private reportError(entry: LogEntry): void {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // TODO: Integrate with Sentry or similar service
    }
    if (entry.error) {
      console.error('PRODUCTION_ERROR', {
        component: entry.component,
        message: entry.message,
        error: entry.error.message,
        stack: entry.error.stack,
        data: entry.data,
        timestamp: entry.timestamp
      });
    }
  }
}

export const logger = new Logger();

export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
