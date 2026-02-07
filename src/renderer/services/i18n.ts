/**
 * i18n 服务
 * @module @renderer/services/i18n
 */
import { ref } from 'vue';
import { SUPPORTED_LANGUAGES } from '@common/constants';
import { logger } from './Logger';

type TranslationKey = string;
export type TranslationParams = Record<string, string | number>;

interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

const log = logger.createChild('I18n');

const zhCN: TranslationMessages = {
  app: {
    initializing: '正在初始化...',
    initFailed: '初始化失败',
    reload: '重新加载',
    notReady: '应用尚未准备就绪',
  },
  dialog: {
    chipsFiles: '薯片文件',
    allFiles: '所有文件',
  },
  errors: {
    fileReadFailed: '读取文件失败',
  },
  viewer: {
    title: '薯片查看器',
    untitled: '未命名',
    open: '打开',
    menu: '菜单',
  },
  navigation: {
    back: '后退',
    forward: '前进',
  },
  sidebar: {
    info: '信息',
    outline: '大纲',
    recent: '最近',
    bookmarks: '书签',
    noFile: '未打开文件',
    noOutline: '无大纲内容',
  },
  fileInfo: {
    name: '名称',
    type: '类型',
    card: '卡片',
    box: '箱子',
    createdAt: '创建时间',
    modifiedAt: '修改时间',
    tags: '标签',
    description: '描述',
  },
  zoom: {
    in: '放大',
    out: '缩小',
    reset: '重置缩放',
  },
  theme: {
    toggle: '切换主题',
    light: '浅色',
    dark: '深色',
    system: '跟随系统',
  },
  status: {
    ready: '就绪',
    loading: '加载中...',
    viewing: '查看中',
  },
  content: {
    placeholder: {
      card: '卡片文件: {name}',
      box: '箱子文件: {name}',
    },
    empty: {
      title: '欢迎使用薯片查看器',
      description: '拖放 .card 或 .box 文件到此处，或点击打开按钮',
      openButton: '打开文件',
      noContent: '暂无内容',
    },
    loading: {
      title: '加载中',
      description: '请稍候...',
      card: '正在加载卡片...',
      box: '正在加载箱子...',
    },
    error: {
      title: '加载失败',
      retry: '重试',
      close: '关闭',
      noContainer: '未找到可用的渲染容器',
      openCardFailed: '打开卡片失败',
      openBoxFailed: '打开箱子失败',
    },
    drop: {
      hint: '释放以打开文件',
    },
  },
  window: {
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原',
    close: '关闭',
  },
  recent: {
    title: '最近打开',
    empty: '暂无记录',
    clear: '清除记录',
    time: {
      today: '今天',
      yesterday: '昨天',
      daysAgo: '{days} 天前',
    },
  },
  bookmarks: {
    title: '书签',
    empty: '暂无书签',
    add: '添加书签',
    added: '已添加书签',
    remove: '移除书签',
  },
  outline: {
    title: '大纲',
    empty: '无大纲',
  },
  box: {
    layout: '布局',
    cardCount: '卡片数量',
    cardFallback: '卡片 {index}',
    empty: {
      title: '箱子是空的',
      subtitle: '暂无卡片',
    },
  },
};

