import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function getBalance(addr: string): Promise<number> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((_resolve) => {
          const handleEvent = (event: MessageEvent<Message<unknown>>) => {
            if (event.data.type === MessageTypes.GOT_BALANCE) {
              worker.removeEventListener("message", handleEvent);

              _resolve();
              resolve(event.data.data as number);
            }
          };
          worker.addEventListener("message", handleEvent);
          worker.postMessage(new Message(MessageTypes.GET_BALANCE, addr));
        }),
    });
    window.dispatchEvent(event);
  });
}
