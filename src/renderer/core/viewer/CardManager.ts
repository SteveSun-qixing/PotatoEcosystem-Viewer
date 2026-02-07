import type { ICardManager, IEventBus } from '@common/interfaces';
import type { Card, CardMetadata, CardRenderOptions, CardRenderResult } from '@common/types';
import type { SDKService } from '@renderer/services';
import { Logger, getLocale, translate } from '@renderer/services';
import { EVENTS } from '@common/constants';
import {
  BaseCardPluginRegistry,
  type BaseCardRenderContext,
  type BaseCardRenderPlugin,
  type BaseCardServiceResponse,
} from './BaseCardPluginRegistry';

interface BaseCardConfigEntry {
  id: string;
  type: string;
  config: Record<string, unknown>;
  content?: string;
}

interface CardWithBaseCards extends Card {
  baseCards?: BaseCardConfigEntry[];
}

interface ResourceFetchPayload {
  uri?: unknown;
  options?: {
    as?: 'url' | 'text' | 'blob' | 'arrayBuffer' | 'arraybuffer';
    [key: string]: unknown;
  };
}

export class CardManager implements ICardManager {
  private currentCard: CardWithBaseCards | null = null;
  private currentFrame: HTMLIFrameElement | null = null;
  private currentContainer: HTMLElement | null = null;
  private currentPath: string | null = null;
  private zoom = 1;

  private readonly sdkService: SDKService;
  private readonly logger: Logger;
  private readonly eventBus: IEventBus;
  private readonly pluginRegistry: BaseCardPluginRegistry;
  private readonly activeObjectUrls = new Set<string>();
  private readonly pluginCleanupHandlers = new Set<() => Promise<void> | void>();

  constructor(sdkService: SDKService, eventBus: IEventBus) {
    this.sdkService = sdkService;
    this.eventBus = eventBus;
    this.logger = new Logger('CardManager');
    this.pluginRegistry = new BaseCardPluginRegistry();
  }

