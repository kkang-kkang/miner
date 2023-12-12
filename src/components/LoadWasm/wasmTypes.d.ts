declare global {
  export type TxCandidate = {
    readonly amount: number;
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

  export type BlockBody = {
    coinbaseTx: Transaction | undefined;
    txs: Transaction[] | undefined;
    coinbaseTxHash: string;
    txHashes: string[];
  };

  export type BlockHeader = {
    curHash: string;
    prevHash: string;
    dataHash: string;
    difficulty: number;
    nonce: number;
    timestamp: string;
  };

  export type Block = {
    header: BlockHeader;
    body: BlockBody;
  };

  export type KeyPair = {
    publicKey: string;
    privateKey: string;
  };

  export interface Window {
    Go: any;
    createBlock: (input: BlockCandidate) => Promise<Block>;
    createNewTx: (input: TxCandidate) => Promise<Transaction>;
    insertBroadcastedBlock: (candidate: Block) => Promise<void>;
    insertBroadcastedTx: (candidate: Transaction) => Promise<void>;
    createGenesis: () => Promise<void>;
    createKeyPair: () => Promise<KeyPair>;
    setMinerAddress: (addr: string) => Promise<void>;
    getHeadHash: () => Promise<string>;
    getBalance: (addr: string) => Promise<number>;

    getDevice: () => any;
  }
}

export {};
