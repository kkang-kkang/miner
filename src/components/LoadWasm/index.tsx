import "./LoadWasm.css";
import React, { useEffect, useState } from "react";
import { handleOutput } from "./messages/output.js";
import { CallbackEvent } from "./event";

function loadWasm(): Promise<void> {
  return new Promise<void>((resolve) => {
    const worker = new Worker(new URL("./wasmWorker.ts", import.meta.url));

    window.addEventListener("invoke", (event: Event | CallbackEvent) => {
      (event as CallbackEvent).callback(worker);
    });

    worker.onmessage = () => {
      worker.onmessage = handleOutput;
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
