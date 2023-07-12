import "./LoadWasm.css";

import React, { useEffect, useState } from "react";

function loadWasm(): Promise<void> {
  return new Promise<void>((resolve) => {
    const worker = new Worker(new URL("./wasmWorker.ts", import.meta.url));
    worker.onmessage = () => {
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
