/**
 * Logger Utility - أداة التسجيل الموحدة
 * يعمل فقط في بيئة التطوير (development)
 */

const isDev = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
    prefix?: string;
    showTimestamp?: boolean;
}

class Logger {
    private prefix: string;
    private showTimestamp: boolean;

    constructor(options: LoggerOptions = {}) {
        this.prefix = options.prefix || '🔧';
        this.showTimestamp = options.showTimestamp ?? false;
    }

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = this.showTimestamp ? `[${new Date().toISOString()}] ` : '';
        return `${timestamp}${this.prefix} ${message}`;
    }

    private shouldLog(): boolean {
        return isDev || isDebugEnabled;
    }

    log(message: string, ...args: any[]): void {
        if (this.shouldLog()) {
            console.log(this.formatMessage('log', message), ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog()) {
            console.info(this.formatMessage('info', message), ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        // Warnings always show
        console.warn(this.formatMessage('warn', message), ...args);
    }

    error(message: string, ...args: any[]): void {
        // Errors always show
        console.error(this.formatMessage('error', message), ...args);
    }

    debug(message: string, ...args: any[]): void {
        if (isDebugEnabled) {
            console.debug(this.formatMessage('debug', message), ...args);
        }
    }

    // Grouped logging
    group(label: string): void {
        if (this.shouldLog()) {
            console.group(this.formatMessage('log', label));
        }
    }

    groupEnd(): void {
        if (this.shouldLog()) {
            console.groupEnd();
        }
    }

    // Performance tracking
    time(label: string): void {
        if (this.shouldLog()) {
            console.time(label);
        }
    }

    timeEnd(label: string): void {
        if (this.shouldLog()) {
            console.timeEnd(label);
        }
    }

    // Table logging
    table(data: any): void {
        if (this.shouldLog()) {
            console.table(data);
        }
    }
}

// Pre-configured loggers for different modules
export const logger = new Logger({ prefix: '🔧' });
export const authLogger = new Logger({ prefix: '🔐 Auth' });
export const dbLogger = new Logger({ prefix: '🗄️ DB' });
export const uiLogger = new Logger({ prefix: '🎨 UI' });
export const apiLogger = new Logger({ prefix: '🌐 API' });

// Create custom logger
export function createLogger(prefix: string, options?: Omit<LoggerOptions, 'prefix'>): Logger {
    return new Logger({ ...options, prefix });
}

export default logger;
