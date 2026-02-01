# API完整索引

本文档提供 Chips Viewer 所有公开 API 的完整索引和详细说明。

## 目录

1. [核心 API](#1-核心-api)
2. [渲染 API](#2-渲染-api)
3. [插件 API](#3-插件-api)
4. [主题 API](#4-主题-api)
5. [工具 API](#5-工具-api)
6. [事件 API](#6-事件-api)
7. [配置 API](#7-配置-api)
8. [文件系统 API](#8-文件系统-api)

---

## 1. 核心 API

### 1.1 ViewerApp

查看器应用主类。

#### 构造函数

```typescript
constructor(options?: ViewerAppOptions)
```

**参数**:
- `options` (可选): 应用配置选项

**示例**:
```typescript
const app = new ViewerApp({
  platform: 'desktop',
  dataDir: '/user/data',
  pluginDir: '/user/plugins'
});
```

#### 方法

##### openCard()

```typescript
async openCard(path: string, container?: HTMLElement): Promise<void>
```

打开并显示卡片文件。

**参数**:
- `path`: 卡片文件路径
- `container` (可选): 容器元素，默认使用主容器

**返回**: Promise<void>

**抛出**:
- `FileNotFoundError`: 文件不存在
- `ParseError`: 文件解析失败

**示例**:
```typescript
await app.openCard('/path/to/card.card');
```

##### closeCard()

```typescript
closeCard(): void
```

关闭当前打开的卡片。

**返回**: void

**示例**:
```typescript
app.closeCard();
```

##### getCurrentCard()

```typescript
getCurrentCard(): Card | null
```

获取当前打开的卡片。

**返回**: Card | null

**示例**:
```typescript
const card = app.getCurrentCard();
if (card) {
  console.log(card.id);
}
```

##### navigate()

```typescript
navigate(target: NavigationTarget): void
```

导航到指定位置。

**参数**:
- `target`: 导航目标
  - `type`: 'card' | 'box' | 'url'
  - `path`: 目标路径
  - `cardId` (可选): 卡片 ID

**示例**:
```typescript
app.navigate({
  type: 'card',
  path: '/path/to/card.card'
});
```

##### back()

```typescript
back(): void
```

后退到上一个卡片。

**返回**: void

##### forward()

```typescript
forward(): void
```

前进到下一个卡片。

**返回**: void

##### getHistory()

```typescript
getHistory(): NavigationHistory
```

获取导航历史。

**返回**: NavigationHistory

---

## 2. 渲染 API

### 2.1 RenderAPI

渲染相关的 API。

#### renderCard()

```typescript
async renderCard(
  card: Card,
  container: HTMLElement,
  options?: RenderOptions
): Promise<RenderResult>
```

渲染卡片到容器。

**参数**:
- `card`: 卡片对象
- `container`: 容器元素
- `options` (可选): 渲染选项
  - `theme`: 主题 ID 或主题对象
  - `layout`: 布局类型
  - `readonly`: 是否只读
  - `interactive`: 是否启用交互

**返回**: Promise<RenderResult>

**示例**:
```typescript
const result = await renderAPI.renderCard(card, container, {
  theme: 'dark',
  readonly: true
});
```

#### renderBox()

```typescript
async renderBox(
  box: Box,
  container: HTMLElement,
  options?: BoxRenderOptions
): Promise<BoxRenderResult>
```

渲染箱子到容器。

**参数**:
- `box`: 箱子对象
- `container`: 容器元素
- `options` (可选): 渲染选项
  - `layout`: 'grid' | 'waterfall' | 'list' | 'kanban'
  - `columns`: 列数
  - `gap`: 间距
  - `sortBy`: 排序方式
  - `filter`: 过滤条件

**返回**: Promise<BoxRenderResult>

**示例**:
```typescript
const result = await renderAPI.renderBox(box, container, {
  layout: 'waterfall',
  columns: 3,
  gap: 16
});
```

#### updateCard()

```typescript
updateCard(cardId: string, updates: Partial<Card>): void
```

更新已渲染的卡片。

**参数**:
- `cardId`: 卡片 ID
- `updates`: 更新内容

**示例**:
```typescript
renderAPI.updateCard('card-123', {
  content: { text: 'Updated content' }
});
```

#### disposeCard()

```typescript
disposeCard(cardId: string): void
```

释放卡片渲染资源。

**参数**:
- `cardId`: 卡片 ID

---

### 2.2 ThemeApplier

主题应用器。

#### apply()

```typescript
apply(theme: Theme, target: HTMLElement): void
```

应用主题到元素。

**参数**:
- `theme`: 主题对象
- `target`: 目标元素

**示例**:
```typescript
const applier = new ThemeApplier();
applier.apply(darkTheme, container);
```

#### remove()

```typescript
remove(target: HTMLElement): void
```

移除元素的主题。

**参数**:
- `target`: 目标元素

---

### 2.3 LayoutEngine

布局引擎。

#### calculate()

```typescript
calculate(items: LayoutItem[], constraints: LayoutConstraints): Layout
```

计算布局。

**参数**:
- `items`: 布局项数组
- `constraints`: 布局约束
  - `containerWidth`: 容器宽度
  - `containerHeight`: 容器高度
  - `columns`: 列数
  - `gap`: 间距
  - `padding`: 内边距

**返回**: Layout

**示例**:
```typescript
const layout = layoutEngine.calculate(items, {
  containerWidth: 1200,
  columns: 3,
  gap: 16,
  padding: 16
});
```

#### apply()

```typescript
apply(layout: Layout, container: HTMLElement): void
```

应用布局到容器。

**参数**:
- `layout`: 布局对象
- `container`: 容器元素

---

## 3. 插件 API

### 3.1 PluginManager

插件管理器。

#### install()

```typescript
async install(pluginPath: string): Promise<void>
```

安装插件。

**参数**:
- `pluginPath`: 插件路径

**返回**: Promise<void>

**抛出**:
- `InvalidPluginError`: 插件无效
- `DependencyError`: 依赖缺失

**示例**:
```typescript
await pluginManager.install('/plugins/video-player');
```

#### uninstall()

```typescript
async uninstall(pluginId: string): Promise<void>
```

卸载插件。

**参数**:
- `pluginId`: 插件 ID

**示例**:
```typescript
await pluginManager.uninstall('com.chips.video-player');
```

#### update()

```typescript
async update(pluginId: string): Promise<void>
```

更新插件。

**参数**:
- `pluginId`: 插件 ID

#### getPlugin()

```typescript
getPlugin(pluginId: string): IViewerToolPlugin | null
```

获取插件实例。

**参数**:
- `pluginId`: 插件 ID

**返回**: IViewerToolPlugin | null

#### listPlugins()

```typescript
listPlugins(): PluginManifest[]
```

列出所有已安装的插件。

**返回**: PluginManifest[]

#### getPluginsForType()

```typescript
getPluginsForType(mimeType: string): IViewerToolPlugin[]
```

获取支持指定 MIME 类型的所有插件。

**参数**:
- `mimeType`: MIME 类型

**返回**: IViewerToolPlugin[]

**示例**:
```typescript
const videoPlugins = pluginManager.getPluginsForType('video/mp4');
```

#### setDefaultPlugin()

```typescript
setDefaultPlugin(mimeType: string, pluginId: string): void
```

设置默认插件。

**参数**:
- `mimeType`: MIME 类型
- `pluginId`: 插件 ID

**示例**:
```typescript
pluginManager.setDefaultPlugin('video/mp4', 'com.advanced.video-player');
```

#### getDefaultPlugin()

```typescript
getDefaultPlugin(mimeType: string): IViewerToolPlugin | null
```

获取默认插件。

**参数**:
- `mimeType`: MIME 类型

**返回**: IViewerToolPlugin | null

---

### 3.2 PluginDispatcher

插件调度器。

#### dispatch()

```typescript
async dispatch(
  file: FileInfo,
  container: HTMLElement,
  options?: DispatchOptions
): Promise<RenderResult>
```

调度插件渲染文件。

**参数**:
- `file`: 文件信息
- `container`: 容器元素
- `options` (可选):
  - `preferredPluginId`: 首选插件 ID
  - `fallback`: 是否回退到通用查看器

**返回**: Promise<RenderResult>

**示例**:
```typescript
const result = await dispatcher.dispatch(file, container, {
  preferredPluginId: 'com.advanced.video-player'
});
```

---

### 3.3 IViewerToolPlugin

插件接口（供插件开发者实现）。

#### init()

```typescript
async init(context: PluginContext): Promise<void>
```

初始化插件。

**参数**:
- `context`: 插件上下文
  - `viewer`: 查看器 API
  - `settings`: 插件设置
  - `storage`: 插件存储
  - `logger`: 日志记录器

#### destroy()

```typescript
async destroy(): Promise<void>
```

销毁插件。

#### canHandle()

```typescript
canHandle(file: FileInfo): boolean
```

检查是否能处理指定文件。

**参数**:
- `file`: 文件信息

**返回**: boolean

#### render()

```typescript
async render(
  file: FileInfo,
  container: HTMLElement,
  options?: RenderOptions
): Promise<RenderResult>
```

渲染文件内容。

**参数**:
- `file`: 文件信息
- `container`: 容器元素
- `options` (可选): 渲染选项

**返回**: Promise<RenderResult>

#### dispose()

```typescript
dispose(): void
```

释放插件资源。

---

## 4. 主题 API

### 4.1 ThemeManager

主题管理器。

#### loadTheme()

```typescript
loadTheme(themeId: string): Theme
```

加载主题。

**参数**:
- `themeId`: 主题 ID

**返回**: Theme

**抛出**:
- `ThemeNotFoundError`: 主题不存在

**示例**:
```typescript
const theme = themeManager.loadTheme('dark');
```

#### getCurrentTheme()

```typescript
getCurrentTheme(): Theme
```

获取当前主题。

**返回**: Theme

#### setTheme()

```typescript
setTheme(themeId: string): void
```

切换主题。

**参数**:
- `themeId`: 主题 ID

**示例**:
```typescript
themeManager.setTheme('dark');
```

#### listThemes()

```typescript
listThemes(): ThemeInfo[]
```

列出所有可用主题。

**返回**: ThemeInfo[]

**示例**:
```typescript
const themes = themeManager.listThemes();
themes.forEach(theme => {
  console.log(theme.name, theme.id);
});
```

#### importTheme()

```typescript
async importTheme(themePath: string): Promise<void>
```

导入自定义主题。

**参数**:
- `themePath`: 主题文件路径

**示例**:
```typescript
await themeManager.importTheme('/path/to/custom-theme.json');
```

#### exportTheme()

```typescript
async exportTheme(themeId: string, outputPath: string): Promise<void>
```

导出主题。

**参数**:
- `themeId`: 主题 ID
- `outputPath`: 输出路径

---

## 5. 工具 API

### 5.1 FileParser

文件解析器。

#### parseCard()

```typescript
parse(data: ArrayBuffer): Card
```

解析卡片数据。

**参数**:
- `data`: 卡片文件数据

**返回**: Card

**抛出**:
- `ParseError`: 解析失败

#### validate()

```typescript
validate(card: Card): ValidationResult
```

验证卡片数据。

**参数**:
- `card`: 卡片对象

**返回**: ValidationResult
  - `valid`: boolean
  - `errors`: ValidationError[]

#### getMetadata()

```typescript
getMetadata(data: ArrayBuffer): CardMetadata
```

提取卡片元数据。

**参数**:
- `data`: 卡片文件数据

**返回**: CardMetadata

---

### 5.2 ResourceManager

资源管理器。

#### loadResource()

```typescript
async loadResource(uri: string): Promise<Resource>
```

加载资源。

**参数**:
- `uri`: 资源 URI

**返回**: Promise<Resource>

**示例**:
```typescript
const image = await resourceManager.loadResource('file:///path/to/image.jpg');
```

#### cacheResource()

```typescript
cacheResource(uri: string, data: ArrayBuffer): void
```

缓存资源。

**参数**:
- `uri`: 资源 URI
- `data`: 资源数据

#### clearCache()

```typescript
clearCache(): void
```

清除缓存。

#### getCacheStatistics()

```typescript
getCacheStatistics(): CacheStats
```

获取缓存统计。

**返回**: CacheStats
  - `size`: 缓存大小（字节）
  - `count`: 缓存项数量
  - `hitRate`: 命中率

---

## 6. 事件 API

### 6.1 EventBus

事件总线。

#### on()

```typescript
on(event: string, handler: EventHandler): void
```

订阅事件。

**参数**:
- `event`: 事件名称
- `handler`: 事件处理函数

**示例**:
```typescript
eventBus.on('card-opened', (card: Card) => {
  console.log('Card opened:', card.id);
});
```

#### off()

```typescript
off(event: string, handler: EventHandler): void
```

取消订阅事件。

**参数**:
- `event`: 事件名称
- `handler`: 事件处理函数

#### emit()

```typescript
emit(event: string, data?: any): void
```

触发事件。

**参数**:
- `event`: 事件名称
- `data` (可选): 事件数据

#### once()

```typescript
once(event: string, handler: EventHandler): void
```

订阅一次性事件。

**参数**:
- `event`: 事件名称
- `handler`: 事件处理函数

---

### 6.2 标准事件

#### 应用事件

- `app:ready` - 应用初始化完成
- `app:error` - 应用错误

#### 卡片事件

- `card:opened` - 卡片已打开
- `card:closed` - 卡片已关闭
- `card:rendered` - 卡片已渲染
- `card:updated` - 卡片已更新

#### 主题事件

- `theme:changed` - 主题已切换
- `theme:loaded` - 主题已加载

#### 插件事件

- `plugin:installed` - 插件已安装
- `plugin:uninstalled` - 插件已卸载
- `plugin:updated` - 插件已更新
- `plugin:loaded` - 插件已加载
- `plugin:error` - 插件错误

#### 导航事件

- `navigation:changed` - 导航状态变化
- `navigation:back` - 后退
- `navigation:forward` - 前进

---

## 7. 配置 API

### 7.1 ConfigManager

配置管理器。

#### get()

```typescript
get<T>(key: string, defaultValue?: T): T
```

获取配置项。

**参数**:
- `key`: 配置键
- `defaultValue` (可选): 默认值

**返回**: T

**示例**:
```typescript
const theme = configManager.get('appearance.theme', 'light');
```

#### set()

```typescript
set(key: string, value: any): void
```

设置配置项。

**参数**:
- `key`: 配置键
- `value`: 配置值

**示例**:
```typescript
configManager.set('appearance.theme', 'dark');
```

#### has()

```typescript
has(key: string): boolean
```

检查配置项是否存在。

**参数**:
- `key`: 配置键

**返回**: boolean

#### delete()

```typescript
delete(key: string): void
```

删除配置项。

**参数**:
- `key`: 配置键

#### reset()

```typescript
reset(): void
```

重置所有配置到默认值。

#### save()

```typescript
async save(): Promise<void>
```

保存配置到磁盘。

#### load()

```typescript
async load(): Promise<void>
```

从磁盘加载配置。

---

## 8. 文件系统 API

### 8.1 FileSystemAPI

文件系统 API（平台适配）。

#### readFile()

```typescript
async readFile(path: string): Promise<ArrayBuffer>
```

读取文件。

**参数**:
- `path`: 文件路径

**返回**: Promise<ArrayBuffer>

**抛出**:
- `FileNotFoundError`: 文件不存在

#### writeFile()

```typescript
async writeFile(path: string, data: ArrayBuffer): Promise<void>
```

写入文件。

**参数**:
- `path`: 文件路径
- `data`: 文件数据

#### listDirectory()

```typescript
async listDirectory(path: string): Promise<FileInfo[]>
```

列出目录内容。

**参数**:
- `path`: 目录路径

**返回**: Promise<FileInfo[]>

#### exists()

```typescript
async exists(path: string): Promise<boolean>
```

检查文件是否存在。

**参数**:
- `path`: 文件路径

**返回**: Promise<boolean>

#### getFileInfo()

```typescript
async getFileInfo(path: string): Promise<FileInfo>
```

获取文件信息。

**参数**:
- `path`: 文件路径

**返回**: Promise<FileInfo>

#### watchFile()

```typescript
watchFile(path: string, callback: (event: FileWatchEvent) => void): FileWatcher
```

监听文件变化。

**参数**:
- `path`: 文件路径
- `callback`: 回调函数

**返回**: FileWatcher

**示例**:
```typescript
const watcher = fileSystem.watchFile('/path/to/card.card', (event) => {
  if (event.type === 'change') {
    console.log('File changed');
  }
});

// 取消监听
watcher.close();
```

---

## 9. 类型定义

### 9.1 Card

```typescript
interface Card {
  id: string;
  type: CardType;
  version: string;
  metadata: CardMetadata;
  content: any;
  children?: Card[];
}

type CardType = 
  | 'richtext'
  | 'markdown'
  | 'image'
  | 'video'
  | 'audio'
  | 'code'
  | 'list'
  | 'rating'
  | 'web'
  | 'composite';
```

### 9.2 Theme

```typescript
interface Theme {
  id: string;
  name: string;
  version: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  cardStyles: Record<string, CardThemeStyle>;
  codeTheme: string;
}
```

### 9.3 RenderOptions

```typescript
interface RenderOptions {
  theme?: string | Theme;
  layout?: Layout;
  readonly?: boolean;
  interactive?: boolean;
  animations?: boolean;
}
```

### 9.4 RenderResult

```typescript
interface RenderResult {
  element: HTMLElement;
  dispose: () => void;
  update?: (updates: Partial<Card>) => void;
  controls?: ViewerControls;
}
```

### 9.5 PluginManifest

```typescript
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: Author;
  license?: string;
  homepage?: string;
  type: 'viewer-tool';
  supportedTypes: string[];
  main: string;
  icon?: string;
  preview?: string;
  capabilities?: Record<string, boolean>;
  dependencies?: Record<string, string>;
  permissions?: string[];
  settings?: PluginSetting[];
  minViewerVersion?: string;
  platforms?: string[];
}
```

---

## 10. 错误类型

### 10.1 ChipsError

```typescript
class ChipsError extends Error {
  code: string;
  constructor(message: string, code: string);
}
```

### 10.2 具体错误类型

- `FileNotFoundError` - 文件不存在
- `ParseError` - 解析错误
- `ValidationError` - 验证错误
- `InvalidPluginError` - 插件无效
- `DependencyError` - 依赖错误
- `ThemeNotFoundError` - 主题不存在
- `PermissionDeniedError` - 权限被拒绝
- `NetworkError` - 网络错误

---

## 11. 常量

### 11.1 支持的卡片类型

```typescript
const SUPPORTED_CARD_TYPES = [
  'richtext',
  'markdown',
  'image',
  'video',
  'audio',
  'code',
  'list',
  'rating',
  'web',
  'composite'
];
```

### 11.2 支持的文件类型

```typescript
const SUPPORTED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  // ...
};
```

### 11.3 默认配置

```typescript
const DEFAULT_CONFIG = {
  appearance: {
    theme: 'light',
    fontSize: 16,
    language: 'zh-CN'
  },
  performance: {
    cacheSize: 100,
    lazyLoad: true,
    virtualScroll: true
  },
  plugins: {
    autoUpdate: true,
    allowUnsigned: false
  }
};
```

---

## 12. 使用示例

### 12.1 基本使用

```typescript
// 创建应用实例
const app = new ViewerApp();

// 打开卡片
await app.openCard('/path/to/card.card');

// 切换主题
app.themeManager.setTheme('dark');

// 监听事件
app.on('card:opened', (card) => {
  console.log('Opened:', card.id);
});
```

### 12.2 插件使用

```typescript
// 安装插件
await app.pluginManager.install('/plugins/video-player');

// 设置默认插件
app.pluginManager.setDefaultPlugin('video/mp4', 'com.chips.video-player');

// 使用插件渲染文件
const file = {
  path: '/path/to/video.mp4',
  mimeType: 'video/mp4'
};
const container = document.getElementById('viewer');
await app.pluginDispatcher.dispatch(file, container);
```

### 12.3 自定义渲染

```typescript
// 加载卡片
const card = await app.fileParser.parse(fileData);

// 自定义渲染选项
const result = await app.renderAPI.renderCard(card, container, {
  theme: customTheme,
  readonly: true,
  interactive: false
});

// 更新卡片
result.update({ content: newContent });

// 清理
result.dispose();
```

---

## 附录

### A. API 版本

当前 API 版本: **v1.0.0**

### B. 废弃的 API

无

### C. 未来计划

- 插件热重载 API
- 协作编辑 API
- 云同步 API

### D. 参考链接

- [完整文档](https://chips.dev/docs)
- [插件开发指南](https://chips.dev/docs/plugin-dev)
- [主题定制指南](https://chips.dev/docs/theme-customization)
- [GitHub Repository](https://github.com/chips-project/viewer)
