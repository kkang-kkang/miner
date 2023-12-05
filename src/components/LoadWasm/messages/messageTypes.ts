export class Message<T> {
  constructor(type: string, data: T) {
    this.type = type;
    this.data = data;
  }

  public readonly type: string;
  public readonly data: T;
}

export enum MessageTypes {
  CREATE_TX = "createTx",
  TX_CREATED = "txCreated",
  INSERT_TX = "insertTx",
  TX_INSERTED = "txInserted",

  CREATE_BLOCK = "createBlock",
  BLOCK_CREATED = "blockCreated",
  INSERT_BLOCK = "insertBlock",
  BLOCK_INSERTED = "blockInserted",
}
