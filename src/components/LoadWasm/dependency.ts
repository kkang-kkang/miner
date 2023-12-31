import { Mutex } from "async-mutex";
import { DBManager, PeerStorage } from "./misc";
import {
  NetworkBrowser,
  NetworkListener,
  NetworkManager,
  PeerManager,
  SocketClient,
} from "./network";

/* eslint import/no-mutable-exports: 0 */

export const gateway = {
  host: "gateway.kkangkkang.store",
  port: 443,
};

const mutex = new Mutex();
export const networkListener = new NetworkListener();
const dbManager = new DBManager();
const peerStorage = new PeerStorage(networkListener);
let peerManager: PeerManager;
let socketClient: SocketClient;
export let networkBrowser: NetworkBrowser;
export let networkManager: NetworkManager;

export async function initializeNode(nickname: string, token: string | null) {
  socketClient = new SocketClient(networkListener, dbManager);
  networkBrowser = new NetworkBrowser(dbManager, peerStorage, socketClient, token);
  peerManager = new PeerManager(mutex, dbManager, peerStorage, networkListener);
  networkManager = new NetworkManager(networkListener, peerManager, mutex);

  await socketClient
    .connect(nickname, {
      host: gateway.host,
      port: gateway.port,
      scheme: "wss",
      path: "/ws/socket.io",
    })
    .catch(console.error);
}
