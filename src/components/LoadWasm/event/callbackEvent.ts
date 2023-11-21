export type callbackFunc = (worker: Worker) => Promise<void> | void;
export type afterFunc = (worker: Worker) => Promise<void> | void;

export type eventConstructorParams = {
  callback: callbackFunc;
  onCallbackExecuted: afterFunc;
};

export class CallbackEvent extends Event {
  constructor(
    type: string,
    callback: callbackFunc,
    onCallbackExecuted: afterFunc,
    eventInitDict?: EventInit | undefined,
  ) {
    super(type, eventInitDict);
    this.callback = callback;
    this.onCallbackExecuted = onCallbackExecuted;
  }

  callback: callbackFunc;
  onCallbackExecuted: afterFunc;
}

export function newCallbackEvent({
  callback,
  onCallbackExecuted,
}: eventConstructorParams): CallbackEvent {
  return new CallbackEvent("invoke", callback, onCallbackExecuted);
}
