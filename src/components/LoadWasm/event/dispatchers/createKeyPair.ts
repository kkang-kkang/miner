import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function createKeyPair(): Promise<KeyPair> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((_resolve) => {
          const handleEvent = (event: MessageEvent<Message<unknown>>) => {
            if (event.data.type === MessageTypes.KEY_PAIR_CREATED) {
              worker.removeEventListener("message", handleEvent);

              _resolve();
              resolve(event.data.data as KeyPair);
            }
          };
          worker.addEventListener("message", handleEvent);
          worker.postMessage(new Message(MessageTypes.CREATE_KEY_PAIR, {}));
        }),
    });
    window.dispatchEvent(event);
  });
}
