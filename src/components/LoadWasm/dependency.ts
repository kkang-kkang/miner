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

const mutex = new Mutex();
const peerStorage = new PeerStorage();
const dbManager = new DBManager();
export const networkListener = new NetworkListener();
let peerManager: PeerManager;
let socketClient: SocketClient;
export let networkBrowser: NetworkBrowser;
export let networkManager: NetworkManager;

export async function initializeNode(nickname: string, token: string | null) {
  socketClient = new SocketClient(networkListener, dbManager);
  networkBrowser = new NetworkBrowser(dbManager, peerStorage, token);
  peerManager = new PeerManager(mutex, dbManager, peerStorage, networkListener);
  networkManager = new NetworkManager(networkListener, peerManager, socketClient, mutex);

  await socketClient.connect(nickname, { host: "", port: 1 }).catch(console.error);
  await networkManager.sendOffer();
}