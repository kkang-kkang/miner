import React, { useEffect, useState } from "react";
import "./LoadWasm.css";
import { CallbackEvent } from "./event";
import { createBlock, createTx } from "./event/dispatchers";

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
        const tx = await createTx({
          amount: 0,
          dstAddress: "ffffff",
          privateKey: "17c9cfe25b1f2262e8ec2d8b65f502ef946d5ba4bc12bbd622755340bd9b3638",
        });
        await createBlock({
          transactionHashes: [tx.hash],
        });
      });
  }, []);

  if (isLoading) {
    return <div className="LoadWasm">loading WebAssembly...</div>;
  } else {
    return <React.Fragment>{props.children}</React.Fragment>;
  }
};
