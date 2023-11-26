declare global {
  export interface Window {
    Go: any;
    createNewTx: () => Promise<void>;
    createBlock: () => Promise<void>;
    insertBroadcastedTx: () => Promise<void>;
    insertBroadcastedBlock: () => Promise<void>;
  }
}

export {};
