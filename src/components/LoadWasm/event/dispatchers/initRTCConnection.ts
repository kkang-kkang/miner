import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../";

export function initRTCConnection(): Promise<void> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((resolve) => {
          worker.onmessage = () => {
            // do something
            resolve();
          };

          worker.postMessage(new Message(MessageTypes.INIT_RTC_CONN, {}));
        }),
      onCallbackExecuted: (): void => {
        resolve();
      },
    });
    window.dispatchEvent(event);
  });
}
