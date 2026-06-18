# ⚡ Environment Configuration Quick Reference

## Changes Made ✅

### 1. **Frontend `.env`** (Development)
```bash
VITE_API_URL=http://localhost:5000           ← Backend API
VITE_SOCKET_URL=http://localhost:5000        ← WebSocket
VITE_ENV=development
```

### 2. **Frontend `.env.production`** (Production)
```bash
VITE_API_URL=https://scope.mlrit.ac.in/api   ← Production API
VITE_SOCKET_URL=https://scope.mlrit.ac.in    ← Production WebSocket
VITE_ENV=production
```

### 3. **Frontend `vite.config.mjs`** (Smart Proxy)
- ✅ Detects `NODE_ENV` automatically
- ✅ Uses `VITE_API_URL` from `.env` or `.env.production`
- ✅ **Fallback**: If not set, uses `http://localhost:5000/api` in dev mode
- ✅ **Fallback**: If not set, uses `https://scope.mlrit.ac.in/api` in production

### 4. **Backend `.env`** (Development)
```bash
NODE_ENV=development
FRONTEND_URL=http://localhost:5173           ← Frontend allowed origin
API_BASE_URL=http://localhost:5000/api       ← Own API URL
```

### 5. **Backend `.env.production`** (Production)
```bash
NODE_ENV=production
FRONTEND_URL=https://scope.mlrit.ac.in       ← Production origin
API_BASE_URL=https://scope.mlrit.ac.in/api   ← Production API
```

### 6. **Backend `server.js`** (Dynamic CORS & Socket.IO)
✅ **Development** allows:
- `http://localhost:5173` (frontend)
- `http://localhost:3000` (alt frontend)
- `http://localhost:5000` (backend)
- `http://127.0.0.1:*` variants

✅ **Production** allows only:
- `https://scope.mlrit.ac.in`
- `scope.mlrit.ac.in`

---

## 🚀 How to Run

### Local Development
```bash
# Backend
cd backend
NODE_ENV=development npm start
# ✅ Server starts at http://localhost:5000
# ✅ Accepts requests from http://localhost:5173

# Frontend (new terminal)
cd frontend
npm run dev
# ✅ App runs at http://localhost:5173
# ✅ API requests proxied to http://localhost:5000/api
```

### Production Deployment
```bash
# Backend
export NODE_ENV=production    # Linux/Mac
set NODE_ENV=production       # Windows

npm start
# ✅ Loads .env.production
# ✅ Only accepts requests from https://scope.mlrit.ac.in

# Frontend
export NODE_ENV=production
npm run build
# ✅ Builds optimized bundle
# ✅ All API calls use https://scope.mlrit.ac.in/api
```

---

## 🔄 Fallback Mechanism Priority

### Frontend (Vite Config)
```
1️⃣ VITE_API_URL env var (from .env / .env.production)
2️⃣ NODE_ENV=production check
3️⃣ Default: http://localhost:5000/api
```

### Backend (Server.js)
```
1️⃣ FRONTEND_URL env var
2️⃣ NODE_ENV=production check
3️⃣ Defaults: 
   - Production: https://scope.mlrit.ac.in
   - Dev: http://localhost:5173
```

---

## ✨ No Code Changes Needed!

The system **automatically** switches between:
- ✅ Development environment
- ✅ Production environment

Just set `NODE_ENV=production` when deploying! 🎉

---

## 🔍 Verify Setup

### Check Backend Environment
```bash
# Look for these logs:
[Server] 🔧 Environment: DEVELOPMENT
[Server] 🌐 Frontend URL: http://localhost:5173
[Server] 📍 Allowed CORS Origins: [ 'http://localhost:5173', ... ]
```

### Check Frontend Environment
```bash
# Open browser DevTools → Network
# API calls should go to:
# Dev: http://localhost:5000/api
# Prod: https://scope.mlrit.ac.in/api
```

---

## 📋 Quick Checklist

- [ ] Frontend `.env` has `VITE_API_URL=http://localhost:5000`
- [ ] Frontend `.env.production` has `VITE_API_URL=https://scope.mlrit.ac.in/api`
- [ ] Backend `.env` has `NODE_ENV=development` & `FRONTEND_URL=http://localhost:5173`
- [ ] Backend `.env.production` has `NODE_ENV=production` & `FRONTEND_URL=https://scope.mlrit.ac.in`
- [ ] `vite.config.mjs` detects environment and sets proxy/API URL
- [ ] `server.js` has dynamic CORS configuration
- [ ] No CORS errors in development
- [ ] Ready to deploy to production! ✅

---

## 💡 Why This Approach?

✅ **No hardcoding** - URLs come from `.env` files
✅ **Automatic detection** - Sets up based on `NODE_ENV`
✅ **Fallback protection** - Works even if env vars missing
✅ **Production safe** - Restricts CORS to only allowed origins
✅ **Development friendly** - Allows multiple localhost variants
✅ **No code changes** - Same codebase for dev & production

---

## 📚 Full Documentation
See `ENVIRONMENT_CONFIG_GUIDE.md` for detailed explanation and troubleshooting.
