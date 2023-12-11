import { Socket, io } from "socket.io-client";
import { EventType, PeerEvent } from "./event";

interface Message<T> {
  requestId: string;
  data: T;
}

enum Request {
  NEW_TX = "new-tx",
  FIND_TX = "find-tx",
  FIND_BLOCK = "find-block",
  GET_BALANCE = "get-balance",
  LIST_BLOCK = "list-block",
}

export class SocketClient extends EventTarget {
  private readonly socket: Socket;

  constructor() {
    super();
    this.socket = io({
      host: "",
      port: 1111,
      transports: ["websocket"],
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
  }

  private handleFindBlock(): void {}
  private handleFindTx(): void {}
  private handleGetBalance(): void {}
  private handleListBlock(): void {}

  private handleNewTx({ data: candidate, requestId }: Message<TxCandidate>): Promise<void> {
    return new Promise((resolve) => {
      const handleTxCreated = (e: Event) => {
        this.removeEventListener(EventType.TX_CREATED, handleTxCreated);

        const { detail: tx } = e as CustomEvent<Transaction | null>;

        const msg: Message<string> = {
          requestId,
          data: tx?.hash ?? "",
        };

        this.socket.emit(Request.NEW_TX, msg);
        resolve();
      };

      this.addEventListener(EventType.TX_CREATED, handleTxCreated);
      this.dispatchEvent(
        new CustomEvent<TxCandidate>(EventType.NEW_TX, {
          detail: candidate,
        }),
      );
    });
  }
}
