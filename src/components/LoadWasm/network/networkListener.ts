import { EventType } from "./event";

export class NetworkListener {
  private readonly target: EventTarget = new EventTarget();

  public attachListener<T>(kind: EventType, f: (val: T) => void) {
    this.target.addEventListener(kind, (_event: Event) => {
      const event = _event as CustomEvent<T>;
      f(event.detail);
    });
  }
    
  public dispatch<T>(kind: EventType, payload: T) {
    this.target.dispatchEvent(new CustomEvent(kind, { detail: payload }));
  }
}
