/**
 * useTranslation - 国际化组合式函数
 * @module @renderer/composables/useTranslation
 *
 * 提供多语言翻译功能
 */
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { SUPPORTED_LANGUAGES } from '@common/constants';

/**
 * 翻译键值类型
 */
type TranslationKey = string;

/**
 * 翻译参数类型
 */
type TranslationParams = Record<string, string | number>;

/**
 * 语言包类型
 */
interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

/**
 * 翻译返回类型
 */
export interface UseTranslationReturn {
  /** 当前语言 */
  locale: Ref<string>;
  /** 支持的语言列表 */
  supportedLocales: readonly string[];
  /** 翻译函数 */
  t: (key: TranslationKey, params?: TranslationParams) => string;
  /** 设置语言 */
  setLocale: (locale: string) => void;
  /** 是否是 RTL 语言 */
  isRTL: ComputedRef<boolean>;
}

// 当前语言
const currentLocale = ref<string>('zh-CN');

// 语言包缓存
const messagesCache = new Map<string, TranslationMessages>();

/**
 * 中文翻译
 */
const zhCN: TranslationMessages = {
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
    empty: {
      title: '欢迎使用薯片查看器',
      description: '拖放 .card 或 .box 文件到此处，或点击打开按钮',
      openButton: '打开文件',
    },
    loading: {
      title: '加载中',
      description: '请稍候...',
    },
    error: {
      title: '加载失败',
      retry: '重试',
      close: '关闭',
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
  },
  bookmarks: {
    title: '书签',
    empty: '暂无书签',
    add: '添加书签',
    remove: '移除书签',
  },
  outline: {
    title: '大纲',
    empty: '无大纲',
  },
};

/**
 * 英文翻译
 */
const enUS: TranslationMessages = {
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
    empty: {
      title: 'Welcome to Chips Viewer',
      description: 'Drop .card or .box file here, or click Open button',
      openButton: 'Open File',
    },
    loading: {
      title: 'Loading',
      description: 'Please wait...',
    },
    error: {
      title: 'Load Failed',
      retry: 'Retry',
      close: 'Close',
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
  },
  bookmarks: {
    title: 'Bookmarks',
    empty: 'No bookmarks',
    add: 'Add Bookmark',
    remove: 'Remove Bookmark',
  },
  outline: {
    title: 'Outline',
    empty: 'No outline',
  },
};

// 初始化语言包缓存
messagesCache.set('zh-CN', zhCN);
messagesCache.set('zh-TW', zhCN); // 暂时使用简体中文
messagesCache.set('en-US', enUS);
messagesCache.set('ja-JP', enUS); // 暂时使用英文
messagesCache.set('ko-KR', enUS); // 暂时使用英文

/**
 * 获取嵌套对象的值
 */
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

/**
 * 替换参数
 */
function replaceParams(text: string, params: TranslationParams): string {
  let result = text;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

/**
 * useTranslation - 获取翻译函数
 *
 * @example
 * ```vue
 * <script setup>
 * const { t, locale, setLocale } = useTranslation();
 * </script>
 *
 * <template>
 *   <span>{{ t('viewer.title') }}</span>
 *   <button @click="setLocale('en-US')">English</button>
 * </template>
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  // 翻译函数
  const t = (key: TranslationKey, params?: TranslationParams): string => {
    const messages = messagesCache.get(currentLocale.value) ?? messagesCache.get('zh-CN')!;
    const value = getNestedValue(messages, key);

    if (value === undefined) {
      // 开发环境下警告
      if (import.meta.env.DEV) {
        console.warn(`[Translation] Missing key: ${key} for locale: ${currentLocale.value}`);
      }
      return key;
    }

    return params ? replaceParams(value, params) : value;
  };

  // 设置语言
  const setLocale = (locale: string): void => {
    if (SUPPORTED_LANGUAGES.includes(locale as (typeof SUPPORTED_LANGUAGES)[number])) {
      currentLocale.value = locale;
      // 保存到 localStorage
      localStorage.setItem('viewer:locale', locale);
      // 设置 HTML lang 属性
      document.documentElement.lang = locale;
    } else {
      console.warn(`[Translation] Unsupported locale: ${locale}`);
    }
  };

  // 是否是 RTL 语言
  const isRTL = computed(() => {
    // 目前支持的语言都是 LTR
    return false;
  });

  // 初始化时从 localStorage 读取语言设置
  const savedLocale = localStorage.getItem('viewer:locale');
  if (savedLocale && SUPPORTED_LANGUAGES.includes(savedLocale as (typeof SUPPORTED_LANGUAGES)[number])) {
    currentLocale.value = savedLocale;
  }

  return {
    locale: currentLocale,
    supportedLocales: SUPPORTED_LANGUAGES,
    t,
    setLocale,
    isRTL,
  };
}
