import React, { useEffect, useState } from "react";
import "./LoadWasm.css";
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
      callbackEvent.onCallbackExecuted(worker);
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
    const load = async () => {
      await loadWasm();
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) {
    return <div className="LoadWasm">loading WebAssembly...</div>;
  } else {
    return <React.Fragment>{props.children}</React.Fragment>;
  }
};
