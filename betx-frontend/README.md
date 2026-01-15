# BetX Frontend

Modern Next.js frontend for the BetX online casino gaming platform.

## 🚀 Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Socket.IO** for real-time gaming
- **Axios** for API calls
- **React Hot Toast** for notifications

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## 🛠️ Installation

```bash
npm install
```

## 🏃 Running

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## 📁 Project Structure

```
app/
├── auth/           # Authentication pages
├── games/          # Game pages
├── wallet/         # Wallet management
├── profile/        # User profile
└── admin/          # Admin panel

lib/
├── api.ts          # API client
└── socket.ts       # Socket.IO client

store/
├── authStore.ts    # Authentication state
├── walletStore.ts  # Wallet state
└── gameStore.ts    # Game state

types/
└── index.ts        # TypeScript types
```

## 🔐 Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## 🎮 Available Pages

- `/` - Landing page
- `/auth/login` - Login
- `/auth/register` - Register
- `/games` - Game lobby (coming soon)
- `/games/dice` - Dice game (coming soon)
- `/wallet` - Wallet (coming soon)

## 📝 License

MIT
