import { Mutex } from "async-mutex";
import { createGenesis } from "./event/dispatchers";
import { DBManager, PeerStorage } from "./misc";
import {
  NetworkBrowser,
  NetworkListener,
  NetworkManager,
  PeerManager,
  SocketClient,
} from "./network";

/* eslint import/no-mutable-exports: 0 */

const gateway = {
  host: "127.0.0.1",
  port: 8000,
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
  networkBrowser = new NetworkBrowser(dbManager, peerStorage, token);
  peerManager = new PeerManager(mutex, dbManager, peerStorage, networkListener);
  networkManager = new NetworkManager(networkListener, peerManager, mutex);

  await createGenesis();
  await socketClient
    .connect(nickname, {
      host: gateway.host,
      port: gateway.port,
      scheme: "ws",
      path: "/ws/socket.io",
    })
    .catch(console.error);
}
