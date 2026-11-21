import { HTTP_METHODS } from '#~/features/http/http-methods.enums';
import { REQUEST_ORIGIN_MODES } from '#~/features/http/request-origin-modes.enums';
import type { RequestOriginMode } from '#~/features/http/request-origin-modes.enums';
import { RequestOriginGuard } from '#~/features/http/request-origin.guard';

const API_URL = 'https://api.example.com/rpc/user/update';
const WEB_ORIGIN = 'https://app.example.com';

function guardFor(mode: RequestOriginMode) {
  return new RequestOriginGuard({ mode, trustedOrigins: [WEB_ORIGIN] });
}

function requestFrom(origin: string | null, method: string = HTTP_METHODS.POST) {
  return new Request(API_URL, { method, headers: origin === null ? {} : { Origin: origin } });
}

describe('RequestOriginGuard', () => {
  it.each([REQUEST_ORIGIN_MODES.LENIENT, REQUEST_ORIGIN_MODES.STRICT])(
    'in %s mode, accepts state changes from the API itself and trusted origins only',
    (mode) => {
      const guard = guardFor(mode);

      expect(guard.isAllowed(requestFrom('https://api.example.com'))).toBe(true);
      expect(guard.isAllowed(requestFrom(WEB_ORIGIN))).toBe(true);
      expect(guard.isAllowed(requestFrom('https://evil.example.com'))).toBe(false);
      expect(guard.isAllowed(requestFrom('https://evil.example.com', HTTP_METHODS.DELETE))).toBe(false);
    },
  );

  it('lets requests without an Origin through in lenient mode and refuses them in strict mode', () => {
    expect(guardFor(REQUEST_ORIGIN_MODES.LENIENT).isAllowed(requestFrom(null))).toBe(true);
    expect(guardFor(REQUEST_ORIGIN_MODES.STRICT).isAllowed(requestFrom(null))).toBe(false);
    expect(guardFor(REQUEST_ORIGIN_MODES.STRICT).isAllowed(requestFrom(null, HTTP_METHODS.PATCH))).toBe(false);
  });

  it('never blocks reads, whatever their origin', () => {
    const guard = guardFor(REQUEST_ORIGIN_MODES.STRICT);

    expect(guard.isAllowed(requestFrom('https://evil.example.com', HTTP_METHODS.GET))).toBe(true);
    expect(guard.isAllowed(requestFrom(null, HTTP_METHODS.HEAD))).toBe(true);
    expect(guard.isAllowed(requestFrom('https://evil.example.com', HTTP_METHODS.OPTIONS))).toBe(true);
  });

  it('treats methods it does not know as state-changing', () => {
    expect(guardFor(REQUEST_ORIGIN_MODES.STRICT).isAllowed(requestFrom(null, 'PROPFIND'))).toBe(false);
  });
});
