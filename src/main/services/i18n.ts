/**
 * i18n helpers for main process
 * @module @main/services/i18n
 */
import { app } from 'electron';
import { SUPPORTED_LANGUAGES } from '@common/constants';

type TranslationKey = string;
type TranslationParams = Record<string, string | number>;
interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

const FALLBACK_LOCALE = 'zh-CN';

const zhCN: TranslationMessages = {
  viewer: {
    title: '薯片查看器',
  },
  dialog: {
    chipsFiles: '薯片文件',
    allFiles: '所有文件',
  },
  errors: {
    fileReadFailed: '读取文件失败',
  },
};

const enUS: TranslationMessages = {
  viewer: {
    title: 'Chips Viewer',
  },
  dialog: {
    chipsFiles: 'Chips Files',
    allFiles: 'All Files',
  },
  errors: {
    fileReadFailed: 'Failed to read file',
  },
};

const messagesCache = new Map<string, TranslationMessages>([
  ['zh-CN', zhCN],
  ['zh-TW', zhCN],
  ['en-US', enUS],
  ['ja-JP', enUS],
  ['ko-KR', enUS],
]);

function resolveLocale(): string {
  const rawLocale = typeof app?.getLocale === 'function' ? app.getLocale() : FALLBACK_LOCALE;
  if (SUPPORTED_LANGUAGES.includes(rawLocale as (typeof SUPPORTED_LANGUAGES)[number])) {
    return rawLocale;
  }

  const base = rawLocale.split('-')[0];
  const matched = SUPPORTED_LANGUAGES.find(locale => locale.startsWith(base));
  return matched ?? FALLBACK_LOCALE;
}

function getNestedValue(obj: TranslationMessages, path: string): string | undefined {
  const keys = path.split('.');
  let current: TranslationMessages | string = obj;

  for (const key of keys) {
    if (typeof current === 'string' || current === undefined) {
      return undefined;
    }
    current = current[key] as TranslationMessages | string;
  }

  return typeof current === 'string' ? current : undefined;
}

function replaceParams(text: string, params: TranslationParams): string {
  let result = text;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

export function translate(key: TranslationKey, params?: TranslationParams): string {
  const locale = resolveLocale();
  const messages = messagesCache.get(locale) ?? messagesCache.get(FALLBACK_LOCALE)!;
  const value = getNestedValue(messages, key);
  if (value === undefined) {
    return key;
  }
  return params ? replaceParams(value, params) : value;
}
