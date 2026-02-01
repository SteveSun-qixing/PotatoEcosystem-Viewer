/**
 * 基础类型定义
 * @module @common/types/base
 */

// 10位62进制 ID 类型
export type ChipsId = string & { readonly __brand: 'ChipsId' };
export type CardId = ChipsId & { readonly __cardBrand: 'CardId' };
export type BoxId = ChipsId & { readonly __boxBrand: 'BoxId' };

// 时间戳类型（ISO 8601）
export type Timestamp = string;

// 协议版本
export type ProtocolVersion = `${number}.${number}.${number}`;

// 状态类型
export type Status = 'success' | 'error' | 'partial';

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 文件类型
export type FileType = 'card' | 'box' | 'resource' | 'unknown';

// 位置类型
export type LocationType = 'internal' | 'external';

// 渲染模式
export type RenderMode = 'full' | 'preview' | 'thumbnail';

// 平台类型
export type Platform = 'electron' | 'web' | 'mobile';

// 主题类型
export type ThemeType = 'light' | 'dark' | 'system';

// 优先级
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * ID 生成工具函数
 */
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateId(): ChipsId {
  let result = '';
  const array = new Uint8Array(10);
  crypto.getRandomValues(array);
  for (let i = 0; i < 10; i++) {
    result += BASE62_CHARS[array[i] % 62];
  }
  return result as ChipsId;
}

export function isValidId(id: string): id is ChipsId {
  if (id.length !== 10) return false;
  for (const char of id) {
    if (!BASE62_CHARS.includes(char)) return false;
  }
  return true;
}
