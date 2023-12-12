import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function createGenesis(): Promise<void> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((_resolve) => {
          const handleEvent = (event: MessageEvent<Message<unknown>>) => {
            if (event.data.type === MessageTypes.BLOCK_CREATED) {
              worker.removeEventListener("message", handleEvent);

              _resolve();
              resolve();
            }
          };
          worker.addEventListener("message", handleEvent);
          worker.postMessage(new Message(MessageTypes.CREATE_GENESIS, {}));
        }),
    });
    window.dispatchEvent(event);
  });
}
