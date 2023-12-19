import { Mutex } from "async-mutex";
import { Channel, DBManager, ObjectStore, PeerStorage } from "../misc";
import { ChatPayload, EventType, IDEvent, PeerEvent } from "./event";
import { NetworkListener } from "./networkListener";

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
  {
    urls: ["turn:ec2-13-124-100-186.ap-northeast-2.compute.amazonaws.com:3478"],
    username: "oneee",
    credential: "only",
  },
];

type CloneUnit = {
  kind: ObjectStore;
  data: {
    key: string;
    value: any;
  };
};

export class PeerManager {
  private initialOffer: RTCSessionDescription | undefined;

  constructor(
    private readonly mutex: Mutex,
    private readonly dbManager: DBManager,
    private readonly peerStorage: PeerStorage,
    private readonly networkListener: NetworkListener,
  ) {
    this.initialOffer = undefined;

    this.networkListener.attachListener(EventType.RECEIVE_ICE, this.addIceCandidate.bind(this));
    this.networkListener.attachListener(EventType.RECEIVE_OFFER, this.acceptOffer.bind(this));
    this.networkListener.attachListener(EventType.RECEIVE_ANSWER, this.acceptAnswer.bind(this));
  }

  public broadcastChat(msg: string) {
    this.peerStorage.iterate((peer) => {
      const channel = peer.datachannels.get(Channel.OPEN_CHAT)!;
      channel.send(msg);
    });
  }

  public sendChat(nickname: string, msg: string) {
    const peer = this.peerStorage.get(nickname);
    if (peer === undefined) return;

    const channel = peer.datachannels.get(Channel.OPEN_CHAT)!;
    channel.send(msg);
  }

  public cloneBlockchain(): Promise<void> {
    const arr = this.peerStorage.all();
    const peer = arr[Math.floor(Math.random() * arr.length)];

    const chan = peer.datachannels.get(Channel.CLONE)!;
    chan.send("request");

    return new Promise((resolve) => {
      this.networkListener.dispatch(EventType.RECEIVE_BLOCKCHAIN, peer.nickname);

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
        if (data.key === "00") return;
        await this.dbManager.insert(storage, data.key, data.value);
      };
    });
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
    this.peerStorage.iterate((peer) => {
      const chan = peer.datachannels.get(Channel.BROADCAST_TX)!;
      chan.send(jsonTx);
    });
  }

  public broadcastBlock(block: Block) {
    const jsonBlock = JSON.stringify(block);
    this.peerStorage.iterate((peer) => {
      const chan = peer.datachannels.get(Channel.BROADCAST_BLOCK)!;
      chan.send(jsonBlock);
    });
  }

  public async acceptAnswer({ data: answer, nickname }: PeerEvent<RTCSessionDescription>) {
    const connection = new RTCPeerConnection({ iceServers });

    await connection.setLocalDescription(this.initialOffer);
    await connection.setRemoteDescription(answer);

    const datachannels = new Map<Channel, RTCDataChannel>();
    connection.ondatachannel = ({ channel }: RTCDataChannelEvent) => {
      this.attatchListener(nickname, channel);
      datachannels.set(channel.label as Channel, channel);
    };

    this.initPeerListener(nickname, connection);

    this.peerStorage.put({
      ip: null,
      nickname,
      connection,
      datachannels,
    });

    this.networkListener.dispatch(EventType.PEER_CONNECTED, nickname);
  }

  private async acceptOffer({ data: offer, nickname }: PeerEvent<RTCSessionDescription>) {
    const connection = new RTCPeerConnection({ iceServers });

    await connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

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

    this.peerStorage.put({
      ip: null,
      nickname,
      connection,
      datachannels,
    });

    this.networkListener.dispatch(EventType.PEER_CONNECTED, nickname);

    const msg: PeerEvent<RTCSessionDescription> = { data: connection.localDescription!, nickname };
    this.networkListener.dispatch(EventType.SEND_ANSWER, msg);
  }

  private addIceCandidate(event: PeerEvent<RTCIceCandidate>) {
    const peer = this.peerStorage.get(event.nickname)!;
    peer.connection.addIceCandidate(event.data).then(() => {
      peer.ip = event.data.address;
    });
  }

  private initPeerListener(nickname: string, conn: RTCPeerConnection) {
    conn.onicecandidate = (ice: RTCPeerConnectionIceEvent) => {
      const event: PeerEvent<RTCIceCandidate> = { data: ice.candidate!, nickname };
      this.networkListener.dispatch(EventType.SEND_ICE, event);
    };

    conn.onsignalingstatechange = () => {
      if (conn.signalingState === "closed") {
        this.networkListener.dispatch(EventType.PEER_DISCONNECTED, nickname);
        this.peerStorage.delete(nickname);
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
        this.dbManager
          .insertBroadcastedBlock(block)
          .then(() => {
            this.networkListener.dispatch(EventType.BLOCK_CREATED, block);
          })
          .catch((e) => {
            console.log(e);
            const peer = this.peerStorage.get(nickname)!;
            peer.connection.close();
          });
      });
    };
  }

  private handleBroadcastTx(nickname: string, _: RTCDataChannel) {
    return (event: MessageEvent<string>) => {
      this.mutex.runExclusive(() => {
        const tx = JSON.parse(event.data) as Transaction;
        this.dbManager
          .insertBroadcastedTx(tx)
          .then(() => {
            const msg: IDEvent<Transaction | null> = { data: tx, id: "" };
            this.networkListener.dispatch(EventType.TX_CREATED, msg);
          })
          .catch((e) => {
            console.log(e);
            const peer = this.peerStorage.get(nickname)!;
            peer.connection.close();
          });
      });
    };
  }

  private handleOpenChat(nickname: string, _: RTCDataChannel) {
    return (event: MessageEvent<string>) => {
      const payload: PeerEvent<ChatPayload> = {
        data: { data: event.data, timestamp: new Date() },
        nickname,
      };
      this.networkListener.dispatch(EventType.CHAT, payload);
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

  private async transferBlockchain(channel: RTCDataChannel) {
    this.networkListener.dispatch(EventType.SEND_BLOCKCHAIN, undefined);

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
}
