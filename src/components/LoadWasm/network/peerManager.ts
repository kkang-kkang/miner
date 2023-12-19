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
console.log(iceServers);

type CloneUnit = {
  kind: ObjectStore;
  data: {
    key: string;
    value: any;
  };
};

export class PeerManager {
  constructor(
    private readonly mutex: Mutex,
    private readonly dbManager: DBManager,
    private readonly peerStorage: PeerStorage,
    private readonly networkListener: NetworkListener,
  ) {
    this.networkListener.attachListener(EventType.RECEIVE_ICE, this.addIceCandidate.bind(this));
    this.networkListener.attachListener(EventType.RECEIVE_OFFER, this.acceptOffer.bind(this));
    this.networkListener.attachListener(EventType.RECEIVE_ANSWER, this.acceptAnswer.bind(this));
    this.networkListener.attachListener(EventType.GOT_ANSWER_ACK, this.acceptAnswerAck.bind(this));
    this.networkListener.attachListener(EventType.NEW_PEER, this.acceptNewPeer.bind(this));
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

  private acceptAnswerAck({ nickname }: PeerEvent<string>) {
    this.networkListener.dispatch(EventType.PEER_CONNECTED, nickname);
  }

  private async acceptNewPeer({ nickname }: PeerEvent<string>) {
    console.log("new peer!!");
    const connection = new RTCPeerConnection({ iceServers });

    const datachannels = new Map<Channel, RTCDataChannel>();
    this.peerStorage.put({
      connected: false,
      ip: null,
      iceQueue: [],
      nickname,
      connection,
      datachannels,
    });

    this.initPeerListener(nickname, connection);

    const channels = [
      connection.createDataChannel(Channel.BROADCAST_BLOCK, { negotiated: true, id: 0 }),
      connection.createDataChannel(Channel.BROADCAST_TX, { negotiated: true, id: 1 }),
      connection.createDataChannel(Channel.CLONE, { negotiated: true, id: 2 }),
      connection.createDataChannel(Channel.OPEN_CHAT, { negotiated: true, id: 3 }),
    ];
    channels.forEach((channel) => {
      this.attatchListener(nickname, channel);
      datachannels.set(channel.label as Channel, channel);
    });

    await connection.setLocalDescription(await connection.createOffer());

    const msg: PeerEvent<RTCSessionDescription> = { nickname, data: connection.localDescription! };
    this.networkListener.dispatch(EventType.SEND_OFFER, msg);
  }

  private async acceptAnswer({ data: answer, nickname }: PeerEvent<RTCSessionDescription>) {
    const peer = this.peerStorage.get(nickname)!;

    await peer.connection.setRemoteDescription(answer);

    const msg: PeerEvent<string> = { nickname, data: "" };
    this.networkListener.dispatch(EventType.PEER_CONNECTED, nickname);
    setTimeout(() => {
      this.networkListener.dispatch(EventType.SEND_ANSWER_ACK, msg);
    }, 300);
  }

  private async acceptOffer({ data: offer, nickname }: PeerEvent<RTCSessionDescription>) {
    const connection = new RTCPeerConnection({ iceServers });

    const datachannels = new Map<Channel, RTCDataChannel>();
    this.peerStorage.put({
      connected: false,
      ip: null,
      iceQueue: [],
      nickname,
      connection,
      datachannels,
    });
    this.initPeerListener(nickname, connection);

    const channels = [
      connection.createDataChannel(Channel.BROADCAST_BLOCK, { negotiated: true, id: 0 }),
      connection.createDataChannel(Channel.BROADCAST_TX, { negotiated: true, id: 1 }),
      connection.createDataChannel(Channel.CLONE, { negotiated: true, id: 2 }),
      connection.createDataChannel(Channel.OPEN_CHAT, { negotiated: true, id: 3 }),
    ];
    channels.forEach((channel) => {
      this.attatchListener(nickname, channel);
      datachannels.set(channel.label as Channel, channel);
    });

    await connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

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
    const peer = this.peerStorage.get(nickname)!;
    conn.onicecandidate = (ice: RTCPeerConnectionIceEvent) => {
      if (ice.candidate) {
        if (peer.connected) {
          const event: PeerEvent<RTCIceCandidate> = { data: ice.candidate, nickname };
          this.networkListener.dispatch(EventType.SEND_ICE, event);
        } else {
          peer.iceQueue.push(ice.candidate);
        }
      }
    };

    conn.onconnectionstatechange = () => {
      console.log(conn.connectionState);
      if (conn.connectionState === "closed") {
        this.networkListener.dispatch(EventType.PEER_DISCONNECTED, nickname);
        this.peerStorage.delete(nickname);
      }
    };

    conn.onicecandidateerror = (event: Event) => {
      console.warn(event as RTCPeerConnectionIceErrorEvent);
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
