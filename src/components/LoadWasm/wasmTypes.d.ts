declare global {
  export interface Window {
    Go: any;
    initRTCConnection: () => Promise<void>;
  }
}

export {};
