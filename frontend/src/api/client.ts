const BASE = '/api'

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; params?: Record<string, string | number | undefined> } = {}
): Promise<{ data: T }> {
  let url = BASE + path
  if (options.params) {
    const filtered = Object.fromEntries(
      Object.entries(options.params).filter(([, v]) => v != null)
    ) as Record<string, string>
    const qs = new URLSearchParams(filtered).toString()
    if (qs) url += '?' + qs
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    if (res.status === 401 && !path.includes('/auth/me')) {
      window.location.href = '/login'
    }
    const error = await res.json().catch(() => ({}))
    throw Object.assign(new Error(res.statusText), { response: { status: res.status, data: error } })
  }

  const data: T = res.status === 204 ? (undefined as T) : await res.json()
  return { data }
}

const api = {
  get: <T>(path: string, opts?: { params?: Record<string, string | number | undefined> }) =>
    request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}

export default api
