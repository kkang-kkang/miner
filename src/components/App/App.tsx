import { useEffect, useState } from "react";
import {
  initializeNode,
  networkBrowser,
  networkListener,
  networkManager,
} from "../LoadWasm/dependency";
import { PeerInfo } from "../LoadWasm/network";
import { ChatPayload, EventType, IDEvent, PeerEvent } from "../LoadWasm/network/event";
import "./App.css";

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [mempoolTxs, setMempoolTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    let nickname: string | null;
    do {
      nickname = prompt("nickname");
    } while (nickname == null || nickname === "");

    initializeNode(nickname, prompt("token")).then(() => {
      networkListener.attachListener(EventType.PEER_CONNECTED, (nickname: string) => {
        console.log(nickname, "connected");
        networkBrowser.fetchPeer(nickname).then((peer) => {
          setPeers([...peers, peer]);
        });
      });

      networkListener.attachListener(EventType.PEER_DISCONNECTED, (nickname: string) => {
        console.log(nickname, "disconnected");
        setPeers(peers.filter((peer) => peer.sid !== nickname));
      });

      networkListener.attachListener(EventType.SEND_BLOCKCHAIN, () => {
        console.log("sending blockchain");
      });

      networkListener.attachListener(EventType.RECEIVE_BLOCKCHAIN, () => {
        console.log("receiving blockchain");
      });

      networkListener.attachListener(EventType.CHAT, (event: PeerEvent<ChatPayload>) => {
        const {
          nickname,
          data: { data, timestamp },
        } = event;
        console.log(timestamp.toISOString(), `${nickname}: ${data}`);
      });

      networkListener.attachListener(EventType.NEW_TX, (event: IDEvent<TxCandidate>) => {
        const { data: tx, id } = event;
        console.log(`new tx requested: ${id}`, tx);
      });

      networkListener.attachListener(EventType.TX_CREATED, (event: IDEvent<Transaction>) => {
        const { data: tx, id } = event;
        console.log(`new tx created: ${id}`, tx);
        networkBrowser.fetchMempool().then(setMempoolTxs);
      });

      networkListener.attachListener(EventType.BLOCK_CREATED, (block: Block) => {
        console.log("new block", block);
        networkBrowser.fetchMempool().then(setMempoolTxs);
      });
      setIsLoading(false);
    });
  }, []);

  return isLoading ? (
    <div>loading...</div>
  ) : (
    <div className="App">
      <input
        placeholder=""
        onChange={(event) => {
          setMessage(event.target.value);
        }}
      ></input>
      <button
        onClick={() => {
          networkManager.broadcastChat(message);
        }}
      >
        hi submit your message
      </button>
      <div>
        <button
          onClick={() => {
            networkManager.cloneBlockchain();
          }}
        >
          clone blockchain
        </button>
      </div>
      <div>
        <div>
          <div>
            haha peers i guess
            <div />
            {peers.map((peer) => (
              <>
                <span>{peer.ip} </span>
                <span>{peer.location?.city}</span>
                <span>{peer.nickname} </span>
                <span>{peer.sid}</span>
              </>
            ))}
          </div>
          <div>
            mempool txs i guess
            <div />
            {mempoolTxs.map((tx) => (
              <>
                <span>{tx.hash}</span>
                <div>
                  {tx.inputs.map((input) => (
                    <>
                      <span>{input.outIdx}</span>
                      <span>{input.sig}</span>
                      <span>{input.txHash}</span>
                    </>
                  ))}
                </div>
                <div>
                  {tx.outputs.map((output) => (
                    <>
                      <span>{output.addr}</span>
                      <span>{output.amount}</span>
                    </>
                  ))}
                </div>
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
