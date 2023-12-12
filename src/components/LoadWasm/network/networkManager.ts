import { Mutex } from "async-mutex";
import { createTx } from "../event/dispatchers";
import { EventType, IDEvent } from "./event";
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
    this.networkListener.attachListener(EventType.NEW_TX, this.handleNewTx);
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

  public async sendOffer() {
    const offer = await this.peerManager.makeOffer();
    this.socketClient.sendOffer(offer);
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
}
