const handle = async r => {
  if (!r.ok) { const body = await r.json().catch(() => ({})); throw new Error(body.detail || `HTTP ${r.status}`) }
  return r.json()
}

export const get   = path => fetch(path, { credentials: 'include' }).then(handle)
export const post  = (path, data) => fetch(path, { method: 'POST',  credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(handle)
export const patch = (path, data) => fetch(path, { method: 'PATCH', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(handle)
export const put   = (path, data) => fetch(path, { method: 'PUT',   credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(handle)
export const del   = path => fetch(path, { method: 'DELETE', credentials: 'include' }).then(handle)
