import { Mutex } from "async-mutex";
import { createTx } from "../event/dispatchers";
import { EventType, IDEvent, PeerEvent } from "./event";
import { NetworkListener } from "./networkListener";
import { PeerManager } from "./peerManager";
import { SocketClient } from "./socketClient";

export class NetworkManager {
  constructor(
    private readonly networkListener: NetworkListener,
    private readonly peerManager: PeerManager,
    private readonly socketClient: SocketClient,
    private readonly mutex: Mutex,
  ) {
    this.networkListener.attachListener(EventType.ICE, this.sendIceCandidate);
    this.networkListener.attachListener(EventType.NEW_TX, this.handleNewTx);
    this.networkListener.attachListener(EventType.OFFER, this.acceptOffer);
    this.networkListener.attachListener(EventType.ANSWER, this.acceptAnswer);
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

  private handleNewTx({ data: candidate, id }: IDEvent<TxCandidate>) {
    this.mutex.runExclusive(async () => {
      const tx = await createTx(candidate).catch((e) => {
        console.error(e);
        return null;
      });

      if (tx != null) {
        this.peerManager.broadcastTx(tx);
      }

      const msg: IDEvent<Transaction | null> = { data: tx, id };
      this.networkListener.dispatch(EventType.TX_CREATED, msg);
    });
  }

  private sendIceCandidate(e: PeerEvent<RTCIceCandidate>) {
    const { data: ice, nickname } = e;

    this.socketClient.sendIce(nickname, ice);
  }

  public async sendOffer() {
    const offer = await this.peerManager.makeOffer();
    this.socketClient.sendOffer(offer);
  }

  private acceptAnswer(e: PeerEvent<RTCSessionDescription>): Promise<void> {
    const { data: answer, nickname } = e;

    return this.peerManager.acceptAnswer(nickname, answer);
  }

  private acceptOffer(e: PeerEvent<RTCSessionDescription>): Promise<void> {
    const { data: offer, nickname } = e;

    return this.peerManager.acceptOffer(nickname, offer).then((answer) => {
      this.socketClient.sendAnswer(nickname, answer);
    });
  }
}
