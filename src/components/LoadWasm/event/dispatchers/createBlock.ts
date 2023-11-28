import { Message, MessageTypes } from "../../messages/messageTypes";
import { newCallbackEvent } from "../callbackEvent";

export function createBlock(input: BlockCandidate): Promise<Block> {
  return new Promise((resolve) => {
    const event = newCallbackEvent({
      callback: (worker: Worker): Promise<void> =>
        new Promise((_resolve) => {
          const handleEvent = (event: MessageEvent<Message<unknown>>) => {
            if (event.data.type === MessageTypes.BLOCK_CREATED) {
              worker.removeEventListener("message", handleEvent);

              _resolve();
              resolve(event.data.data as Block);
            } else if (event.data.type === MessageTypes.BLOCK_CANDIDATE) {
              console.log('candidate: ', event.data.data);
            }
          };
          worker.addEventListener("message", handleEvent);
          worker.postMessage(new Message(MessageTypes.CREATE_BLOCK, input));
        }),
    });
    window.dispatchEvent(event);
  });
}
