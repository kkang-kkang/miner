import { Mutex } from "async-mutex";
import { insertBroadcastedBlock, insertBroadcastedTx } from "../event/dispatchers";
import { DBManager, ObjectStore } from "../misc";
import { EventType, PeerEvent } from "./event";

enum Channel {
  BROADCAST_TX = "broadcast-tx",
  BROADCAST_BLOCK = "broadcast-block",
  OPEN_CHAT = "open-chat",
  CLONE = "clone",
}

const iceServers: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
      "stun:stun3.l.google.com:19302",
      "stun:stun4.l.google.com:19302",
    ],
  },
];

type CloneUnit = {
  kind: ObjectStore;
  data: {
    key: string;
    value: any;
  };
};

type ChatPayload = {
  nickname: string;
  data: string;
  timestamp: Date;
};

type Peer = {
  nickname: string;
  ip: string | null;
  connection: RTCPeerConnection;
  datachannels: Map<Channel, RTCDataChannel>;
};

export class PeerManager extends EventTarget {
  private peers: Map<string, Peer>;
  private initialOffer: RTCSessionDescription | undefined;
  private dbManager: DBManager;
  private readonly mutex: Mutex;

  constructor(mutex: Mutex) {
    super();
    this.peers = new Map<string, Peer>();
    this.dbManager = new DBManager();
    this.mutex = mutex;
  }

  public broadcastChat(msg: string) {
    this.peers.forEach((peer) => {
      const channel = peer.datachannels.get(Channel.OPEN_CHAT)!;
      channel.send(msg);
    });
  }

  public sendChat(nickname: string, msg: string) {
    const peer = this.peers.get(nickname);
    if (peer === undefined) return;

    const channel = peer.datachannels.get(Channel.OPEN_CHAT)!;
    channel.send(msg);
  }

  public cloneBlockchain(): Promise<void> {
    const peerArray = Array.from(this.peers.values());
    const peer = peerArray[Math.floor(Math.random() * peerArray.length)];

    const chan = peer.datachannels.get(Channel.CLONE)!;
    chan.send("request");

    return new Promise((resolve) => {
      chan.onmessage = async (event: MessageEvent<string>) => {
        if (event.data === "done") {
          chan.onmessage = this.handleClone(chan);
          return resolve();
        }
        if (event.data === "reject") {
          chan.onmessage = this.handleClone(chan);
          await this.cloneBlockchain();
          return resolve();
        }

        const { data, kind: storage } = JSON.parse(event.data) as CloneUnit;
        await this.dbManager.insert(storage, data.key, data.value);
      };
    });
  }

  public async transferBlockchain(channel: RTCDataChannel) {
    const transfer = (objStore: ObjectStore) => {
      return this.dbManager.iterateAll(objStore, (key: string, value: any) => {
        const unit: CloneUnit = { kind: objStore, data: { key, value } };
        channel.send(JSON.stringify(unit));
      });
    };

    await Promise.all([
      transfer(ObjectStore.BLOCK_BODIES),
      transfer(ObjectStore.BLOCK_HEADERS),
      transfer(ObjectStore.TRANSACTION),
      transfer(ObjectStore.MEMPOOL),
    ]);

    channel.send("done");
  }

  /**
   * this should be called right after the local peer is initialized
   */
  public async makeOffer(): Promise<RTCSessionDescription> {
    const initConn = new RTCPeerConnection({ iceServers });
    const offer = await initConn.createOffer();
    await initConn.setLocalDescription(offer);
    this.initialOffer = initConn.localDescription!;
    return this.initialOffer;
  }

  public broadcastTx(tx: Transaction) {
    const jsonTx = JSON.stringify(tx);
    this.peers.forEach((peer) => {
      const chan = peer.datachannels.get(Channel.BROADCAST_TX)!;
      chan.send(jsonTx);
    });
  }

  public broadcastBlock(block: Block) {
    const jsonBlock = JSON.stringify(block);
    this.peers.forEach((peer) => {
      const chan = peer.datachannels.get(Channel.BROADCAST_BLOCK)!;
      chan.send(jsonBlock);
    });
  }

