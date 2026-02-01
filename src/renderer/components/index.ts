/**
 * 组件导出
 * @module @renderer/components
 *
 * 导出所有 UI 组件供应用使用
 */

// 布局组件
export { default as MainLayout } from './layout/MainLayout.vue';
export { default as ViewerContent } from './layout/ViewerContent.vue';

// 头部组件
export { default as ViewerHeader } from './header/ViewerHeader.vue';
export { default as NavigationButtons } from './header/NavigationButtons.vue';
export { default as WindowControls } from './header/WindowControls.vue';

// 侧边栏组件
export { default as ViewerSidebar } from './sidebar/ViewerSidebar.vue';
export { default as FileInfoPanel } from './sidebar/FileInfoPanel.vue';
export { default as OutlinePanel } from './sidebar/OutlinePanel.vue';
export { default as RecentFilesPanel } from './sidebar/RecentFilesPanel.vue';
export { default as BookmarksPanel } from './sidebar/BookmarksPanel.vue';

// 工具栏组件
export { default as ZoomControls } from './toolbar/ZoomControls.vue';
export { default as ThemeToggle } from './toolbar/ThemeToggle.vue';

// 底部组件
export { default as ViewerFooter } from './footer/ViewerFooter.vue';

// 内容状态组件
export { default as ContentEmpty } from './content/ContentEmpty.vue';
export { default as ContentLoading } from './content/ContentLoading.vue';
export { default as ContentError } from './content/ContentError.vue';
