import { Mutex } from "async-mutex";
import { createTx } from "../event/dispatchers";
import { EventType, IDEvent } from "./event";
import { NetworkListener } from "./networkListener";
import { PeerManager } from "./peerManager";

export class NetworkManager {
  constructor(
    private readonly networkListener: NetworkListener,
    private readonly peerManager: PeerManager,
    private readonly mutex: Mutex,
  ) {
    this.networkListener.attachListener(EventType.NEW_TX, this.handleNewTx.bind(this));
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
      this.networkListener.dispatch(EventType.BLOCK_CREATED, block);
    });
  }

  public cloneBlockchain() {
    this.mutex.runExclusive(async () => {
      await this.peerManager.cloneBlockchain();
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
}
