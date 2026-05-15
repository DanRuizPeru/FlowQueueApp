const BASE_URL = import.meta.env.VITE_API_BASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function request(path, options = {}) {
  // Supabase usa headers específicos para la autenticación y el manejo de datos
  const headers = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      // Supabase suele devolver errores en body.message o body.hint
      message = body?.message || message
    } catch (_) {}
    throw new Error(message)
  }

  // Si es un DELETE o PATCH exitoso, a veces Supabase no devuelve contenido
  // dependiendo de los headers de preferencia.
  if (res.status === 204) return null

  return res.json()
}

export const http = {
  get: (path) => request(path),
  post: (path, body) => request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Prefer': 'return=representation' } // Para que devuelva el objeto creado
  }),
  patch: (path, body) => request(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Prefer': 'return=representation' }
  }),
  delete: (path) => request(path, { method: 'DELETE' }),
}