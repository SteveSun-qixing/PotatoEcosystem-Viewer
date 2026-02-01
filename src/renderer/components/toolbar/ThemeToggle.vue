<script setup lang="ts">
/**
 * ThemeToggle - 主题切换组件
 * @module @renderer/components/toolbar/ThemeToggle
 *
 * 功能：
 * - 切换亮色/暗色/系统主题
 * - 显示当前主题图标
 * - 下拉菜单选择
 */
import { computed, ref } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useTranslation } from '@renderer/composables/useTranslation';
import type { ThemeType } from '@common/types';

// Store 和 Composables
const viewerStore = useViewerStore();
const { t } = useTranslation();

// 下拉菜单显示状态
const showDropdown = ref(false);

// 计算属性
const currentTheme = computed(() => viewerStore.currentTheme as ThemeType);

// 主题选项
const themeOptions = computed(() => [
  {
    value: 'light' as ThemeType,
    label: t('theme.light'),
    icon: 'sun',
  },
  {
    value: 'dark' as ThemeType,
    label: t('theme.dark'),
    icon: 'moon',
  },
  {
    value: 'system' as ThemeType,
    label: t('theme.system'),
    icon: 'monitor',
  },
]);

// 当前主题选项
const currentThemeOption = computed(() => themeOptions.value.find(opt => opt.value === currentTheme.value));

/**
 * 切换主题
 */
const handleThemeChange = (theme: ThemeType): void => {
  viewerStore.setTheme(theme);
  showDropdown.value = false;
};

/**
 * 切换下拉菜单
 */
const toggleDropdown = (): void => {
  showDropdown.value = !showDropdown.value;
};

/**
 * 关闭下拉菜单
 */
const closeDropdown = (): void => {
  showDropdown.value = false;
};
</script>

<template>
  <div class="theme-toggle" @mouseleave="closeDropdown">
    <!-- 触发按钮 -->
    <button class="theme-toggle__button" type="button" :title="t('theme.toggle')" @click="toggleDropdown">
      <!-- 太阳图标（亮色主题） -->
      <svg
        v-if="currentThemeOption?.icon === 'sun'"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      <!-- 月亮图标（暗色主题） -->
      <svg
        v-else-if="currentThemeOption?.icon === 'moon'"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>

      <!-- 显示器图标（系统主题） -->
      <svg
        v-else
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    </button>

    <!-- 下拉菜单 -->
    <div v-if="showDropdown" class="theme-toggle__dropdown">
      <button
        v-for="option in themeOptions"
        :key="option.value"
        class="theme-toggle__option"
        :class="{ 'theme-toggle__option--active': currentTheme === option.value }"
        type="button"
        @click="handleThemeChange(option.value)"
      >
        <!-- 图标 -->
        <span class="theme-toggle__icon">
          <svg v-if="option.icon === 'sun'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg v-else-if="option.icon === 'moon'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </span>
        <span class="theme-toggle__label">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/**
 * 主题切换样式
 */
.theme-toggle {
  position: relative;
}

/* 触发按钮 */
.theme-toggle__button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--viewer-text-color, #333333);
  background-color: transparent;
  border: 1px solid var(--viewer-border-color, #e0e0e0);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle__button:hover {
  background-color: var(--viewer-button-hover, #e8e8e8);
}

/* 下拉菜单 */
.theme-toggle__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  padding: 4px;
  background-color: var(--viewer-dropdown-bg, #ffffff);
  border: 1px solid var(--viewer-border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 120px;
}

/* 选项 */
.theme-toggle__option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--viewer-text-color, #333333);
  background-color: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.theme-toggle__option:hover {
  background-color: var(--viewer-item-hover, rgba(0, 0, 0, 0.05));
}

.theme-toggle__option--active {
  color: var(--viewer-primary-color, #1890ff);
  background-color: var(--viewer-primary-bg, rgba(24, 144, 255, 0.1));
}

.theme-toggle__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle__label {
  flex: 1;
  text-align: left;
}

/* 暗色主题 */
:global(.theme-dark) .theme-toggle {
  --viewer-text-color: #e0e0e0;
  --viewer-border-color: #3a3a3a;
  --viewer-button-hover: #3a3a3a;
  --viewer-dropdown-bg: #2a2a2a;
  --viewer-item-hover: rgba(255, 255, 255, 0.05);
  --viewer-primary-color: #409eff;
  --viewer-primary-bg: rgba(64, 158, 255, 0.2);
}

/* 亮色主题 */
:global(.theme-light) .theme-toggle {
  --viewer-text-color: #333333;
  --viewer-border-color: #e0e0e0;
  --viewer-button-hover: #e8e8e8;
  --viewer-dropdown-bg: #ffffff;
  --viewer-item-hover: rgba(0, 0, 0, 0.05);
  --viewer-primary-color: #1890ff;
  --viewer-primary-bg: rgba(24, 144, 255, 0.1);
}
</style>
