/**
 * 服务层导出索引
 * @module @renderer/services
 */

export { EventBus, eventBus } from './EventBus';
export { Logger, logger } from './Logger';
export { SDKService, sdkService } from './SDKService';
export { loadWorkspaceBaseCardPlugins } from './BaseCardPluginLoader';
export { translate, getLocale, setLocale, supportedLocales } from './i18n';
export type { SDKServiceOptions } from '@common/interfaces';
