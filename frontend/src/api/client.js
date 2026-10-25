// Tiny fetch helpers. Every API file in this folder uses these.

async function handle(response) {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${response.status}: ${text}`)
  }
  return response.json()
}

export async function apiGet(path) {
  return handle(await fetch(path))
}

export async function apiPost(path, body) {
  return handle(
    await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function apiPut(path, body) {
  return handle(
    await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

// For uploads (audio files): the browser sets the multipart Content-Type itself.
export async function apiPostForm(path, formData) {
  return handle(await fetch(path, { method: 'POST', body: formData }))
}
