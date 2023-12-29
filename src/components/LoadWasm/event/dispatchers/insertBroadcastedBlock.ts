import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function insertBroadcastedBlock(block: Block): Promise<void> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((_resolve) => {
          const handleEvent = (event: MessageEvent<Message<unknown>>) => {
            if (event.data.type === MessageTypes.BLOCK_INSERTED) {
              worker.removeEventListener("message", handleEvent);

              _resolve();
              resolve();
            }
          };

          worker.addEventListener("message", handleEvent);
          worker.postMessage(new Message(MessageTypes.INSERT_BLOCK, block));
        }),
    });
    window.dispatchEvent(event);
  });
}