const enUS: TranslationMessages = {
  app: {
    initializing: 'Initializing...',
    initFailed: 'Initialization failed',
    reload: 'Reload',
    notReady: 'Application is not ready',
  },
  dialog: {
    chipsFiles: 'Chips Files',
    allFiles: 'All Files',
  },
  errors: {
    fileReadFailed: 'Failed to read file',
  },
  viewer: {
    title: 'Chips Viewer',
    untitled: 'Untitled',
    open: 'Open',
    menu: 'Menu',
  },
  navigation: {
    back: 'Back',
    forward: 'Forward',
  },
  sidebar: {
    info: 'Info',
    outline: 'Outline',
    recent: 'Recent',
    bookmarks: 'Bookmarks',
    noFile: 'No file opened',
    noOutline: 'No outline available',
  },
  fileInfo: {
    name: 'Name',
    type: 'Type',
    card: 'Card',
    box: 'Box',
    createdAt: 'Created',
    modifiedAt: 'Modified',
    tags: 'Tags',
    description: 'Description',
  },
  zoom: {
    in: 'Zoom In',
    out: 'Zoom Out',
    reset: 'Reset Zoom',
  },
  theme: {
    toggle: 'Toggle Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },
  status: {
    ready: 'Ready',
    loading: 'Loading...',
    viewing: 'Viewing',
  },
  content: {
    placeholder: {
      card: 'Card file: {name}',
      box: 'Box file: {name}',
    },
    empty: {
      title: 'Welcome to Chips Viewer',
      description: 'Drop .card or .box file here, or click Open button',
      openButton: 'Open File',
      noContent: 'No content',
    },
    loading: {
      title: 'Loading',
      description: 'Please wait...',
      card: 'Loading card...',
      box: 'Loading box...',
    },
    error: {
      title: 'Load Failed',
      retry: 'Retry',
      close: 'Close',
      noContainer: 'No render container available',
      openCardFailed: 'Failed to open card',
      openBoxFailed: 'Failed to open box',
    },
    drop: {
      hint: 'Release to open file',
    },
  },
  window: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
  },
  recent: {
    title: 'Recent Files',
    empty: 'No recent files',
    clear: 'Clear History',
    time: {
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: '{days} days ago',
    },
  },
  bookmarks: {
    title: 'Bookmarks',
    empty: 'No bookmarks',
    add: 'Add Bookmark',
    added: 'Bookmark Added',
    remove: 'Remove Bookmark',
  },
  outline: {
    title: 'Outline',
    empty: 'No outline',
  },
  box: {
    layout: 'Layout',
    cardCount: 'Cards',
    cardFallback: 'Card {index}',
    empty: {
      title: 'Box is empty',
      subtitle: 'No cards',
    },
  },
};

const messagesCache = new Map<string, TranslationMessages>();
messagesCache.set('zh-CN', zhCN);
messagesCache.set('zh-TW', zhCN);
messagesCache.set('en-US', enUS);
messagesCache.set('ja-JP', enUS);
messagesCache.set('ko-KR', enUS);

const FALLBACK_LOCALE = 'zh-CN';
const getStorage = (): Storage | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  if (typeof localStorage.getItem !== 'function' || typeof localStorage.setItem !== 'function') {
    return null;
  }
  return localStorage;
};

const storage = getStorage();
const storedLocale = storage ? storage.getItem('viewer:locale') : null;
const initialLocale =
  storedLocale && SUPPORTED_LANGUAGES.includes(storedLocale as (typeof SUPPORTED_LANGUAGES)[number])
    ? storedLocale
    : FALLBACK_LOCALE;

const localeState = ref(initialLocale);

if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = localeState.value;
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
  const locale = localeState.value;
  const messages = messagesCache.get(locale) ?? messagesCache.get(FALLBACK_LOCALE)!;
  const value = getNestedValue(messages, key);

  if (value === undefined) {
    if (import.meta.env.DEV) {
      log.warn('Missing translation key', { key, locale });
    }
    return key;
  }

  return params ? replaceParams(value, params) : value;
}

export function getLocale(): string {
  return localeState.value;
}

export function setLocale(locale: string): void {
  if (!SUPPORTED_LANGUAGES.includes(locale as (typeof SUPPORTED_LANGUAGES)[number])) {
    log.warn('Unsupported locale', { locale });
    return;
  }

  localeState.value = locale;
  const activeStorage = getStorage();
  if (activeStorage) {
    activeStorage.setItem('viewer:locale', locale);
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = locale;
  }
}

export const supportedLocales = SUPPORTED_LANGUAGES;
export { localeState };
