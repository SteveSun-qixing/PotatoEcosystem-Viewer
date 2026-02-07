/**
 * useTranslation - 国际化组合式函数
 * @module @renderer/composables/useTranslation
 *
 * 提供多语言翻译功能
 */
import { computed, type Ref, type ComputedRef } from 'vue';
import { translate, setLocale as setLocaleRaw, supportedLocales, localeState } from '@renderer/services/i18n';

/**
 * 翻译键值类型
 */
type TranslationKey = string;

/**
 * 翻译参数类型
 */
type TranslationParams = Record<string, string | number>;

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

// 全局语言状态
const sharedLocale = localeState;

/**
 * useTranslation - 获取翻译函数
 */
export function useTranslation(): UseTranslationReturn {
  const t = (key: TranslationKey, params?: TranslationParams): string => {
    void sharedLocale.value;
    return translate(key, params);
  };

  const setLocale = (locale: string): void => {
    setLocaleRaw(locale);
  };

  const isRTL = computed(() => {
    return false;
  });

  return {
    locale: sharedLocale,
    supportedLocales,
    t,
    setLocale,
    isRTL,
  };
}
