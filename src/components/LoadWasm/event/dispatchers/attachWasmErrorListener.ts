import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function attachWasmErrorListener(f: (err: any) => void): void {
  const event = newCallbackEvent({
    callback: (worker: Worker): Promise<void> =>
      new Promise((_resolve) => {
        const handleEvent = (event: MessageEvent<Message<unknown>>) => {
          if (event.data.type === MessageTypes.ERROR) {
            f(event.data.data);

            _resolve();
          }
        };
        worker.addEventListener("message", handleEvent);
        worker.postMessage(new Message("hihhihihi", {}));
      }),
  });
  window.dispatchEvent(event);
}
