export class Message<T> {
  constructor(type: string, data: T) {
    this.type = type;
    this.data = data;
  }

  public readonly type: string;
  public readonly data: T;
}

export enum MessageTypes {
  ERROR = "error",

  CREATE_TX = "createTx",
  TX_CREATED = "txCreated",
  INSERT_TX = "insertTx",
  TX_INSERTED = "txInserted",

  CREATE_BLOCK = "createBlock",
  CREATE_GENESIS = "createGenesis",
  BLOCK_CREATED = "blockCreated",
  INSERT_BLOCK = "insertBlock",
  BLOCK_INSERTED = "blockInserted",

  CREATE_KEY_PAIR = "createKeyPair",
  KEY_PAIR_CREATED = "keyPairCreated",

  SET_MINER_ADDR = "setMinerAddr",
  MINER_ADDR_SET = "minerAddrSet",

  GET_HEAD_HASH = "getHeadHash",
  GOT_HEAD_HASH = "gotHeadHash",

  SET_HEAD_HASH = "setHeadHash",
  HEAD_HASH_CHANGED = "headHashChanged",

  GET_BALANCE = "getBalance",
  GOT_BALANCE = "gotBalance",
}
