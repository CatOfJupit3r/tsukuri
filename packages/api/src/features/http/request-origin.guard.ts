import type { InjectionToken } from 'tsyringe';
import { inject, singleton } from 'tsyringe';

import { HTTP_METHOD_META, httpMethodsEnumwaii } from './http-methods.enums';
import type { RequestOriginMode } from './request-origin-modes.enums';
import { REQUEST_ORIGIN_MODE_META } from './request-origin-modes.enums';

const ORIGIN_HEADER = 'Origin';

export interface iRequestOriginPolicy {
  mode: RequestOriginMode;
  /** Origins besides the API's own that may send state-changing requests, such as the web app's. */
  trustedOrigins: readonly string[];
}

export const REQUEST_ORIGIN_POLICY_TOKEN: InjectionToken<iRequestOriginPolicy> = Symbol.for('RequestOriginPolicy');

/**
 * Refuses cross-site requests that could change state: a POST, PUT, PATCH or DELETE whose `Origin` is
 * neither the API's own nor trusted. Strict mode also refuses those that send no `Origin` at all.
 */
@singleton()
export class RequestOriginGuard {
  private readonly trustedOrigins: ReadonlySet<string>;

  constructor(@inject(REQUEST_ORIGIN_POLICY_TOKEN) private readonly policy: iRequestOriginPolicy) {
    this.trustedOrigins = new Set(policy.trustedOrigins);
  }

  public isAllowed(request: Request) {
    if (this.isSafeMethod(request.method)) return true;

    const origin = request.headers.get(ORIGIN_HEADER);
    if (origin === null) return REQUEST_ORIGIN_MODE_META.get(this.policy.mode).allowsMissingOrigin;
    return origin === new URL(request.url).origin || this.trustedOrigins.has(origin);
  }

  private isSafeMethod(method: string) {
    return httpMethodsEnumwaii.is(method) && HTTP_METHOD_META.get(method).isSafe;
  }
}
