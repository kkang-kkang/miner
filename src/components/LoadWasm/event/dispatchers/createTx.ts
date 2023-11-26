import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function createTx(): Promise<void> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((resolve) => {
          worker.addEventListener(
            "message",
            (event: MessageEvent<Message<unknown>>) => {
              if (event.data.type === MessageTypes.TX_CREATED) {
                resolve();
              }
            },
          );
          worker.postMessage(new Message(MessageTypes.CREATE_TX, {}));
        }),
      onCallbackExecuted: (_: Worker): void => {
        resolve();
      },
    });
    window.dispatchEvent(event);
  });
}
