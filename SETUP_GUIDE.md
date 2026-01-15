# BetX Casino Platform - Complete Setup Guide

## 🎯 Backend Setup Complete!

### ✅ What's Been Created

#### **Core Infrastructure**
- ✅ Express.js server with Socket.IO
- ✅ MongoDB connection with Mongoose
- ✅ Redis integration for caching
- ✅ JWT authentication system
- ✅ Rate limiting & security middleware
- ✅ Error handling & logging

#### **Database Models**
- ✅ User (with authentication & security)
- ✅ Wallet (multi-currency support)
- ✅ Transaction (payment tracking)
- ✅ Game (provably fair system)

#### **API Routes**
- ✅ Authentication (register, login, refresh, logout)
- ✅ Wallet (placeholder)
- ✅ Games (placeholder)
- ✅ Admin (placeholder)

#### **Socket.IO Namespaces**
- ✅ Dice Game (fully functional)
- ⏳ Crash, Mines, Plinko, Slots (placeholders)

#### **Security Features**
- ✅ Password hashing (bcrypt)
- ✅ JWT tokens with refresh
- ✅ Token blacklisting
- ✅ Account locking after failed attempts
- ✅ Input validation & sanitization
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet security headers

#### **Provably Fair Gaming**
- ✅ Server seed generation
- ✅ Client seed support
- ✅ SHA-256 hashing
- ✅ Verifiable results

---

## 🚀 Quick Start

### 1. Prerequisites

Install the following:
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MongoDB** v6+ ([Download](https://www.mongodb.com/try/download/community))
- **Redis** v7+ ([Download](https://redis.io/download))

### 2. Start MongoDB

**Windows:**
```bash
# Start MongoDB service
net start MongoDB

# Or run manually
mongod --dbpath C:\data\db
```

**Mac/Linux:**
```bash
# Start MongoDB
sudo systemctl start mongod

# Or with Homebrew
brew services start mongodb-community
```

### 3. Start Redis

**Windows:**
```bash
# Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
# Run redis-server.exe
redis-server
```

**Mac:**
```bash
brew services start redis
```

**Linux:**
```bash
sudo systemctl start redis
```

### 4. Configure Environment

Edit `betx-backend/.env`:

```env
# Update these values
MONGODB_URI=mongodb://localhost:27017/betx
REDIS_URL=redis://localhost:6379

# Generate strong secrets (use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-generated-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here

# Payment gateways (get from respective dashboards)
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
TATUM_API_KEY=your_tatum_key
```

### 5. Start the Backend

```bash
cd betx-backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
✅ Redis Connected
🚀 Server running in development mode on port 5000
📡 Socket.IO server ready
```

---

## 🧪 Testing the API

### Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test@123456"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "Test@123456"
  }'
```

### Get User Profile

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🎮 Testing Dice Game (Socket.IO)

### Using JavaScript Client

```javascript
const io = require('socket.io-client');

// Connect to dice namespace
const socket = io('http://localhost:5000/dice', {
  auth: {
    token: 'YOUR_ACCESS_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected to dice game');

  // Play dice
  socket.emit('dice:play', {
    betAmount: 100,
    prediction: 'over',
    target: 50,
    currency: 'INR',
    clientSeed: 'my-random-seed'
  }, (response) => {
    console.log('Game result:', response);
  });
});
```

---

## 📊 Database Structure

### Collections Created Automatically

1. **users** - User accounts
2. **wallets** - Multi-currency wallets
3. **transactions** - Payment history
4. **games** - Game history with fairness proofs

### Indexes

Automatically created for optimal performance:
- `users`: username, email
- `wallets`: userId + currency
- `transactions`: userId, status, createdAt
- `games`: userId, gameType, createdAt

---

## 🔐 Security Checklist

- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT tokens expire (15min access, 7d refresh)
- ✅ Rate limiting on all routes
- ✅ Account locking after 5 failed attempts
- ✅ Input validation and sanitization
- ✅ CORS configured
- ✅ Helmet security headers
- ✅ Token blacklisting on logout

---

## 📈 Next Steps

### Immediate Tasks

1. **Setup MongoDB & Redis** locally
2. **Configure .env** with proper secrets
3. **Test authentication** endpoints
4. **Test dice game** via Socket.IO

### Development Roadmap

1. ✅ Core backend infrastructure
2. ⏳ Implement remaining games (Crash, Mines, Plinko, Slots)
3. ⏳ Wallet deposit/withdrawal system
4. ⏳ Cashfree payment integration
5. ⏳ Tatum crypto wallet integration
6. ⏳ Admin panel APIs
7. ⏳ Frontend development (Next.js)
8. ⏳ Deployment to Render

---

## 🛠️ Troubleshooting

### MongoDB Connection Failed

```bash
# Check if MongoDB is running
mongo --eval "db.adminCommand('ping')"

# Start MongoDB service
net start MongoDB
```

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### Port Already in Use

```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F
```

---

## 📞 Support

For issues or questions:
1. Check the logs in console
2. Verify MongoDB and Redis are running
3. Ensure .env is properly configured
4. Check that all dependencies are installed

---

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Server starts without errors
- ✅ MongoDB connection message appears
- ✅ Redis connection message appears
- ✅ You can register and login users
- ✅ Dice game responds to socket events
- ✅ Wallet balances update correctly

---

**Backend is now ready for development! 🚀**
