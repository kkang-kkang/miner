import { Socket, io } from "socket.io-client";
import { DBManager, ObjectStore } from "../misc";
import {
  AddrPayload,
  BalancePayload,
  BlockQuery,
  BlockSummary,
  EventType,
  HashPayload,
  IDEvent,
  PeerEvent,
} from "./event";
import { NetworkListener } from "./networkListener";

enum Request {
  NEW_TX = "new-tx",
  FIND_TX = "find-tx",
  FIND_BLOCK = "find-block",
  GET_BALANCE = "get-balance",
  LIST_BLOCK = "list-block",
}

export class SocketClient {
  private readonly socket: Socket;

  constructor(
    private readonly networkListener: NetworkListener,
    private readonly dbManager: DBManager,
    nickname: string,
  ) {
    this.socket = io({
      host: "",
      port: 1111,
      transports: ["websocket"],
      auth: {
        nickname,
      },
    });
    this.registerListeners();
  }

  public sendOffer(offer: RTCSessionDescription) {
    this.socket.emit(EventType.OFFER, offer.toJSON());
  }

  public sendAnswer(nickname: string, answer: RTCSessionDescription) {
    const event: PeerEvent<string> = { nickname, data: answer.toJSON() };
    this.socket.emit(EventType.ANSWER, event);
  }

  public sendIce(nickname: string, ice: RTCIceCandidate) {
    const event: PeerEvent<string> = { nickname, data: ice.candidate };
    this.socket.emit(EventType.ICE, event);
  }

  private registerListeners() {
    this.socket.on(Request.FIND_BLOCK, this.handleFindBlock);
    this.socket.on(Request.FIND_TX, this.handleFindTx);
    this.socket.on(Request.GET_BALANCE, this.handleGetBalance);
    this.socket.on(Request.LIST_BLOCK, this.handleListBlock);
    this.socket.on(Request.NEW_TX, this.handleNewTx);

    this.networkListener.attachListener(EventType.TX_CREATED, this.handleTxCreated);
  }

  private async handleFindBlock({ data: { hash }, id }: IDEvent<HashPayload>) {
    const block = await this.findBlock(hash);

    const msg: IDEvent<Block | null> = { id, data: block };
    this.socket.emit(Request.FIND_BLOCK, msg);
  }

  private async handleFindTx({ data: { hash }, id }: IDEvent<HashPayload>): Promise<void> {
    const tx = await this.dbManager.get(ObjectStore.TRANSACTION, hash);

    const msg: IDEvent<Transaction | null> = { id, data: tx ? (tx as Transaction) : null };
    this.socket.emit(Request.FIND_TX, msg);
  }

  private async handleGetBalance({ data: { addr }, id }: IDEvent<AddrPayload>): Promise<void> {
    const balance = await this.dbManager.getBalance(addr);

    const msg: IDEvent<BalancePayload> = { id, data: { balance } };
    this.socket.emit(Request.GET_BALANCE, msg);
  }

  private async handleListBlock({ data: { count, head }, id }: IDEvent<BlockQuery>): Promise<void> {
    const blockSummaries: BlockSummary[] = [];

    for (let i = 0; i < count; i++) {
      const block = await this.findBlock(head);
      if (block == null || block.header.curHash === "00") break;
      blockSummaries.push({
        curHash: block.header.curHash,
        prevHash: block.header.prevHash,
        timestamp: block.header.timestamp,
        txCount: block.body.txHashes.length + 1,
      });
      head = block.header.prevHash;
    }

    const msg: IDEvent<BlockSummary[]> = { data: blockSummaries, id };
    this.socket.emit(Request.LIST_BLOCK, msg);
  }

  private handleNewTx(msg: IDEvent<TxCandidate>) {
    this.networkListener.dispatch(EventType.NEW_TX, msg);
  }

  private handleTxCreated({ data: tx, id }: IDEvent<Transaction | null>) {
    const msg: IDEvent<string> = {
      id,
      data: tx?.hash ?? "",
    };

    this.socket.emit(Request.NEW_TX, msg);
  }

  private async findBlock(hash: string): Promise<Block | null> {
    const body = await this.dbManager.get(ObjectStore.BLOCK_BODIES, hash);
    const header = await this.dbManager.get(ObjectStore.BLOCK_HEADERS, hash);
    if (header === undefined || body === undefined) {
      return null;
    }

    return {
      body: body as BlockBody,
      header: header as BlockHeader,
    };
  }
}
