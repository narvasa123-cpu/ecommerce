export async function api<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const options: RequestInit = { cache: 'no-store' };
  if (body !== undefined) {
    const csrf = await fetch('/api/csrf', { cache: 'no-store' });
    const { token } = await csrf.json();
    options.method = 'POST';
    options.headers = { 'Content-Type': 'application/json', 'x-csrf-token': token };
    options.body = JSON.stringify(body);
  }
  const response = await fetch('/api/store/' + path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data;
}
