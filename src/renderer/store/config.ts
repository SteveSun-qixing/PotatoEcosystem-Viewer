/**
 * 配置状态管理
 * @module @renderer/store/config
 */
import { defineStore } from 'pinia';
import type { ViewerConfig, ThemeType, Platform, RenderMode } from '@common/types';
import { DEFAULT_CONFIG, CACHE_KEYS } from '@common/constants';
import { logger, setLocale } from '@renderer/services';

const log = logger.createChild('ConfigStore');

/**
 * 配置 Store 状态接口
 */
export interface ConfigStoreState {
  // 基础配置
  platform: Platform;
  language: string;
  theme: ThemeType;

  // 插件配置
  plugins: {
    autoLoad: boolean;
    enableBuiltin: boolean;
    customPaths: string[];
  };

  // 渲染配置
  rendering: {
    defaultMode: RenderMode;
    lazyLoad: boolean;
    cacheSize: number;
    preloadCount: number;
  };

  // 导航配置
  navigation: {
    enableHistory: boolean;
    maxHistory: number;
    enableShortcuts: boolean;
  };

  // 窗口配置
  window: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
    maximizable: boolean;
    fullscreenable: boolean;
  };
}

/**
 * 配置 Store
 */
export const useConfigStore = defineStore('config', {
  state: (): ConfigStoreState => ({
    platform: DEFAULT_CONFIG.platform ?? 'electron',
    language: DEFAULT_CONFIG.language ?? 'zh-CN',
    theme: DEFAULT_CONFIG.theme ?? 'system',

    plugins: {
      autoLoad: DEFAULT_CONFIG.plugins?.autoLoad ?? true,
      enableBuiltin: DEFAULT_CONFIG.plugins?.enableBuiltin ?? true,
      customPaths: DEFAULT_CONFIG.plugins?.customPaths ?? [],
    },

    rendering: {
      defaultMode: DEFAULT_CONFIG.rendering?.defaultMode ?? 'full',
      lazyLoad: DEFAULT_CONFIG.rendering?.lazyLoad ?? true,
      cacheSize: DEFAULT_CONFIG.rendering?.cacheSize ?? 50,
      preloadCount: DEFAULT_CONFIG.rendering?.preloadCount ?? 3,
    },

    navigation: {
      enableHistory: DEFAULT_CONFIG.navigation?.enableHistory ?? true,
      maxHistory: DEFAULT_CONFIG.navigation?.maxHistory ?? 100,
      enableShortcuts: DEFAULT_CONFIG.navigation?.enableShortcuts ?? true,
    },

    window: {
      width: DEFAULT_CONFIG.window?.width ?? 1200,
      height: DEFAULT_CONFIG.window?.height ?? 800,
      minWidth: DEFAULT_CONFIG.window?.minWidth ?? 800,
      minHeight: DEFAULT_CONFIG.window?.minHeight ?? 600,
      maximizable: DEFAULT_CONFIG.window?.maximizable ?? true,
      fullscreenable: DEFAULT_CONFIG.window?.fullscreenable ?? true,
    },
  }),

  getters: {
    /**
     * 获取完整配置
     */
    fullConfig: (state): ViewerConfig => state as ViewerConfig,

    /**
     * 是否为深色主题
     */
    isDarkTheme: (state): boolean => {
      if (state.theme === 'dark') return true;
      if (state.theme === 'light') return false;
      // system: 根据系统偏好
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
  },

  actions: {
    /**
     * 加载配置
     */
    async loadConfig(): Promise<void> {
      try {
        const stored = localStorage.getItem(CACHE_KEYS.USER_CONFIG);
        if (stored) {
          const config = JSON.parse(stored);
          this.$patch(config);
        }
        setLocale(this.language);
      } catch (error) {
        log.error('Failed to load config', error as Error);
      }
    },

    /**
     * 保存配置
     */
    async saveConfig(): Promise<void> {
      try {
        const config = this.$state;
        localStorage.setItem(CACHE_KEYS.USER_CONFIG, JSON.stringify(config));
      } catch (error) {
        log.error('Failed to save config', error as Error);
      }
    },

    /**
     * 更新单个配置项
     */
    updateConfig<K extends keyof ConfigStoreState>(key: K, value: ConfigStoreState[K]): void {
      (this as Record<string, unknown>)[key] = value;
      this.saveConfig();
    },

    /**
     * 设置主题
     */
    setTheme(theme: ThemeType): void {
      this.theme = theme;
      this.saveConfig();
    },

    /**
     * 设置语言
     */
    setLanguage(language: string): void {
      this.language = language;
      setLocale(language);
      this.saveConfig();
    },

    /**
     * 更新渲染配置
     */
    updateRenderingConfig(config: Partial<ConfigStoreState['rendering']>): void {
      this.rendering = { ...this.rendering, ...config };
      this.saveConfig();
    },

    /**
     * 更新导航配置
     */
    updateNavigationConfig(config: Partial<ConfigStoreState['navigation']>): void {
      this.navigation = { ...this.navigation, ...config };
      this.saveConfig();
    },

    /**
     * 更新插件配置
     */
    updatePluginsConfig(config: Partial<ConfigStoreState['plugins']>): void {
      this.plugins = { ...this.plugins, ...config };
      this.saveConfig();
    },

    /**
     * 重置配置
     */
    resetConfig(): void {
      this.$reset();
      setLocale(this.language);
      this.saveConfig();
    },
  },
});
