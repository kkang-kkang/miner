import { Mutex } from "async-mutex";
import { createTx } from "../event/dispatchers";
import { EventType, PeerEvent } from "./event";
import { PeerManager } from "./peerManager";
import { SocketClient } from "./socketClient";

export class NetworkManager {
  private readonly peerManager: PeerManager;
  private readonly socketClient: SocketClient;
  private readonly mutex: Mutex;
  // TODO: create event manager or something.

  constructor(mutex: Mutex) {
    this.peerManager = new PeerManager(mutex);
    this.socketClient = new SocketClient();
    this.mutex = mutex;

    this.peerManager.addEventListener(EventType.ICE, this.sendIceCandidate);

    this.socketClient.addEventListener(EventType.NEW_TX, this.handleNewTx);
    this.socketClient.addEventListener(EventType.OFFER, this.acceptOffer);
    this.socketClient.addEventListener(EventType.ANSWER, this.acceptAnswer);
  }

  public broadcastChat(msg: string) {
    this.peerManager.broadcastChat(msg);
  }

  public sendChat(nickname: string, msg: string) {
    this.peerManager.sendChat(nickname, msg);
  }

  public broadcastNewBlock(block: Block) {
    this.mutex.runExclusive(() => {
      this.peerManager.broadcastBlock(block);
    });
  }

  public cloneBlockchain() {
    this.mutex.runExclusive(async () => {
      await this.cloneBlockchain();
    });
  }

  private handleNewTx(e: Event) {
    this.mutex.runExclusive(async () => {
      const { detail: candidate } = e as CustomEvent<TxCandidate>;

      const tx = await createTx(candidate).catch((e) => {
        console.error(e);
        return null;
      });

      if (tx != null) {
        this.peerManager.broadcastTx(tx);
      }

      this.socketClient.dispatchEvent(
        new CustomEvent<Transaction | null>(EventType.TX_CREATED, {
          detail: tx,
        }),
      );
    });
  }

  private sendIceCandidate(e: Event) {
    const {
      detail: { data: ice, nickname },
    } = e as CustomEvent<PeerEvent<RTCIceCandidate>>;

    this.socketClient.sendIce(nickname, ice);
  }

  public async sendOffer() {
    const offer = await this.peerManager.makeOffer();
    this.socketClient.sendOffer(offer);
  }

  private acceptAnswer(e: Event): Promise<void> {
    const {
      detail: { data: answer, nickname },
    } = e as CustomEvent<PeerEvent<RTCSessionDescription>>;

    return this.peerManager.acceptAnswer(nickname, answer);
  }

  private acceptOffer(e: Event): Promise<void> {
    const {
      detail: { data: offer, nickname },
    } = e as CustomEvent<PeerEvent<RTCSessionDescription>>;

    return this.peerManager.acceptOffer(nickname, offer).then((answer) => {
      this.socketClient.sendAnswer(nickname, answer);
    });
  }
}