  async openCard(
    path: string,
    container: HTMLElement,
    options?: Partial<CardRenderOptions>
  ): Promise<CardRenderResult> {
    this.logger.info('Opening card', { path });
    const startTime = performance.now();

    try {
      this.cleanupCurrentCard();

      const card = (await this.loadCard(path)) as CardWithBaseCards;
      this.currentCard = card;
      this.currentContainer = container;
      this.currentPath = path;

      const renderOptions: CardRenderOptions = {
        cardId: card.id,
        containerId: container.id || `card-container-${Date.now()}`,
        mode: options?.mode ?? 'full',
        themeId: options?.themeId,
        interactive: options?.interactive ?? true,
        autoHeight: options?.autoHeight ?? true,
      };

      if (!container.id) {
        container.id = renderOptions.containerId;
      }

      const result = await this.renderCard(card, container, renderOptions);
      const duration = performance.now() - startTime;

      if (result.success) {
        if (result.frame) {
          this.currentFrame = result.frame;
          if (result.frame.dataset.chipsRenderer !== 'plugin') {
            this.setupInteractionChannel(result.frame);
          }
        }

        this.eventBus.emit(EVENTS.CONTENT_RENDER, {
          type: 'card',
          path,
          success: true,
          duration,
        });

        this.logger.info('Card opened successfully', {
          path,
          duration: `${duration.toFixed(2)}ms`,
          renderer: result.frame?.dataset.chipsRenderer ?? (result.frame ? 'foundation' : 'plugin'),
        });
      }

      return {
        ...result,
        duration,
      };
    } catch (error) {
      this.logger.error('Failed to open card', error as Error, { path });

      this.eventBus.emit(EVENTS.CONTENT_ERROR, {
        type: 'card',
        path,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  closeCard(): void {
    this.logger.info('Closing card');
    this.cleanupCurrentCard();
    this.currentCard = null;
    this.currentContainer = null;
    this.currentPath = null;
  }

  getCurrentCard(): Card | null {
    return this.currentCard;
  }

  async getCardMetadata(path: string): Promise<CardMetadata> {
    this.logger.debug('Getting card metadata', { path });
    return this.sdkService.getCardMetadata(path);
  }

  async validateCard(path: string): Promise<boolean> {
    this.logger.debug('Validating card', { path });
    return this.sdkService.validateCard(path);
  }

  async refreshCard(): Promise<void> {
    if (!this.currentPath || !this.currentContainer) {
      this.logger.warn('No card to refresh');
      return;
    }
    await this.openCard(this.currentPath, this.currentContainer);
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(5, zoom));
    if (this.currentFrame) {
      this.currentFrame.style.transform = `scale(${this.zoom})`;
      this.currentFrame.style.transformOrigin = 'top left';
    }
    this.logger.debug('Zoom set', { zoom: this.zoom });
  }

  getZoom(): number {
    return this.zoom;
  }

  registerBaseCardPlugin(plugin: BaseCardRenderPlugin): void {
    this.pluginRegistry.register(plugin);
  }

  unregisterBaseCardPlugin(pluginId: string): void {
    this.pluginRegistry.unregister(pluginId);
  }

  listBaseCardPlugins(): BaseCardRenderPlugin[] {
    return this.pluginRegistry.list();
  }

  private async loadCard(path: string): Promise<Card> {
    this.logger.debug('Loading card data', { path });
    return this.sdkService.loadCard(path);
  }

  private async renderCard(
    card: CardWithBaseCards,
    container: HTMLElement,
    options: CardRenderOptions
  ): Promise<CardRenderResult> {
    this.logger.debug('Rendering card', { cardId: card.id });

    try {
      const result = await this.sdkService.renderCard(card, {
        containerId: options.containerId,
        themeId: options.themeId,
        mode: options.mode,
      });

      const preparedFrame = result.frame ? this.prepareFrame(result.frame) : null;
      if (result.success && preparedFrame) {
        preparedFrame.dataset.chipsRenderer = 'foundation';
        this.setupFrameStyles(preparedFrame);
        container.appendChild(preparedFrame);
        return {
          success: true,
          frame: preparedFrame,
          metadata: card.metadata,
        };
      }

      if (result.success) {
        return {
          success: true,
          metadata: card.metadata,
        };
      }

      throw new Error(result.error ?? 'Foundation rendering failed');
    } catch (error) {
      this.logger.warn('Foundation rendering unavailable, switching to plugin renderer', {
        error: (error as Error).message,
      });
      return this.renderCardWithPlugins(card, container, options);
    }
  }

  private async renderCardWithPlugins(
    card: CardWithBaseCards,
    container: HTMLElement,
    options: CardRenderOptions
  ): Promise<CardRenderResult> {
    const baseCards = this.getBaseCards(card);
    container.innerHTML = '';
    const root = document.createElement('article');
    root.className = 'chips-viewer-card';
    root.dataset.cardId = card.id;
    container.appendChild(root);

    if (baseCards.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chips-viewer-card-empty';
      empty.textContent = translate('content.empty.noContent');
      root.appendChild(empty);
      return {
        success: true,
        metadata: card.metadata,
      };
    }
    for (const baseCard of baseCards) {
      const section = document.createElement('section');
      section.className = 'chips-viewer-base-card';
      section.dataset.baseCardId = baseCard.id;
      section.dataset.baseCardType = baseCard.type;
      root.appendChild(section);

      const plugin = this.pluginRegistry.get(baseCard.type);
      if (!plugin) {
        this.logger.error(
          'Base card renderer plugin is not installed',
          undefined,
          { baseCardType: baseCard.type, baseCardId: baseCard.id }
        );
        section.classList.add('chips-viewer-base-card-empty');
        section.textContent = `Plugin missing for ${baseCard.type}`;
        continue;
      }

      try {
        const context = this.createPluginContext(card, baseCard, section, options);
        const rendered = await plugin.render(context);
        if (rendered?.cleanup) {
          this.pluginCleanupHandlers.add(rendered.cleanup);
        }

        if (section.childElementCount === 0 && !(section.textContent?.trim() ?? '')) {
          section.classList.add('chips-viewer-base-card-empty');
          section.textContent = `${baseCard.type} renderer returned empty view`;
        }
      } catch (error) {
        this.logger.error(
          'Base card plugin render failed',
          error as Error,
          { baseCardType: baseCard.type, baseCardId: baseCard.id }
        );
        section.classList.add('chips-viewer-base-card-empty');
        section.textContent = `${baseCard.type} render failed: ${(error as Error).message}`;
      }
    }

    return {
      success: true,
      metadata: card.metadata,
    };
  }

  private getBaseCards(card: CardWithBaseCards): BaseCardConfigEntry[] {
    if (!Array.isArray(card.baseCards)) {
      return [];
    }

    return card.baseCards.map(item => ({
      id: item.id,
      type: item.type,
      config: item.config ?? {},
      content: item.content,
    }));
  }

  private createPluginContext(
    card: CardWithBaseCards,
    baseCard: BaseCardConfigEntry,
    container: HTMLElement,
    options: CardRenderOptions
  ): BaseCardRenderContext {
    return {
      card,
      baseCardId: baseCard.id,
      baseCardType: baseCard.type,
      config: baseCard.config,
      content: baseCard.content,
      container,
      themeId: options.themeId,
      interactive: options.interactive ?? true,
      mode: options.mode ?? 'full',
      locale: getLocale(),
      requestService: async (service: string, payload: unknown): Promise<BaseCardServiceResponse> => {
        return this.handlePluginServiceRequest(card, options, service, payload);
      },
    };
  }

  private async handlePluginServiceRequest(
    card: CardWithBaseCards,
    options: CardRenderOptions,
    service: string,
    payload: unknown
  ): Promise<BaseCardServiceResponse> {
    switch (service) {
      case 'resource.fetch':
        return this.handleResourceFetch(card, payload as ResourceFetchPayload);
      case 'theme.get':
        return this.handleThemeFetch(options, payload);
      case 'viewer.openImage':
        this.eventBus.emit('card:image-open', payload);
        return { success: true, data: payload };
      case 'core.register_service':
      case 'log.info':
      case 'log.warn':
      case 'log.error':
        return { success: true };
      default:
        try {
          const data = await this.sdkService.request(service, payload);
          return { success: true, data };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
    }
  }

  private async handleThemeFetch(
    options: CardRenderOptions,
    payload: unknown
  ): Promise<BaseCardServiceResponse> {
    const payloadRecord = this.asRecord(payload);
    const themeId = this.getStringField(payloadRecord, 'themeId') ?? options.themeId;

    if (!themeId) {
      return { success: false, error: 'Theme id is required' };
    }

    try {
      const data = await this.sdkService.request('theme.get', { themeId });
      return { success: true, data };
    } catch {
      return { success: false, error: `Theme service unavailable: ${themeId}` };
    }
  }

  private async handleResourceFetch(
    card: CardWithBaseCards,
    payload: ResourceFetchPayload
  ): Promise<BaseCardServiceResponse> {
    const uri = typeof payload.uri === 'string' ? payload.uri : '';
    if (!uri) {
      return { success: false, error: 'Resource URI is required' };
    }

    const modeRaw = String(payload.options?.as ?? 'url').toLowerCase();
    const mode = modeRaw === 'arraybuffer' ? 'arraybuffer' : modeRaw;
    const resolvedPath = this.resolveResourceUri(uri);

    if (/^(https?:|data:|blob:|file:)/i.test(resolvedPath)) {
      if (mode === 'url') {
        return { success: true, data: { url: resolvedPath } };
      }
      return { success: false, error: `Unsupported fetch mode for remote resource: ${mode}` };
    }

    const entry = this.findResourceEntry(card, resolvedPath);
    if (!entry) {
      return { success: false, error: `Resource not found: ${resolvedPath}` };
    }

    if (mode === 'text') {
      const text = await this.readResourceAsText(entry.payload);
      return { success: true, data: { content: text } };
    }

    if (mode === 'blob') {
      const blob = this.readResourceAsBlob(entry.path, entry.payload);
      return { success: true, data: { blob } };
    }

    if (mode === 'arraybuffer') {
      const buffer = await this.readResourceAsArrayBuffer(entry.payload);
      return { success: true, data: { arrayBuffer: buffer } };
    }

    const url = this.createResourceObjectUrl(entry.path, entry.payload);
    return { success: true, data: { url } };
  }

  private resolveResourceUri(uri: string): string {
    if (uri.startsWith('chips://card/')) {
      const parts = uri.slice('chips://card/'.length).split('/');
      if (parts.length > 1) {
        return decodeURIComponent(parts.slice(1).join('/'));
      }
      return '';
    }

    if (uri.startsWith('chips://local/')) {
      const localPath = decodeURIComponent(uri.slice('chips://local/'.length));
      return localPath.startsWith('/') ? localPath : `/${localPath}`;
    }

    if (uri.startsWith('chips://network/')) {
      const networkPath = decodeURIComponent(uri.slice('chips://network/'.length));
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(networkPath)) {
        return networkPath;
      }
      const protocolStyle = networkPath.match(/^([a-z][a-z0-9+.-]*)\/(.+)$/i);
      if (protocolStyle) {
        return `${protocolStyle[1]}://${protocolStyle[2]}`;
      }
      return networkPath;
    }

    return uri;
  }

  private findResourceEntry(
    card: CardWithBaseCards,
    requestedPath: string
  ): { path: string; payload: Blob | ArrayBuffer } | null {
    const normalizedPath = requestedPath.trim();
    if (!normalizedPath) {
      return null;
    }

    const resources = card.resources;
    if (!(resources instanceof Map)) {
      return null;
    }

    const candidates = [
      normalizedPath,
      normalizedPath.replace(/^\.\//, ''),
      normalizedPath.replace(/^\//, ''),
      normalizedPath.split('/').pop() ?? normalizedPath,
    ];

    for (const candidate of candidates) {
      const payload = resources.get(candidate);
      if (payload) {
        return { path: candidate, payload };
      }
    }

    if (normalizedPath.startsWith('content/')) {
      const contentRelative = normalizedPath.slice('content/'.length);
      const payload = resources.get(contentRelative);
      if (payload) {
        return { path: contentRelative, payload };
      }
    }

    return null;
  }

  private async readResourceAsArrayBuffer(resource: Blob | ArrayBuffer): Promise<ArrayBuffer> {
    if (resource instanceof Blob) {
      return resource.arrayBuffer();
    }
    return resource;
  }

  private async readResourceAsText(resource: Blob | ArrayBuffer): Promise<string> {
    if (resource instanceof Blob) {
      return resource.text();
    }
    return new TextDecoder().decode(resource);
  }

  private readResourceAsBlob(path: string, resource: Blob | ArrayBuffer): Blob {
    if (resource instanceof Blob) {
      return resource;
    }
    return new Blob([resource], { type: this.inferMimeType(path) });
  }

  private createResourceObjectUrl(path: string, resource: Blob | ArrayBuffer): string {
    if (resource instanceof Blob) {
      const objectUrl = URL.createObjectURL(resource);
      this.activeObjectUrls.add(objectUrl);
      return objectUrl;
    }

    const mimeType = this.inferMimeType(path);
    const blob = new Blob([resource], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    this.activeObjectUrls.add(objectUrl);
    return objectUrl;
  }

  private inferMimeType(path: string): string {
    const lower = path.toLowerCase();
    if (/\.png$/i.test(lower)) return 'image/png';
    if (/\.(jpg|jpeg)$/i.test(lower)) return 'image/jpeg';
    if (/\.gif$/i.test(lower)) return 'image/gif';
    if (/\.webp$/i.test(lower)) return 'image/webp';
    if (/\.svg$/i.test(lower)) return 'image/svg+xml';
    if (/\.mp4$/i.test(lower)) return 'video/mp4';
    if (/\.webm$/i.test(lower)) return 'video/webm';
    if (/\.mp3$/i.test(lower)) return 'audio/mpeg';
    if (/\.wav$/i.test(lower)) return 'audio/wav';
    if (/\.ogg$/i.test(lower)) return 'audio/ogg';
    if (/\.json$/i.test(lower)) return 'application/json';
    if (/\.md$/i.test(lower)) return 'text/markdown';
    if (/\.txt$/i.test(lower)) return 'text/plain';
    return 'application/octet-stream';
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private getStringField(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
  }

  private setupFrameStyles(frame: HTMLIFrameElement): void {
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = 'none';
    frame.style.display = 'block';
    frame.style.backgroundColor = 'transparent';
    if (this.zoom !== 1) {
      frame.style.transform = `scale(${this.zoom})`;
      frame.style.transformOrigin = 'top left';
    }
  }

  private prepareFrame(frame: HTMLIFrameElement): HTMLIFrameElement {
    const managedKey = 'chipsViewerManaged';
    const isManaged = frame.dataset[managedKey] === 'true';
    const preparedFrame = isManaged ? (frame.cloneNode(true) as HTMLIFrameElement) : frame;
    preparedFrame.dataset[managedKey] = 'true';
    return preparedFrame;
  }

  private setupInteractionChannel(frame: HTMLIFrameElement): void {
    const handleMessage = (event: MessageEvent): void => {
      if (event.source !== frame.contentWindow) {
        return;
      }

      const { type, data } = event.data || {};
      switch (type) {
        case 'card:ready':
          this.logger.debug('Card frame ready', { cardId: data?.cardId });
          break;
        case 'card:resize':
          this.handleFrameResize(frame, data);
          break;
        case 'card:navigate':
          this.eventBus.emit('card:navigate', data);
          break;
        case 'card:error':
          this.logger.error('Card frame error', undefined, data);
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    (frame as HTMLIFrameElement & { _cleanupHandler?: () => void })._cleanupHandler = (): void => {
      window.removeEventListener('message', handleMessage);
    };
  }

  private handleFrameResize(
    frame: HTMLIFrameElement,
    data: { width?: number; height?: number }
  ): void {
    if (data.height) {
      frame.style.height = `${data.height}px`;
    }
    if (data.width) {
      frame.style.width = `${data.width}px`;
    }
  }

  private cleanupCurrentCard(): void {
    if (this.currentFrame) {
      const cleanupHandler = (this.currentFrame as HTMLIFrameElement & { _cleanupHandler?: () => void })._cleanupHandler;
      if (cleanupHandler) {
        cleanupHandler();
      }
      this.currentFrame.remove();
      this.currentFrame = null;
    }

    for (const cleanup of this.pluginCleanupHandlers) {
      try {
        const result = cleanup();
        if (result instanceof Promise) {
          void result.catch(error => {
            this.logger.warn('Plugin cleanup failed', { error: (error as Error).message });
          });
        }
      } catch (error) {
        this.logger.warn('Plugin cleanup failed', { error: (error as Error).message });
      }
    }
    this.pluginCleanupHandlers.clear();

    if (this.currentContainer) {
      this.currentContainer.innerHTML = '';
    }

    for (const objectUrl of this.activeObjectUrls) {
      URL.revokeObjectURL(objectUrl);
    }
    this.activeObjectUrls.clear();
  }
}
