import { useEffect, useMemo, useRef, useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '/api'

function isHttpUrl(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function App() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState([])
  const [page, setPage] = useState({ url: '', html: '' })
  const inputRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const api = useMemo(() => {
    const base = BACKEND_URL.replace(/\/$/, '')
    return {
      search: (q) => `${base}/search?q=${encodeURIComponent(q)}&limit=10`,
      proxy: (u) => `${base}/proxy?url=${encodeURIComponent(u)}`,
      resource: (u) => `${base}/resource?url=${encodeURIComponent(u)}`,
      reset: () => `${base}/session/reset`,
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResults([])
    setPage({ url: '', html: '' })

    const value = query.trim()
    if (!value) return

    setLoading(true)
    try {
      if (isHttpUrl(value)) {
        await openUrl(value)
      } else {
        const res = await fetch(api.search(value), { credentials: 'omit' })
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setResults(Array.isArray(data) ? data.slice(0, 10) : [])
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function openUrl(u) {
    setLoading(true)
    setError('')
    try {
      let res = await fetch(api.proxy(u), { credentials: 'omit' })
      if (!res.ok) {
        // quick retry once
        res = await fetch(api.proxy(u), { credentials: 'omit' })
      }
      if (!res.ok) throw new Error('Proxy fetch failed')
      const data = await res.json()
      setPage({ url: data.url, html: data.html })
      setResults([])
    } catch (err) {
      setError(err?.message || 'Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  async function newSession() {
    try {
      await fetch(api.reset(), { method: 'POST', credentials: 'omit' })
    } catch {}
    window.location.reload()
  }

  // Intercept clicks inside proxied content for in-app navigation
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const onClick = (e) => {
      const a = e.target.closest ? e.target.closest('a[data-proxy-href]') : null
      if (a) {
        e.preventDefault()
        const href = a.getAttribute('data-proxy-href')
        if (href) openUrl(href)
      }
    }

    const onSubmit = (e) => {
      const form = e.target.closest ? e.target.closest('form') : e.target
      if (!form) return
      if (form.matches('form')) {
        e.preventDefault()
        const action = form.getAttribute('data-proxy-action') || page.url
        const method = (form.getAttribute('method') || 'get').toLowerCase()
        const formData = new FormData(form)
        if (method === 'get') {
          const params = new URLSearchParams()
          for (const [k, v] of formData.entries()) params.append(k, v)
          const url = action + (action.includes('?') ? '&' : '?') + params.toString()
          openUrl(url)
        } else {
          // For now, treat other methods as GET to keep it safe and simple
          const params = new URLSearchParams()
          for (const [k, v] of formData.entries()) params.append(k, v)
          const url = action + (action.includes('?') ? '&' : '?') + params.toString()
          openUrl(url)
        }
      }
    }

    el.addEventListener('click', onClick)
    el.addEventListener('submit', onSubmit)
    return () => {
      el.removeEventListener('click', onClick)
      el.removeEventListener('submit', onSubmit)
    }
  }, [page.url])

  return (
    <div className="min-h-screen bg-black text-slate-200 font-mono">
      <div className="min-h-screen flex flex-col" style={{ opacity: 1 }}>
        <header className="w-full border-b border-white/10 bg-zinc-950/50 backdrop-blur sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="text-sm text-slate-400">Privacy Proxy</div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={newSession} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-100 transition-colors duration-200">
                New Session
              </button>
          </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <form onSubmit={handleSubmit} className="mb-6">
              <div className="relative group">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search or type a URL…"
                  className="w-full h-14 rounded-full bg-zinc-900/80 border border-white/10 px-6 pr-36 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition duration-400"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors duration-200"
                >
                  {loading ? 'Working…' : 'Search'}
                </button>
              </div>
            </form>

            {error && (
              <div className="mb-4 text-red-400/90 transition-opacity duration-400">{error}</div>
            )}

            {!page.html && results.length > 0 && (
              <ul className="space-y-4 animate-[fadeIn_0.4s_ease]">
                {results.map((r, idx) => (
                  <li key={idx} className="p-4 rounded-lg bg-zinc-900/70 border border-white/10 hover:border-blue-500/40 transition-colors duration-300">
                    <button onClick={() => openUrl(r.url)} className="text-left w-full">
                      <div className="text-blue-400 hover:underline font-semibold">{r.title}</div>
                      <div className="text-slate-400 text-sm mt-1 line-clamp-2">{r.snippet}</div>
                      <div className="text-slate-500 text-xs mt-2">{r.url}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {page.html && (
              <div className="animate-[fadeIn_0.4s_ease]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-slate-500 truncate mr-2">{page.url}</div>
                  <button onClick={() => setPage({ url: '', html: '' })} className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-slate-100 text-sm transition-colors duration-200">Back to results</button>
                </div>
                <div className="rounded-lg border border-white/10 bg-zinc-900/60 overflow-hidden min-h-[60vh]">
                  <div
                    ref={contentRef}
                    className="prose prose-invert max-w-none p-4"
                    dangerouslySetInnerHTML={{ __html: page.html }}
                  />
                </div>
              </div>
            )}

            {!page.html && results.length === 0 && !loading && !error && (
              <div className="text-slate-500 text-sm mt-16 animate-[fadeIn_0.4s_ease]">
                Tip: paste a full URL (http/https) to view it through the privacy proxy, or type a search query.
              </div>
            )}
          </div>
        </main>

        <footer className="mt-auto border-t border-white/10 text-xs text-slate-500/80 py-3 px-4 text-center">
          No cookies. No local storage. No third-party requests. For educational use only.
        </footer>
      </div>

      <style>
        {`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        `}
      </style>
    </div>
  )
}
