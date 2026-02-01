/**
 * 箱子相关类型定义
 * @module @common/types/box
 */
import type { BoxId, ChipsId, Timestamp, ProtocolVersion, LocationType } from './base';
import type { Tag, CardMetadata } from './card';

// 箱子元数据
export interface BoxMetadata {
  chip_standards_version: ProtocolVersion;
  box_id: BoxId;
  name: string;
  created_at: Timestamp;
  modified_at: Timestamp;
  layout: string;
  theme?: string;
  tags?: Tag[];
  description?: string;
  [key: string]: unknown;
}

// 箱子卡片条目
export interface BoxCardEntry {
  id: ChipsId;
  location: LocationType;
  path: string;
  auth_profile?: string;
  metadata_cache?: Partial<CardMetadata>;
}

// 箱子结构
export interface BoxStructure {
  cards: BoxCardEntry[];
  total_count: number;
}

// 布局配置
export interface LayoutConfig {
  layout_type: string;
  [key: string]: unknown;
}

// 箱子内容配置
export interface BoxContent {
  active_layout: string;
  layout_configs: Record<string, LayoutConfig>;
}

// 箱子完整数据
export interface Box {
  id: BoxId;
  metadata: BoxMetadata;
  structure: BoxStructure;
  content: BoxContent;
}

// 箱子渲染选项
export interface BoxRenderOptions {
  boxId: BoxId;
  containerId: string;
  themeId?: string;
  layoutConfig?: Partial<LayoutConfig>;
}

// 箱子渲染结果
export interface BoxRenderResult {
  success: boolean;
  frame?: HTMLIFrameElement;
  metadata?: BoxMetadata;
  error?: string;
  duration?: number;
}
