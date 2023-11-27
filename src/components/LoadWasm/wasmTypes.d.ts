declare global {
  export type TxCandidate = {
    readonly amount: number;
    readonly srcAddress: string;
    readonly dstAddress: string;
    readonly privateKey: string;
  };

  export type BlockCandidate = {
    readonly transactionHashes: string[];
  };

  export type TxIn = {
    txHash: string;
    outIdx: number;
    sig: string;
  };

  export type TxOut = {
    addr: string;
    amount: number;
  };

  export type Transaction = {
    hash: string;
    inputs: TxIn[];
    outputs: TxOut[];
  };

  export interface Window {
    Go: any;
    createNewTx: (input: TxCandidate) => Promise<Transaction>;
    createBlock: (input: BlockCandidate) => Promise<void>;
    insertBroadcastedTx: (candidate: string) => Promise<void>;
    insertBroadcastedBlock: (candidate: string) => Promise<void>;
  }
}

export {};
