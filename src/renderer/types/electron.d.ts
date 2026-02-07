/**
 * Electron API 类型声明
 */
declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        fullscreen: () => void;
        setTitle: (title: string) => void;
      };
      file: {
        openDialog: () => Promise<string | null>;
        read: (filePath: string) => Promise<ArrayBuffer>;
        getPathForFile: (file: File) => string;
      };
      platform: string;
    };
  }
}

export {};
