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
        const val = await self.createNewTx(event.data.data as TxCandidate);
        postMessage(new Message(MessageTypes.TX_CREATED, val));
        break;
      }
      case MessageTypes.CREATE_BLOCK: {
        await self.createBlock(event.data.data as BlockCandidate);
        postMessage(new Message(MessageTypes.BLOCK_CREATED, {}));
        break;
      }
      case MessageTypes.INSERT_TX: {
        await self.insertBroadcastedTx(event.data.data as string);
        postMessage(new Message(MessageTypes.TX_INSERTED, {}));
        break;
      }
      case MessageTypes.INSERT_BLOCK: {
        await self.insertBroadcastedBlock(event.data.data as string);
        postMessage(new Message(MessageTypes.BLOCK_INSERTED, {}));
        break;
      }
    }
  };

  postMessage({});
}

initWasmWorker();
