# Multi-service container: Nginx (static) + FastAPI backend via Uvicorn
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY package.json package-lock.json* ./
COPY vite.config.js tailwind.config.js postcss.config.js index.html ./
COPY src ./src
COPY public ./public
RUN npm ci && npm run build

# Stage 2: Final image
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install nginx
RUN apt-get update && apt-get install -y --no-install-recommends nginx && rm -rf /var/lib/apt/lists/*

# Copy backend
WORKDIR /app
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY backend /app

# Nginx config
RUN rm -f /etc/nginx/sites-enabled/default
RUN printf '\nserver {\n  listen 3000;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location /api/ {\n    proxy_pass http://127.0.0.1:8000/;\n  }\n  location / {\n    try_files $uri /index.html;\n  }\n}\n' > /etc/nginx/sites-enabled/spa.conf

# Start script: run backend and nginx
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port 8000 & nginx -g 'daemon off;'"
