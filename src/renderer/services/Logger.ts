/**
 * 日志服务
 * @module @renderer/services/Logger
 */
import type { LogLevel } from '@common/types';

interface LogEntry {
  level: LogLevel;
  message: string;
  module: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  error?: Error;
}

type LogTransport = (entry: LogEntry) => void;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 日志器类
 */
export class Logger {
  private level: LogLevel = 'info';
  private module: string;
  private transports: LogTransport[] = [];

  constructor(module = 'Viewer') {
    this.module = module;

    // 默认控制台输出
    this.addTransport(this.consoleTransport.bind(this));
  }

  /**
   * 调试日志
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * 信息日志
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * 警告日志
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, data, error);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 创建子日志器
   */
  createChild(subModule: string): Logger {
    const child = new Logger(`${this.module}:${subModule}`);
    child.setLevel(this.level);
    child.transports = [...this.transports];
    return child;
  }

  /**
   * 添加日志传输器
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * 移除日志传输器
   */
  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index > -1) {
      this.transports.splice(index, 1);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      module: this.module,
      timestamp: new Date(),
      data,
      error,
    };

    for (const transport of this.transports) {
      try {
        transport(entry);
      } catch (err) {
        console.error('Log transport error:', err);
      }
    }
  }

  private consoleTransport(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.module}]`;
    const args: unknown[] = [prefix, entry.message];

    if (entry.data) {
      args.push(entry.data);
    }

    if (entry.error) {
      args.push(entry.error);
    }

    switch (entry.level) {
      case 'debug':
        console.debug(...args);
        break;
      case 'info':
        console.info(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'error':
        console.error(...args);
        break;
    }
  }
}

// 单例导出
export const logger = new Logger();
