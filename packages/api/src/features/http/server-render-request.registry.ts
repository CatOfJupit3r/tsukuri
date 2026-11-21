import { singleton } from 'tsyringe';

/**
 * Remembers which request objects the server render created inside this process. Membership is identity of the
 * object, so no header, cookie or body a visitor sends can place a request here.
 */
@singleton()
export class ServerRenderRequestRegistry {
  private readonly requests = new WeakSet<Request>();

  public mark(request: Request) {
    this.requests.add(request);
  }

  public isMarked(request: Request) {
    return this.requests.has(request);
  }
}
