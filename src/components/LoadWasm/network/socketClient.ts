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
  private readonly networkListener: NetworkListener;
  private readonly dbManager: DBManager;

  private socket?: Socket;
  private nickname = "";

  constructor(networkListener: NetworkListener, dbManager: DBManager) {
    this.networkListener = networkListener;
    this.dbManager = dbManager;
  }

  public connect(
    nickname: string,
    addr: { scheme: string; host: string; port: number; path: string },
  ): Promise<void> {
    this.nickname = nickname;
    this.socket = io(`${addr.scheme}://${addr.host}:${addr.port}`, {
      transports: ["websocket"],
      auth: {
        nickname: this.nickname,
      },
      path: addr.path,
    });
    this.registerListeners();

    return new Promise((resolve, reject) => {
      this.socket!.on("connect", resolve);
      this.socket!.on("connect_error", reject);
    });
  }

  public sendOffer(offer: RTCSessionDescription) {
    const event: PeerEvent<string> = { nickname: "", data: offer.sdp };
    this.socket!.emit(EventType.OFFER, event);
  }

  private registerListeners() {
    this.socket!.on(Request.FIND_BLOCK, this.handleFindBlock.bind(this));
    this.socket!.on(Request.FIND_TX, this.handleFindTx.bind(this));
    this.socket!.on(Request.GET_BALANCE, this.handleGetBalance.bind(this));
    this.socket!.on(Request.LIST_BLOCK, this.handleListBlock.bind(this));
    this.socket!.on(Request.NEW_TX, this.handleNewTx.bind(this));

    this.socket!.on(EventType.OFFER, this.handleOffer.bind(this));
    this.socket!.on(EventType.ANSWER, this.handleAnswer.bind(this));
    this.socket!.on(EventType.ICE, this.handleReceiveIce.bind(this));

    this.networkListener.attachListener(EventType.TX_CREATED, this.handleTxCreated.bind(this));
    this.networkListener.attachListener(EventType.SEND_ICE, this.handleSendIce.bind(this));
    this.networkListener.attachListener(EventType.SEND_ANSWER, this.sendAnswer.bind(this));
  }

  private sendAnswer(event: PeerEvent<RTCSessionDescription>) {
    const msg: PeerEvent<string> = { nickname: event.nickname, data: event.data.sdp };
    this.socket!.emit(EventType.ANSWER, msg);
  }

  private handleSendIce(event: PeerEvent<RTCIceCandidate>) {
    const msg: PeerEvent<string> = { nickname: event.nickname, data: event.data.candidate };
    this.socket!.emit(EventType.ICE, msg);
  }

  private handleOffer(event: PeerEvent<string>) {
    if (event.nickname === this.socket!.id) return;

    const sessionDescription = new RTCSessionDescription({ type: "offer", sdp: event.data });

    const msg: PeerEvent<RTCSessionDescription> = {
      data: sessionDescription,
      nickname: event.nickname,
    };
    this.networkListener.dispatch(EventType.RECEIVE_OFFER, msg);
  }

  private handleAnswer(event: PeerEvent<string>) {
    const sessionDescription = new RTCSessionDescription({ type: "answer", sdp: event.data });

    const msg: PeerEvent<RTCSessionDescription> = {
      data: sessionDescription,
      nickname: event.nickname,
    };
    this.networkListener.dispatch(EventType.RECEIVE_ANSWER, msg);
  }

  private handleReceiveIce(event: PeerEvent<string>) {
    const candidate = new RTCIceCandidate({ candidate: event.data });

    const msg: PeerEvent<RTCIceCandidate> = {
      data: candidate,
      nickname: event.nickname,
    };
    this.networkListener.dispatch(EventType.RECEIVE_ICE, msg);
  }

  private async handleFindBlock({ data: { hash }, id }: IDEvent<HashPayload>) {
    const block = await this.findBlock(hash);

    const msg: IDEvent<Block | null> = { id, data: block };
    this.socket!.emit(Request.FIND_BLOCK, msg);
  }

  private async handleFindTx({ data: { hash }, id }: IDEvent<HashPayload>): Promise<void> {
    const tx = await this.dbManager.get(ObjectStore.TRANSACTION, hash);

    const msg: IDEvent<Transaction | null> = { id, data: tx ? (tx as Transaction) : null };
    this.socket!.emit(Request.FIND_TX, msg);
  }

  private async handleGetBalance({ data: { addr }, id }: IDEvent<AddrPayload>): Promise<void> {
    const balance = await this.dbManager.getBalance(addr);

    const msg: IDEvent<BalancePayload> = { id, data: { balance } };
    this.socket!.emit(Request.GET_BALANCE, msg);
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
    this.socket!.emit(Request.LIST_BLOCK, msg);
  }

  private handleNewTx(msg: IDEvent<TxCandidate>) {
    this.networkListener.dispatch(EventType.NEW_TX, msg);
  }

  private handleTxCreated({ data: tx, id }: IDEvent<Transaction | null>) {
    if (id === "") return;
    const msg: IDEvent<string> = {
      id,
      data: tx?.hash ?? "",
    };

    this.socket!.emit(Request.NEW_TX, msg);
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
