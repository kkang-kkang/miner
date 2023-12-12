import { DBManager, ObjectStore } from "../misc";
import { Peer, PeerStorage } from "../misc/peerStorage";

type IPInfo = {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
};

export type PeerInfo = {
  nickname: string;
  ip: string;

  location:
    | {
        country: string;
        countryFlagURL: string;
        timezone: string;
        city: string;
        region: string;
        org: string;
      }
    | undefined;
};

export class NetworkBrowser {
  private readonly token: string;

  constructor(
    private readonly dbManager: DBManager,
    private readonly peerStorage: PeerStorage,
    token: string,
  ) {
    this.token = token;
  }

  public async fetchMempool(): Promise<Transaction[]> {
    const txs: Transaction[] = [];
    await this.dbManager.iterateAll(ObjectStore.MEMPOOL, (_: string, value: any) => {
      const tx = value as Transaction;
      txs.push(tx);
    });

    return txs;
  }

  public fetchBlockHeadHash(): Promise<string> {
    return this.dbManager.getHeadHash();
  }

  public fetchBlockCount(): Promise<number> {
    return this.dbManager.getBlockCount();
  }

  public async fetchBlock(hash: string): Promise<Block | null> {
    const body = await this.dbManager.get(ObjectStore.BLOCK_BODIES, hash);
    const header = await this.dbManager.get(ObjectStore.BLOCK_HEADERS, hash);
    if (header === undefined || body === undefined) {
      return null;
    }

    return {
      header: header as BlockHeader,
      body: body as BlockBody,
    };
  }

  public async fetchTransaction(hash: string): Promise<Transaction | null> {
    const tx = await this.dbManager.get(ObjectStore.TRANSACTION, hash);
    return tx ? (tx as Transaction) : null;
  }

  public async fetchPeers(): Promise<PeerInfo[]> {
    const peers = this.peerStorage.all();
    return await Promise.all(peers.map((peer) => this.fetchPeerInfo(peer)));
  }

  public fetchPeer(nickname: string): Promise<PeerInfo> {
    const peer = this.peerStorage.get(nickname)!;
    return this.fetchPeerInfo(peer);
  }

  private async fetchPeerInfo(peer: Peer): Promise<PeerInfo> {
    const info: PeerInfo = {
      nickname: peer.nickname,
      ip: peer.ip ?? "N/A",
      location: undefined,
    };

    if (peer.ip != null) {
      const response = await fetch(`https://ipinfo.io/${peer.ip}/json?token=${this.token}`);
      if (!response.ok) {
        return info;
      }
      const data = await response.json().then((data) => data as IPInfo);

      info.location = {
        timezone: data.timezone,
        country: data.country,
        region: data.region,
        city: data.city,
        org: data.org,
        countryFlagURL: `https://flagsapi.com/${data.country}/flat/64.png`,
      };
    }

    return info;
  }
}
