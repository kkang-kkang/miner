import React, { useEffect, useState } from "react";
import "./LoadWasm.css";
import { initializeNode } from "./dependency";
import { CallbackEvent } from "./event";

function loadWasm(): Promise<void> {
  return new Promise<void>((resolve) => {
    const worker = new Worker(new URL("wasmWorker.ts", import.meta.url));

    worker.onerror = (ev) => {
      console.error(ev);
    };
    worker.onmessageerror = (ev) => {
      console.error(ev);
    };

    window.addEventListener("invoke", async (event) => {
      const callbackEvent = event as CallbackEvent;
      await callbackEvent.callback(worker);
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
      });
  }, []);

  if (isLoading) {
    return <div className="LoadWasm">loading WebAssembly...</div>;
  } else {
    return <React.Fragment>{props.children}</React.Fragment>;
  }
};
