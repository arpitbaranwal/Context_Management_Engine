const TOKEN_KEY = 'cme.token'

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  /** True when the server could not be reached at all. */
  unreachable: boolean
  constructor(message: string, status = 0, unreachable = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.unreachable = unreachable
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

function authHeaders(): Record<string, string> {
  const t = tokenStore.get()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function errorFrom(res: Response): Promise<ApiError> {
  let detail = res.statusText
  try {
    const body = await res.json()
    detail = typeof body?.detail === 'string' ? body.detail : (body?.message ?? detail)
  } catch {
    /* non-JSON body */
  }
  return new ApiError(detail || `Request failed (${res.status})`, res.status)
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError('Unable to connect to the research engine.', 0, true)
  }
  if (!res.ok) throw await errorFrom(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Multipart upload with progress; fetch cannot report upload progress. */
export function uploadForm<T>(
  path: string,
  form: FormData,
  onProgress?: (fraction: number) => void,
  onUploaded?: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${path}`)
    const t = tokenStore.get()
    if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.upload.onload = () => onUploaded?.()
    xhr.onerror = () => reject(new ApiError('Unable to connect to the research engine.', 0, true))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          reject(new ApiError('The server returned an unreadable response.', xhr.status))
        }
        return
      }
      let detail = xhr.statusText
      try {
        detail = JSON.parse(xhr.responseText)?.detail ?? detail
      } catch {
        /* ignore */
      }
      reject(new ApiError(typeof detail === 'string' ? detail : 'Upload failed.', xhr.status))
    }
    xhr.send(form)
  })
}
