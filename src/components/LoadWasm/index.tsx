import React, { useEffect, useState } from "react";
import "./LoadWasm.css";
import { initializeNode, networkListener } from "./dependency";
import { CallbackEvent } from "./event";
import { ChatPayload, EventType, IDEvent, PeerEvent } from "./network/event";

function loadWasm(): Promise<void> {
  return new Promise<void>((resolve) => {
    const worker = new Worker(new URL("wasmWorker.ts", import.meta.url));

    worker.onerror = (ev) => {
      console.error(ev);
    };
    worker.onmessageerror = (ev) => {
      console.error(ev);
    };

    window.addEventListener("invoke", (event) => {
      (event as CallbackEvent).callback(worker);
    });

    worker.onmessage = () => {
      worker.onmessage = () => {};
      resolve();
    };
  });
}

export const LoadWasm: React.FC<React.PropsWithChildren<{}>> = (props) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWasm()
      .then(() => setIsLoading(false))
      .then(async () => {
        let nickname: string | null;
        do {
          nickname = prompt("nickname");
        } while (nickname == null);

        await initializeNode(nickname, prompt("token"));
      })
      .then(() => {
        networkListener.attachListener(EventType.PEER_CONNECTED, (nickname: string) => {
          console.log(nickname, "connected");
        });
        networkListener.attachListener(EventType.PEER_DISCONNECTED, (nickname: string) => {
          console.log(nickname, "disconnected");
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
        networkListener.attachListener(EventType.TX_CREATED, (event: IDEvent<TxCandidate>) => {
          const { data: tx, id } = event;
          console.log(`new tx created: ${id}`, tx);
        });
        networkListener.attachListener(EventType.BLOCK_CREATED, (block: Block) => {
          console.log("new block", block);
        });
      });
  }, []);

  if (isLoading) {
    return <div className="LoadWasm">loading WebAssembly...</div>;
  } else {
    return <React.Fragment>{props.children}</React.Fragment>;
  }
};
