/**
 * 卡片相关类型定义
 * @module @common/types/card
 */
import type { CardId, ChipsId, Timestamp, ProtocolVersion, RenderMode } from './base';

// 标签类型
export type Tag = string | [string, ...string[]];

// 卡片元数据
export interface CardMetadata {
  chip_standards_version: ProtocolVersion;
  card_id: CardId;
  name: string;
  created_at: Timestamp;
  modified_at: Timestamp;
  theme?: string;
  tags?: Tag[];
  description?: string;
  author?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  downloadable?: boolean;
  remixable?: boolean;
  license?: string;
  [key: string]: unknown;
}

// 基础卡片信息
export interface BaseCardInfo {
  id: ChipsId;
  type: string;
}

// 卡片资源信息
export interface CardResource {
  path: string;
  size: number;
  type: string;
  checksum?: string;
  duration?: number;
  width?: number;
  height?: number;
}

// 卡片清单
export interface CardManifest {
  card_count: number;
  resource_count: number;
  resources: CardResource[];
}

// 卡片结构
export interface CardStructure {
  structure: BaseCardInfo[];
  manifest: CardManifest;
}

// 卡片完整数据
export interface Card {
  id: CardId;
  metadata: CardMetadata;
  structure: CardStructure;
  resources?: Map<string, Blob | ArrayBuffer>;
}

// 卡片渲染选项
export interface CardRenderOptions {
  cardId: CardId;
  containerId: string;
  themeId?: string;
  mode?: RenderMode;
  interactive?: boolean;
  autoHeight?: boolean;
}

// 卡片渲染结果
export interface CardRenderResult {
  success: boolean;
  frame?: HTMLIFrameElement;
  metadata?: CardMetadata;
  error?: string;
  duration?: number;
}

// 卡片查询选项
export interface CardQueryOptions {
  tags?: Tag[];
  author?: string;
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  limit?: number;
  offset?: number;
}
