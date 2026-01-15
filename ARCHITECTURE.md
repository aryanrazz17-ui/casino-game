# Online Casino Gaming Platform - Architecture Document

## 1. System Overview

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Payments**: Cashfree (INR), Tatum (Crypto)
- **Deployment**: Vercel (Frontend), Render (Backend)
- **Cache**: Redis (for sessions, game state)

---

## 2. Folder Structure

### Frontend (Next.js)
```
betx-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── games/
│   │   │   ├── dice/
│   │   │   ├── crash/
│   │   │   ├── mines/
│   │   │   ├── plinko/
│   │   │   └── slots/
│   │   ├── wallet/
│   │   └── profile/
│   ├── (admin)/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── transactions/
│   │   └── games/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── games/
│   ├── wallet/
│   └── admin/
├── lib/
│   ├── socket.ts
│   ├── api.ts
│   └── utils.ts
├── hooks/
│   ├── useSocket.ts
│   ├── useWallet.ts
│   └── useAuth.ts
├── store/
│   ├── authStore.ts
│   ├── walletStore.ts
│   └── gameStore.ts
├── types/
│   └── index.ts
└── public/
```

### Backend (Node.js)
```
betx-backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── env.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Wallet.js
│   │   ├── Transaction.js
│   │   ├── Game.js
│   │   └── AdminQR.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── walletController.js
│   │   ├── gameController.js
│   │   └── adminController.js
│   ├── services/
│   │   ├── payment/
│   │   │   ├── cashfree.service.js
│   │   │   └── tatum.service.js
│   │   ├── game/
│   │   │   ├── dice.service.js
│   │   │   ├── crash.service.js
│   │   │   ├── mines.service.js
│   │   │   ├── plinko.service.js
│   │   │   └── slots.service.js
│   │   └── wallet.service.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── rateLimit.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── wallet.routes.js
│   │   ├── game.routes.js
│   │   └── admin.routes.js
│   ├── socket/
│   │   ├── index.js
│   │   ├── namespaces/
│   │   │   ├── dice.js
│   │   │   ├── crash.js
│   │   │   ├── mines.js
│   │   │   ├── plinko.js
│   │   │   └── slots.js
│   │   └── middleware/
│   │       └── socketAuth.js
│   ├── utils/
│   │   ├── encryption.js
│   │   ├── validation.js
│   │   └── logger.js
│   └── server.js
├── .env
├── package.json
└── README.md
```

---

## 3. API Architecture

### REST API Endpoints

#### Authentication
```
POST   /api/auth/register          - User registration
POST   /api/auth/login             - User login
POST   /api/auth/logout            - User logout
POST   /api/auth/refresh           - Refresh JWT token
GET    /api/auth/me                - Get current user
POST   /api/auth/verify-email      - Email verification
POST   /api/auth/forgot-password   - Password reset request
```

#### Wallet Management
```
GET    /api/wallet/balance         - Get wallet balance
POST   /api/wallet/deposit         - Initiate deposit
POST   /api/wallet/withdraw        - Request withdrawal
GET    /api/wallet/transactions    - Transaction history
POST   /api/wallet/crypto/create   - Create crypto wallet
GET    /api/wallet/crypto/address  - Get crypto deposit address
```

#### Games
```
POST   /api/games/dice/play        - Play dice game
POST   /api/games/crash/bet        - Place crash bet
POST   /api/games/mines/start      - Start mines game
POST   /api/games/plinko/drop      - Drop plinko ball
POST   /api/games/slots/spin       - Spin slot machine
GET    /api/games/history          - Game history
GET    /api/games/leaderboard      - Leaderboard
```

#### Admin
```
GET    /api/admin/users            - List all users
PUT    /api/admin/users/:id        - Update user
GET    /api/admin/transactions     - All transactions
PUT    /api/admin/withdrawals/:id  - Approve/reject withdrawal
GET    /api/admin/stats            - Platform statistics
POST   /api/admin/qr/upload        - Upload payment QR
```

### Socket.IO Namespaces

```javascript
// Real-time game events
/dice       - Dice game namespace
/crash      - Crash game namespace
/mines      - Mines game namespace
/plinko     - Plinko game namespace
/slots      - Slots game namespace
/chat       - Global chat namespace
/admin      - Admin monitoring namespace
```

### Socket Events Structure
```javascript
// Client → Server
{
  event: 'game:bet',
  data: {
    gameType: 'dice',
    amount: 100,
    prediction: 'over',
    target: 50
  }
}

// Server → Client
{
  event: 'game:result',
  data: {
    gameId: 'uuid',
    result: 75,
    win: true,
    payout: 200,
    balance: 1500
  }
}
```

---

## 4. Database Schema (MongoDB)

