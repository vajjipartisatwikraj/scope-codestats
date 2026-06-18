# Environment Configuration Guide - Development & Production Fallback

## Overview
This project uses a **fallback mechanism** to support both development (localhost) and production (scope.mlrit.ac.in) environments without code changes.

---

## 📁 File Structure

```
Frontend:
  .env                  → Development environment variables (localhost)
  .env.production        → Production environment variables (scope.mlrit.ac.in)
  vite.config.mjs       → Vite configuration with environment detection

Backend:
  .env                  → Development environment variables (localhost)
  .env.production        → Production environment variables (scope.mlrit.ac.in)
  server.js             → Express server with dynamic CORS/Socket.IO config
```

---

## 🔧 Frontend Configuration

### `.env` (Development)
```bash
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=...
VITE_ENCODING_ENCRYPT_KEY=...
VITE_ENV=development
```

### `.env.production` (Production)
```bash
VITE_API_URL=https://scope.mlrit.ac.in/api
VITE_SOCKET_URL=https://scope.mlrit.ac.in
VITE_GOOGLE_CLIENT_ID=...
VITE_ENCODING_ENCRYPT_KEY=...
VITE_ENV=production
```

### `vite.config.mjs` (Smart Fallback)
The Vite config implements a **3-priority fallback mechanism**:

1. **Priority 1**: Uses explicit `VITE_API_URL` if set
2. **Priority 2**: Checks `NODE_ENV` - uses production URL if `NODE_ENV=production`
3. **Priority 3**: Defaults to `http://localhost:5000/api` for development

```javascript
const getApiUrl = () => {
  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;  // Priority 1
  }
  if (isProduction) {
    return "https://scope.mlrit.ac.in/api";  // Priority 2
  }
  return "http://localhost:5000/api";  // Priority 3 (fallback)
};
```

---

## 🔧 Backend Configuration

### `.env` (Development)
```bash
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000/api
FRONTEND_URL=http://localhost:5173
```

### `.env.production` (Production)
```bash
NODE_ENV=production
PORT=5000
API_BASE_URL=https://scope.mlrit.ac.in/api
FRONTEND_URL=https://scope.mlrit.ac.in
```

### `server.js` (Dynamic CORS & Socket.IO)
The server automatically configures CORS and Socket.IO based on `NODE_ENV`:

**Development Origins** (allows all localhost variants):
```javascript
[
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
]
```

**Production Origins** (only allows scope.mlrit.ac.in):
```javascript
[
  "https://scope.mlrit.ac.in",
  "scope.mlrit.ac.in",
]
```

The fallback logic:
```javascript
const corsOrigins = () => {
  if (isProduction) {
    return ["https://scope.mlrit.ac.in", "scope.mlrit.ac.in"];
  } else {
    return ["http://localhost:5173", "http://localhost:3000", ...];
  }
};
```

---

## 🚀 Running the Application

### Development (Local Machine)
```bash
# Terminal 1: Backend
cd backend
NODE_ENV=development npm start
# Runs on http://localhost:5000

# Terminal 2: Frontend
cd frontend
npm run dev
# Runs on http://localhost:5173
# Automatically proxies /api to http://localhost:5000
```

### Production (Server/Deployment)
```bash
# Set environment variable before starting
export NODE_ENV=production  # On Linux/Mac
# OR
set NODE_ENV=production     # On Windows

# Backend
npm start
# Runs on port 5000, accepts requests from https://scope.mlrit.ac.in

# Frontend
npm run build
# Builds optimized bundle configured for https://scope.mlrit.ac.in/api
```

---

## 🔄 How the Fallback Mechanism Works

### Frontend Example:
```
Local Development:
  1. User runs: npm run dev (without setting NODE_ENV)
  2. Vite Config checks: NODE_ENV === "production"? → NO
  3. Falls back to: "http://localhost:5000/api"
  4. API calls go to: http://localhost:5000

Production:
  1. Build happens: npm run build (NODE_ENV=production)
  2. Vite Config uses: VITE_API_URL from .env.production
  3. Results in: "https://scope.mlrit.ac.in/api"
  4. API calls go to: https://scope.mlrit.ac.in
```

### Backend Example:
```
Development Server:
  1. CORS check: NODE_ENV !== "production" → YES (dev)
  2. Allows: ["http://localhost:5173", "http://localhost:3000", ...]
  3. Frontend on :5173 can connect ✅

Production Server:
  1. CORS check: NODE_ENV === "production" → YES
  2. Allows: ["https://scope.mlrit.ac.in"]
  3. Only scope.mlrit.ac.in can connect ✅
```

---

## ✅ Verification Checklist

### Local Development:
- [ ] Backend logs: `Environment: DEVELOPMENT`
- [ ] Frontend `.env` loaded: `VITE_API_URL=http://localhost:5000`
- [ ] Vite proxy active: Requests to `/api` go to `http://localhost:5000`
- [ ] Socket.IO connects to `http://localhost:5000`
- [ ] No CORS errors in browser console

### Production Deployment:
- [ ] Backend logs: `Environment: PRODUCTION`
- [ ] Backend `.env.production` loaded with proper URLs
- [ ] Frontend built with: `NODE_ENV=production npm run build`
- [ ] API calls use: `https://scope.mlrit.ac.in/api`
- [ ] Socket.IO connects to: `https://scope.mlrit.ac.in`
- [ ] CORS only allows `scope.mlrit.ac.in`

---

## 🐛 Troubleshooting

### "CORS error - origin not allowed"
```
Solution: Check if NODE_ENV is correctly set
- Dev: NODE_ENV should NOT be "production"
- Prod: NODE_ENV MUST be "production"
```

### "Cannot connect to backend (localhost:5000)"
```
Solution: Verify VITE_API_URL in .env or .env.production
- Dev: Should be http://localhost:5000
- Check: echo $VITE_API_URL (or set in .env)
```

### "Production build still uses localhost"
```
Solution: Build with NODE_ENV=production
- Run: NODE_ENV=production npm run build
- Check: Verify .env.production exists with correct URLs
```

### Vite proxy not working in dev
```
Solution: Check vite.config.mjs proxy settings
- Dev: target should be "http://localhost:5000"
- Restart: npm run dev
```

---

## 📋 Summary of URLs

| Environment | Frontend | Backend | API URL |
|-------------|----------|---------|---------|
| **Local Dev** | localhost:5173 | localhost:5000 | http://localhost:5000/api |
| **Production** | scope.mlrit.ac.in | scope.mlrit.ac.in | https://scope.mlrit.ac.in/api |

---

## 🔐 Security Notes

- Development: Allows multiple localhost origins for flexibility
- Production: Restricts CORS to only scope.mlrit.ac.in
- Always use `NODE_ENV=production` when deploying to production
- Never commit sensitive data to `.env` files (use `.env.example` instead)

---

## 📝 Environment Detection Priority

### Frontend (Vite Config):
```
1. VITE_API_URL env var
2. NODE_ENV === "production" check
3. Default fallback to localhost:5000
```

### Backend (Server.js):
```
1. FRONTEND_URL env var (if set)
2. NODE_ENV check
3. Default fallback to localhost:5173
```

This ensures the application works correctly regardless of how it's run! 🎉
