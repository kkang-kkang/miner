export type callbackFunc = (worker: Worker) => Promise<any> | any;

export type eventConstructorParams = {
  callback: callbackFunc;
};

export class CallbackEvent extends Event {
  constructor(
    type: string,
    callback: callbackFunc,
    eventInitDict?: EventInit | undefined,
  ) {
    super(type, eventInitDict);
    this.callback = callback;
  }

  callback: callbackFunc;
}

export function newCallbackEvent({
  callback,
}: eventConstructorParams): CallbackEvent {
  return new CallbackEvent("invoke", callback);
}
