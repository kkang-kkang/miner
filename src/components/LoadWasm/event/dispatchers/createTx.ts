import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function createTx(input: TxCandidate): Promise<Transaction> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((_resolve) => {
          const handleEvent = (event: MessageEvent<Message<unknown>>) => {
            if (event.data.type === MessageTypes.TX_CREATED) {
              worker.removeEventListener("message", handleEvent);

              _resolve();
              resolve(event.data.data as Transaction);
            }
          };
          worker.addEventListener("message", handleEvent);
          worker.postMessage(new Message(MessageTypes.CREATE_TX, input));
        }),
    });
    window.dispatchEvent(event);
  });
}
