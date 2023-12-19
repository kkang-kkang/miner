export enum EventType {
  NEW_PEER = "new-peer",

  OFFER = "offer",
  SEND_OFFER = "send-offer",
  RECEIVE_OFFER = "receive-offer",

  ANSWER = "answer",
  SEND_ANSWER = "send-answer",
  RECEIVE_ANSWER = "receive-answer",
  ANSWER_ACK = "answer-ack",
  SEND_ANSWER_ACK = "send-answer-ack",
  GOT_ANSWER_ACK = "receive-answer-ack",

  ICE = "ice",
  SEND_ICE = "send-ice",
  RECEIVE_ICE = "receive-ice",

  BLOCK_CREATED = "block-created",
  TX_CREATED = "tx-created",
  NEW_TX = "new-tx",

  PEER_CONNECTED = "peer-conneced",
  PEER_DISCONNECTED = "peer-disconnected",

  SEND_BLOCKCHAIN = "send-blockchain",
  RECEIVE_BLOCKCHAIN = "receive-blockchain",

  CHAT = "chat",
}

export type BlockQuery = {
  head: string;
  count: number;
};

export type BlockSummary = {
  curHash: string;
  prevHash: string;
  timestamp: string;
  txCount: number;
};

export type BalancePayload = {
  balance: number;
};

export type AddrPayload = {
  addr: string;
};

export type HashPayload = {
  hash: string;
};

export type ChatPayload = {
  data: string;
  timestamp: Date;
};

export type PeerEvent<T> = {
  nickname: string;
  data: T;
};

export type IDEvent<T> = {
  id: string;
  data: T;
};
