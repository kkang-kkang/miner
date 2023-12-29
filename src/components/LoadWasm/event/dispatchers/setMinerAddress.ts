import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function setMinerAddress(addr: string): Promise<void> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((_resolve) => {
          const handleEvent = (event: MessageEvent<Message<unknown>>) => {
            if (event.data.type === MessageTypes.MINER_ADDR_SET) {
              worker.removeEventListener("message", handleEvent);

              _resolve();
              resolve();
            }
          };
          worker.addEventListener("message", handleEvent);
          worker.postMessage(new Message(MessageTypes.SET_MINER_ADDR, addr));
        }),
    });
    window.dispatchEvent(event);
  });
}
