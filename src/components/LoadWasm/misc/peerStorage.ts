import { NetworkListener } from "../network";
import { EventType, PeerEvent } from "../network/event";

export enum Channel {
  BROADCAST_TX = "broadcast-tx",
  BROADCAST_BLOCK = "broadcast-block",
  OPEN_CHAT = "open-chat",
  CLONE = "clone",
}

export type Peer = {
  nickname: string;
  ip: string | null;
  connection: RTCPeerConnection;
  datachannels: Map<Channel, RTCDataChannel>;
  connected: boolean;
  iceQueue: RTCIceCandidate[];
};

export class PeerStorage {
  private readonly peers: Map<string, Peer>;
  constructor(private readonly networkListener: NetworkListener) {
    this.peers = new Map<string, Peer>();

    this.networkListener.attachListener(EventType.PEER_CONNECTED, (nickname: string) => {
      const peer = this.get(nickname)!;
      peer.iceQueue.forEach((candidate) => {
        const event: PeerEvent<RTCIceCandidate> = { data: candidate, nickname };
        this.networkListener.dispatch(EventType.SEND_ICE, event);
      });
      peer.iceQueue = [];
    });
  }

  public iterate(each: (peer: Peer) => void) {
    this.peers.forEach(each);
  }

  public get(nickname: string): Peer | undefined {
    return this.peers.get(nickname);
  }

  public all(): Peer[] {
    return Array.from(this.peers.values());
  }

  public put(peer: Peer) {
    this.peers.set(peer.nickname, peer);
  }

  public delete(nickname: string) {
    this.peers.delete(nickname);
  }
}
