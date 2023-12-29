import { Message, MessageTypes } from "./messages/messageTypes";
import "./wasmTypes.d.ts";
import "./wasm_exec.js";

async function initWasmWorker() {
  const goWasm = new self.Go();
  const result = await WebAssembly.instantiateStreaming(fetch("/main.wasm"), goWasm.importObject);
  goWasm.run(result.instance);

  onmessage = async (event: MessageEvent<Message<unknown>>): Promise<void> => {
    try {
      switch (event.data.type) {
        case MessageTypes.CREATE_TX: {
          const val = await self.createNewTx(event.data.data as TxCandidate);
          postMessage(new Message(MessageTypes.TX_CREATED, val));
          break;
        }
        case MessageTypes.CREATE_BLOCK: {
          const val = await self.createBlock(event.data.data as BlockCandidate);
          postMessage(new Message(MessageTypes.BLOCK_CREATED, val));
          break;
        }
        case MessageTypes.INSERT_TX: {
          await self.insertBroadcastedTx(event.data.data as Transaction);
          postMessage(new Message(MessageTypes.TX_INSERTED, {}));
          break;
        }
        case MessageTypes.INSERT_BLOCK: {
          await self.insertBroadcastedBlock(event.data.data as Block);
          postMessage(new Message(MessageTypes.BLOCK_INSERTED, {}));
          break;
        }
        case MessageTypes.CREATE_KEY_PAIR: {
          const val = await self.createKeyPair();
          postMessage(new Message(MessageTypes.BLOCK_CREATED, val));
          break;
        }
        case MessageTypes.SET_MINER_ADDR: {
          await self.setMinerAddress(event.data.data as string);
          postMessage(new Message(MessageTypes.MINER_ADDR_SET, {}));
          break;
        }
        case MessageTypes.GET_HEAD_HASH: {
          const val = await self.getHeadHash();
          postMessage(new Message(MessageTypes.GOT_HEAD_HASH, val));
          break;
        }
        case MessageTypes.SET_HEAD_HASH: {
          await self.setHeadHash(event.data.data as string);
          postMessage(new Message(MessageTypes.HEAD_HASH_CHANGED, {}));
          break;
        }
        case MessageTypes.GET_BALANCE: {
          const val = await self.getBalance(event.data.data as string);
          postMessage(new Message(MessageTypes.GOT_BALANCE, val));
          break;
        }
      }
    } catch (e) {
      postMessage(new Message(MessageTypes.ERROR, e));
    }
  };

  await initGPU();

  postMessage({});
}

async function initGPU() {
  if (!navigator.gpu) {
    throw new Error("WebGPU not suppored :(");
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    throw new Error("No WebGPU adapter available :(");
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error("No Device available :(");
  }

  self.getDevice = () => {
    return device;
  };
}

initWasmWorker();
