import "./wasm_exec.js";
import "./wasmTypes.d.ts";
import { handleInput } from "./messages/input.js";

async function initWasmWorker() {
  const goWasm = new self.Go();
  const result = await WebAssembly.instantiateStreaming(
    fetch("/main.wasm"),
    goWasm.importObject,
  );
  goWasm.run(result.instance);

  self.onmessage = handleInput;
  self.postMessage({});
}

initWasmWorker();
