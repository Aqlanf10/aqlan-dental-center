import { translate } from '../i18n/index.ts';
import { FinanceError, fail } from './validation.ts';
import type { FinanceService, TrustedIdentity } from './service.ts';
export type Request = { method: string; path: string; body?: string; language?: 'ar' | 'en' };
export type AuthResolver = (requestContext: unknown) => Promise<TrustedIdentity | null>;
/** Transport-independent test boundary. No listener and no header-based authentication.
 * Caller supplies a real trusted resolver before connecting any transport.
 */
export function createFinanceHandler(service: FinanceService, authenticate: AuthResolver) {
  if (typeof authenticate !== 'function') throw new Error('Authentication adapter required');
  return async (request: Request, requestContext: unknown): Promise<{ status: number; body: unknown }> => {
    const language = request.language === 'ar' ? 'ar' : 'en';
    try {
      const auth = await authenticate(requestContext);
      if (!auth) fail('UNAUTHENTICATED', 401);
      if (typeof request.path !== 'string' || request.path.length > 512) fail('INVALID_REQUEST');
      const match = /^\/v1\/finance\/accounts\/([A-Za-z0-9][A-Za-z0-9_.:-]{0,127})\/(commands|balance)(\?[^#]*)?$/.exec(request.path);
      if (!match) fail('NOT_FOUND', 404);
      const accountId = match[1];
      if (request.method === 'POST' && match[2] === 'commands' && !match[3]) {
        if (typeof request.body !== 'string') fail('INVALID_REQUEST');
        if (Buffer.byteLength(request.body) > 32768) fail('REQUEST_TOO_LARGE', 413);
        let input: unknown;
        try { input = JSON.parse(request.body); } catch { fail('INVALID_REQUEST'); }
        return { status: 200, body: await service.command(auth, accountId, input) };
      }
      if (request.method === 'GET' && match[2] === 'balance' && request.body === undefined) {
        const query = new URLSearchParams(match[3]?.slice(1));
        if ([...query.keys()].length !== 1 || !query.has('dueAsOf')) fail('INVALID_REQUEST');
        return { status: 200, body: await service.balance(auth, accountId, query.get('dueAsOf')) };
      }
      fail('INVALID_REQUEST');
    } catch (error) {
      const safe = error instanceof FinanceError ? error : new FinanceError('TEMPORARILY_UNAVAILABLE', 503);
      const messageKey = safe.code === 'STALE_VERSION' ? 'error.STALE_VERSION' : safe.code === 'IDEMPOTENCY_CONFLICT' ? 'error.IDEMPOTENCY_CONFLICT' : safe.code === 'OVERPAYMENT' ? 'error.OVERPAYMENT' : safe.code === 'CURRENCY_MISMATCH' ? 'error.CURRENCY_MISMATCH' : safe.status === 401 || safe.status === 404 ? 'error.ACCESS_DENIED' : 'error.INVALID_INPUT';
      return { status: safe.status, body: { code: safe.code, message: translate(language, messageKey) } };
    }
  };
}
