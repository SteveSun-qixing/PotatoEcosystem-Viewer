const createStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
};

const storage = createStorage();

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
}

if (typeof globalThis.sessionStorage === 'undefined' || typeof globalThis.sessionStorage.getItem !== 'function') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: createStorage(),
    configurable: true,
  });
}

if (typeof globalThis.URL === 'undefined') {
  Object.defineProperty(globalThis, 'URL', {
    value: class URLMock {},
    configurable: true,
  });
}

if (typeof globalThis.URL.createObjectURL !== 'function') {
  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    value: () => 'blob:mock-url',
    configurable: true,
  });
}

if (typeof globalThis.URL.revokeObjectURL !== 'function') {
  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    value: () => {},
    configurable: true,
  });
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    configurable: true,
  });
}