  /**
   *
   * @param nickname incoming peer's nickname
   * @param answer incoming peer's description
   */
  public async acceptAnswer(nickname: string, answer: RTCSessionDescription): Promise<void> {
    const connection = new RTCPeerConnection({ iceServers });

    await connection.setLocalDescription(this.initialOffer);
    await connection.setRemoteDescription(answer);

    const datachannels = new Map<Channel, RTCDataChannel>();
    connection.ondatachannel = ({ channel }: RTCDataChannelEvent) => {
      this.attatchListener(nickname, channel);
      datachannels.set(channel.label as Channel, channel);
    };

    this.initPeerListener(nickname, connection);

    this.peers.set(nickname, {
      ip: null,
      nickname,
      connection,
      datachannels,
    });
  }

  /**
   *
   * @param nickname incoming peer's nickname
   * @param offer incoming peer's description
   * @returns answer to send to incoming peer
   */
  public async acceptOffer(
    nickname: string,
    offer: RTCSessionDescription,
  ): Promise<RTCSessionDescription> {
    const connection = new RTCPeerConnection({ iceServers });

    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    await connection.setRemoteDescription(offer);

    const datachannels = new Map<Channel, RTCDataChannel>();

    const channels = [
      connection.createDataChannel(Channel.BROADCAST_BLOCK),
      connection.createDataChannel(Channel.BROADCAST_TX),
      connection.createDataChannel(Channel.CLONE),
      connection.createDataChannel(Channel.OPEN_CHAT),
    ];
    channels.forEach((channel) => {
      this.attatchListener(nickname, channel);
      datachannels.set(channel.label as Channel, channel);
    });

    this.initPeerListener(nickname, connection);

    this.peers.set(nickname, {
      ip: null,
      nickname,
      connection,
      datachannels,
    });

    return connection.localDescription!;
  }

  public addIceCandidate(nickname: string, _candidate: string) {
    const candidate = new RTCIceCandidate({ candidate: _candidate });
    const { connection } = this.peers.get(nickname)!;

    connection.addIceCandidate(candidate).then(() => {
      this.peers.get(nickname)!.ip = candidate.address;
    });
  }

  private initPeerListener(nickname: string, conn: RTCPeerConnection) {
    conn.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      this.dispatchEvent(
        new CustomEvent<PeerEvent<RTCIceCandidate>>(EventType.ICE, {
          detail: {
            nickname,
            data: event.candidate!,
          },
        }),
      );
    };

    conn.onsignalingstatechange = () => {
      if (conn.signalingState === "closed") {
        this.peers.delete(nickname);
      }
    };
  }

  private attatchListener(nickname: string, channel: RTCDataChannel) {
    switch (channel.label as Channel) {
      case Channel.BROADCAST_TX:
        channel.onmessage = this.handleBroadcastTx(nickname, channel);
        break;
      case Channel.BROADCAST_BLOCK:
        channel.onmessage = this.handleBroadcastBlock(nickname, channel);
        break;
      case Channel.OPEN_CHAT:
        channel.onmessage = this.handleOpenChat(nickname, channel);
        break;
      case Channel.CLONE:
        channel.onmessage = this.handleClone(channel);
        break;
    }
  }

  private handleBroadcastBlock(nickname: string, _: RTCDataChannel) {
    return (event: MessageEvent<string>) => {
      this.mutex.runExclusive(() => {
        const block = JSON.parse(event.data) as Block;
        insertBroadcastedBlock(block).catch((e) => {
          console.log(e);
          const peer = this.peers.get(nickname)!;
          peer.connection.close();
        });
      });
    };
  }

  private handleBroadcastTx(nickname: string, _: RTCDataChannel) {
    return (event: MessageEvent<string>) => {
      this.mutex.runExclusive(() => {
        const tx = JSON.parse(event.data) as Transaction;
        insertBroadcastedTx(tx).catch((e) => {
          console.log(e);
          const peer = this.peers.get(nickname)!;
          peer.connection.close();
        });
      });
    };
  }

  private handleOpenChat(nickname: string, _: RTCDataChannel) {
    return (event: MessageEvent<string>) => {
      const payload: ChatPayload = {
        nickname,
        data: event.data,
        timestamp: new Date(),
      };
      console.log(payload);
    };
  }

  private handleClone(channel: RTCDataChannel) {
    return (event: MessageEvent<string>) => {
      if (event.data === "request") {
        if (this.mutex.isLocked()) {
          channel.send("reject");
          return;
        }

        this.mutex.runExclusive(async () => {
          await this.transferBlockchain(channel);
        });
      }
    };
  }
}
