# BetX Backend

Online Casino Gaming Platform - Backend API

## 🚀 Features

- **Authentication**: JWT-based auth with refresh tokens
- **Real-time Gaming**: Socket.IO for live game interactions
- **Multi-currency Wallets**: Support for INR, BTC, ETH, TRON
- **Provably Fair Games**: Cryptographic verification for game fairness
- **Payment Integration**: Cashfree (INR) and Tatum (Crypto)
- **Security**: Rate limiting, encryption, input validation
- **Scalability**: Redis caching, MongoDB indexing

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis >= 7.0

## 🛠️ Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
copy .env.example .env
```

4. Update `.env` with your configuration

## 🏃 Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📁 Project Structure

```
src/
├── config/         # Configuration files
├── models/         # MongoDB models
├── controllers/    # Route controllers
├── routes/         # API routes
├── middleware/     # Custom middleware
├── socket/         # Socket.IO handlers
├── services/       # Business logic
├── utils/          # Utility functions
└── server.js       # Entry point
```

## 🎮 Games Implemented

- ✅ **Dice** - Fully functional with provably fair system
- ⏳ **Crash** - Coming soon
- ⏳ **Mines** - Coming soon
- ⏳ **Plinko** - Coming soon
- ⏳ **Slots** - Coming soon

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Wallet (Coming Soon)
- `GET /api/wallet/balance`
- `POST /api/wallet/deposit`
- `POST /api/wallet/withdraw`

### Games (Coming Soon)
- `GET /api/games/history`
- `GET /api/games/leaderboard`

### Admin (Coming Soon)
- `GET /api/admin/stats`
- `GET /api/admin/users`

## 🔌 Socket.IO Namespaces

- `/dice` - Dice game
- `/crash` - Crash game
- `/mines` - Mines game
- `/plinko` - Plinko game
- `/slots` - Slots game

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT
