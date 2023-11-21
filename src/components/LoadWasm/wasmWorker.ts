import { Message } from "./messages/messageTypes";
import "./wasmTypes.d.ts";
import "./wasm_exec.js";

async function initWasmWorker() {
  const goWasm = new self.Go();
  const result = await WebAssembly.instantiateStreaming(
    fetch("/main.wasm"),
    goWasm.importObject,
  );
  goWasm.run(result.instance);

  onmessage = (_: MessageEvent<Message<unknown>>): Promise<void> | void => {
    // switch (event.data.type) {
    // }
  };

  postMessage({});
}

initWasmWorker();
