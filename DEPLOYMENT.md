# Deployment Guide - BetX Casino Platform

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Vercel)                                       │
│  ├── Next.js App                                         │
│  ├── Auto-deploy from GitHub                            │
│  └── CDN + Edge Functions                               │
│                                                          │
│  Backend (Render)                                        │
│  ├── Node.js + Express                                  │
│  ├── Socket.IO Server                                   │
│  └── Auto-deploy from GitHub                            │
│                                                          │
│  Database (MongoDB Atlas)                                │
│  ├── Managed MongoDB Cluster                            │
│  ├── Automatic Backups                                  │
│  └── Global Distribution                                │
│                                                          │
│  Cache (Redis Cloud / Render Redis)                     │
│  ├── Session Storage                                    │
│  ├── Game State Cache                                   │
│  └── Rate Limiting                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Backend Deployment (Render)

### 1. Create `render.yaml`

Create this file in `betx-backend/`:

```yaml
services:
  - type: web
    name: betx-api
    env: node
    region: singapore
    plan: starter
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: CLIENT_URL
        sync: false
      - key: MONGODB_URI
        sync: false
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: CASHFREE_APP_ID
        sync: false
      - key: CASHFREE_SECRET_KEY
        sync: false
      - key: TATUM_API_KEY
        sync: false
```

### 2. Deploy to Render

1. **Push to GitHub:**
```bash
cd betx-backend
git init
git add .
git commit -m "Initial backend setup"
git remote add origin YOUR_GITHUB_REPO
git push -u origin main
```

2. **Connect to Render:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `betx-backend` directory
   - Render will auto-detect `render.yaml`

3. **Configure Environment Variables:**
   - Go to Environment tab
   - Add all required variables from `.env`

4. **Deploy:**
   - Click "Create Web Service"
   - Render will build and deploy automatically

### 3. Setup MongoDB Atlas

1. **Create Cluster:**
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create free M0 cluster
   - Choose region closest to Render server

2. **Configure Access:**
   - Database Access → Add User
   - Network Access → Add IP (0.0.0.0/0 for Render)

3. **Get Connection String:**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/betx?retryWrites=true&w=majority
   ```

4. **Add to Render:**
   - Environment → MONGODB_URI → Paste connection string

### 4. Setup Redis

**Option A: Render Redis**
```yaml
# Add to render.yaml
  - type: redis
    name: betx-redis
    plan: starter
    maxmemoryPolicy: allkeys-lru
```

**Option B: Redis Cloud**
- Go to [redis.com/cloud](https://redis.com/try-free/)
- Create free database
- Copy connection URL
- Add to Render env: REDIS_URL

---

## 🌐 Frontend Deployment (Vercel)

### 1. Create `vercel.json`

Create in `betx-frontend/`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://betx-api.onrender.com",
    "NEXT_PUBLIC_SOCKET_URL": "wss://betx-api.onrender.com"
  },
  "regions": ["sin1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 2. Deploy to Vercel

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd betx-frontend
vercel
```

3. **Or via Dashboard:**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Select `betx-frontend` directory
   - Configure environment variables
   - Deploy

---

## 🔐 Environment Variables

### Backend (Render)

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://betx.vercel.app

# Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# JWT (Auto-generated by Render)
JWT_SECRET=auto-generated
JWT_REFRESH_SECRET=auto-generated

# Cashfree
CASHFREE_APP_ID=your_production_app_id
CASHFREE_SECRET_KEY=your_production_secret
CASHFREE_ENV=production

# Tatum
TATUM_API_KEY=your_production_key
TATUM_TESTNET=false

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15

# Game Config
MIN_BET_AMOUNT=10
MAX_BET_AMOUNT=100000
HOUSE_EDGE=0.02
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://betx-api.onrender.com
NEXT_PUBLIC_SOCKET_URL=wss://betx-api.onrender.com
NEXT_PUBLIC_CASHFREE_ENV=production
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 📊 Monitoring & Logging

### 1. Render Logs

```bash
# View logs
render logs betx-api

# Stream logs
render logs betx-api --tail
```

### 2. Error Tracking (Sentry)

```bash
npm install @sentry/node

# In server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### 3. Uptime Monitoring

- **UptimeRobot**: Free monitoring
- **Pingdom**: Advanced monitoring
- **Better Uptime**: Status pages

---

## 🔒 Security Checklist

- [ ] Environment variables secured
- [ ] HTTPS enabled (automatic on Render/Vercel)
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] MongoDB IP whitelist configured
- [ ] Redis password protected
- [ ] JWT secrets rotated
- [ ] API keys secured
- [ ] Webhook signatures verified
- [ ] Input validation on all endpoints

---

## 🚦 Health Checks

### Backend Health Endpoint

```javascript
// Already implemented in server.js
GET /health

Response:
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-14T08:00:00.000Z"
}
```

### Monitoring Script

```bash
# Check backend health
curl https://betx-api.onrender.com/health

# Check database connection
curl https://betx-api.onrender.com/api/health/db
```

---

## 📈 Scaling Strategy

### Horizontal Scaling

1. **Render Auto-Scaling:**
   - Upgrade to Standard plan
   - Enable auto-scaling
   - Set min/max instances

2. **Load Balancing:**
   - Render handles automatically
   - Socket.IO with Redis adapter

3. **Database Scaling:**
   - MongoDB Atlas auto-scales
   - Add read replicas
   - Enable sharding for large datasets

### Vertical Scaling

- Upgrade Render plan (Starter → Standard → Pro)
- Increase MongoDB cluster tier
- Upgrade Redis memory

---

## 💰 Cost Estimation

### Free Tier (Development)

- **Render**: Free tier (750 hrs/month)
- **MongoDB Atlas**: M0 Free (512MB)
- **Redis Cloud**: Free (30MB)
- **Vercel**: Free (Hobby plan)
- **Total**: $0/month

### Production (Small Scale)

- **Render**: Starter ($7/month)
- **MongoDB Atlas**: M10 ($57/month)
- **Redis**: Starter ($5/month)
- **Vercel**: Pro ($20/month)
- **Total**: ~$89/month

### Production (Medium Scale)

- **Render**: Standard ($25/month × 2)
- **MongoDB Atlas**: M30 ($240/month)
- **Redis**: Standard ($15/month)
- **Vercel**: Pro ($20/month)
- **Total**: ~$325/month

---

## 🎯 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] API documentation updated
- [ ] Security audit completed

### Deployment

- [ ] MongoDB Atlas cluster created
- [ ] Redis instance provisioned
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] Health checks passing

### Post-Deployment

- [ ] Smoke tests completed
- [ ] Monitoring configured
- [ ] Logs verified
- [ ] Performance tested
- [ ] Backup strategy implemented
- [ ] Domain configured (if custom)

---

## 🔧 Maintenance

### Daily

- Monitor error rates
- Check server health
- Review logs for anomalies

### Weekly

- Review performance metrics
- Check database size
- Update dependencies

### Monthly

- Security audit
- Backup verification
- Cost optimization review
- Performance optimization

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
- **Redis Cloud**: https://docs.redis.com/latest/rc/

---

**Ready for Production Deployment! 🚀**
