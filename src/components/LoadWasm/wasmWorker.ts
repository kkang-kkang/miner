import { Message, MessageTypes } from "./messages/messageTypes";
import "./wasmTypes.d.ts";
import "./wasm_exec.js";

async function initWasmWorker() {
  const goWasm = new self.Go();
  const result = await WebAssembly.instantiateStreaming(
    fetch("/main.wasm"),
    goWasm.importObject,
  );
  goWasm.run(result.instance);

  onmessage = async (event: MessageEvent<Message<unknown>>): Promise<void> => {
    switch (event.data.type) {
      case MessageTypes.CREATE_TX: {
        await self.createNewTx();
        postMessage(MessageTypes.TX_CREATED, {});
      }
    }
  };

  postMessage({});
}

initWasmWorker();
