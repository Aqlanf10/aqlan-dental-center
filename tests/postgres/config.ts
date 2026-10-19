import type { PoolConfig } from 'pg';
/** Owner access is only for the named disposable local CI fixture. Never forward
 * connection strings: pg gives query-string host/user/options priority over URL parts.
 */
export function disposableDatabaseConfig(value: string | undefined, guard: string | undefined): PoolConfig {
  if (guard !== '1' || !value) throw new Error('Disposable database guard required');
  const url = new URL(value);
  const host = url.hostname === '[::1]' ? '::1' : url.hostname;
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '::1'].includes(host) || url.pathname !== '/finance_test' || url.username !== 'postgres' || url.password !== 'synthetic-only' || (url.port !== '' && url.port !== '5432') || value.includes('?') || value.includes('#')) throw new Error('Only the explicit disposable local PostgreSQL fixture is allowed');
  return { host, port: 5432, database: 'finance_test', user: 'postgres', password: 'synthetic-only', max: 5 };
}
