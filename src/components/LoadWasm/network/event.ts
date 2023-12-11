export enum EventType {
  OFFER = "offer",
  ANSWER = "answer",
  ICE = "ice",
  BLOCK_CREATED = "block-created",
  TX_CREATED = "tx-created",
  NEW_TX = "new-tx",
}

export type PeerEvent<T> = {
  nickname: string;
  data: T;
};

