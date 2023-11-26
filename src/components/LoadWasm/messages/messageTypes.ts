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
}
