import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function getHeadHash(): Promise<string> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((_resolve) => {
          const handleEvent = (event: MessageEvent<Message<unknown>>) => {
            if (event.data.type === MessageTypes.GOT_HEAD_HASH) {
              worker.removeEventListener("message", handleEvent);

              _resolve();
              resolve(event.data.data as string);
            }
          };
          worker.addEventListener("message", handleEvent);
          worker.postMessage(new Message(MessageTypes.GET_HEAD_HASH, {}));
        }),
    });
    window.dispatchEvent(event);
  });
}
