Privacy-First Proxy Browser (Single-Page App)

One-page search + proxy that renders external pages via a sanitizer. Dark mode, monospace, fade-in transitions. No cookies, no localStorage, and no third‑party requests from the client.

Quick Start (one command)

- Prerequisites: Docker + Docker Compose
- Run: docker compose up --build
- Then open: http://localhost:3000

Environment Variables

- PROXY_WHITELIST: Comma-separated hostnames or absolute URL prefixes allowed for proxying. Example: example.org, https://developer.mozilla.org/
- CRAWL_TARGETS: Comma-separated absolute URLs to include in the static index at startup (optional; otherwise a built-in small index is used). Note: this demo does not crawl at runtime to preserve privacy and reproducibility.

Architecture

- Front-end: static React SPA (served by nginx) with a single input bar. If you type a full http/https URL, it requests /proxy on the backend and renders the sanitized HTML. Otherwise it sends /search?q=... to the backend. Search results open through the proxy.
- Back-end: FastAPI with two main endpoints:
  - GET /search: returns up to 10 {title, snippet, url}
  - GET /proxy: fetches and sanitizes a remote page (strips script/iframe/object and external media)
  - POST /session/reset: clears in-memory cache

Security & Privacy

- No cookies or localStorage are used by the client app.
- All external network requests occur only on the backend when calling /proxy, never from the browser.
- Sanitization removes script/iframe/object and external media/stylesheets to avoid third-party requests leaking from your browser.
- This project is for educational and research use only. Use responsibly and respect site terms.

Docker

- Dockerfile: multi-stage build that compiles the React app, serves it from nginx, and runs the API (uvicorn) behind the same container.
- docker-compose.yml: exposes port 3000.

Notes

- This app avoids database usage to keep everything ephemeral and privacy-oriented. The in-memory cache is cleared by the New Session button.
