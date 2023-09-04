export class Message<T> {
  constructor(type: string, data: T) {
    this.type = type;
    this.data = data;
  }

  public readonly type: string;
  public readonly data: T;
}

export enum MessageTypes {
  INIT_RTC_CONN = "initRTCConneciton",
}

export type EmptyMessage = {};
