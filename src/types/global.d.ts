// Global type extensions for window
declare global {
  interface Window {
    scrollSaveTimeout?: ReturnType<typeof setTimeout>;
    draftSaveTimeout?: ReturnType<typeof setTimeout>;
  }
}

export {};