### User Schema
```javascript
{
  _id: ObjectId,
  username: String (unique, indexed),
  email: String (unique, indexed),
  password: String (hashed),
  role: String (enum: ['user', 'admin']),
  isVerified: Boolean,
  isActive: Boolean,
  profile: {
    avatar: String,
    firstName: String,
    lastName: String,
    phone: String
  },
  security: {
    twoFactorEnabled: Boolean,
    twoFactorSecret: String,
    loginAttempts: Number,
    lockUntil: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Wallet Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', indexed),
  currency: String (enum: ['INR', 'BTC', 'ETH', 'TRON']),
  balance: Decimal128,
  lockedBalance: Decimal128,
  cryptoAddress: String,
  cryptoWalletId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', indexed),
  type: String (enum: ['deposit', 'withdrawal', 'bet', 'win', 'refund']),
  currency: String,
  amount: Decimal128,
  status: String (enum: ['pending', 'completed', 'failed', 'cancelled']),
  paymentMethod: String,
  paymentGateway: String,
  gatewayTransactionId: String,
  metadata: Object,
  createdAt: Date (indexed),
  updatedAt: Date
}
```

### Game Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', indexed),
  gameType: String (indexed),
  betAmount: Decimal128,
  payout: Decimal128,
  multiplier: Number,
  result: Object,
  isWin: Boolean,
  fairness: {
    serverSeed: String,
    clientSeed: String,
    nonce: Number,
    hash: String
  },
  createdAt: Date (indexed)
}
```

---

## 5. Security Best Practices

### Authentication & Authorization
- **JWT Tokens**: Access (15min) + Refresh (7days)
- **Password**: bcrypt with salt rounds 12
- **2FA**: TOTP-based authentication
- **Rate Limiting**: 100 req/15min per IP
- **Session Management**: Redis-based sessions

### Data Protection
- **Encryption at Rest**: MongoDB encryption
- **Encryption in Transit**: TLS 1.3
- **Sensitive Data**: AES-256 encryption
- **API Keys**: Environment variables only
- **CORS**: Whitelist frontend domain

### Game Fairness
- **Provably Fair**: Server seed + Client seed
- **Hash Verification**: SHA-256 hashing
- **Seed Rotation**: After each game
- **Public Verification**: Allow users to verify

### Payment Security
- **PCI Compliance**: No card data storage
- **Webhook Verification**: Signature validation
- **Transaction Limits**: Daily/monthly caps
- **KYC**: Identity verification for withdrawals
- **AML**: Transaction monitoring

### Infrastructure
- **DDoS Protection**: Cloudflare/Vercel
- **Input Validation**: Joi/Zod schemas
- **SQL Injection**: Mongoose sanitization
- **XSS Protection**: Content Security Policy
- **CSRF Protection**: SameSite cookies

---

## 6. Scalability Approach

### Horizontal Scaling
```
Load Balancer (Nginx/Vercel)
    ↓
[API Server 1] [API Server 2] [API Server 3]
    ↓
Redis Cluster (Session/Cache)
    ↓
MongoDB Replica Set (Primary + Secondaries)
```

### Caching Strategy
- **Redis**: User sessions, wallet balances, game state
- **CDN**: Static assets, images
- **API Cache**: GET endpoints (5-60s TTL)
- **Database**: Query result caching

### Database Optimization
- **Indexes**: userId, gameType, createdAt, status
- **Sharding**: By userId for large collections
- **Read Replicas**: Separate read/write operations
- **Aggregation Pipeline**: For analytics

### Socket.IO Scaling
```javascript
// Redis Adapter for multi-server Socket.IO
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Microservices (Future)
```
API Gateway
    ├── Auth Service
    ├── Wallet Service
    ├── Game Service
    ├── Payment Service
    └── Admin Service
```

### Performance Optimization
- **Connection Pooling**: MongoDB (max 100)
- **Lazy Loading**: Frontend components
- **Code Splitting**: Next.js automatic
- **Image Optimization**: Next.js Image
- **Compression**: Gzip/Brotli

---

## 7. Deployment Architecture

### Vercel (Frontend)
```
vercel.json:
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXT_PUBLIC_SOCKET_URL": "@socket-url"
  }
}
```

### Render (Backend)
```
render.yaml:
services:
  - type: web
    name: betx-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: REDIS_URL
        sync: false
```

### Environment Variables
```
# Backend (.env)
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Cashfree
CASHFREE_APP_ID=...
CASHFREE_SECRET_KEY=...
CASHFREE_ENV=production

# Tatum
TATUM_API_KEY=...
TATUM_TESTNET=false

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.betx.com
NEXT_PUBLIC_SOCKET_URL=wss://api.betx.com
```

---

## 8. Monitoring & Logging

### Tools
- **Application**: PM2 (process management)
- **Logging**: Winston + Morgan
- **Monitoring**: New Relic / DataDog
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics / Mixpanel

### Key Metrics
- API response time
- Socket connection count
- Database query performance
- Payment success rate
- Game fairness verification
- User engagement metrics

---

## 9. Development Workflow

1. **Local Development**: Docker Compose (MongoDB + Redis)
2. **Version Control**: Git + GitHub
3. **CI/CD**: GitHub Actions
4. **Testing**: Jest + Supertest + Playwright
5. **Code Quality**: ESLint + Prettier
6. **Documentation**: Swagger/OpenAPI

---

## Next Steps

1. Set up project repositories
2. Initialize Next.js and Express projects
3. Configure MongoDB and Redis
4. Implement authentication system
5. Build wallet integration
6. Develop game engines
7. Integrate payment gateways
8. Create admin panel
9. Deploy to staging
10. Security audit & testing
