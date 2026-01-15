# Migration from MongoDB to Supabase (COMPLETED)

This backend has been **FULLY MIGRATED** to use Supabase (PostgreSQL).

## Completed Changes
1. **Server Entry (`server.js`)**: Removed MongoDB, added Supabase check, Redis optional.
2. **Config**: Added `supabase.js` client.
3. **Database Schema**: `supabase_schema.sql` contains all tables and Atomic RPC functions.
4. **Services**:
    - `wallet.service.js`: Uses atomic PostgreSQL functions `deduct_balance` / `add_balance`.
    - `authController.js`: Uses `users` table.
    - `adminController.js`: Uses SQL queries and RPCs for stats.
    - `walletController.js`: Uses `wallets` and `transactions` tables.
    - `gameController.js`: Uses `games` table and RPCs.
5. **Game Sockets** (ALL Migrated):
    - `dice.js`
    - `crash.js`
    - `mines.js`
    - `plinko.js`
    - `slots.js`
6. **Middleware**:
    - `auth.js` & `socketAuth.js`: Updated to verify tokens against Supabase users.

## How to Run
1. **Database Setup**:
   - Go to your Supabase SQL Editor.
   - Run the content of `supabase_schema.sql`.
   - This creates tables (`users`, `wallets`, `games`, `transactions`, `admin_qrs`) and necessary Functions.

2. **Environment**:
   - Ensure `.env` has:
     ```
     SUPABASE_URL=your_project_url
     SUPABASE_SERVICE_KEY=your_service_role_key
     ```

3. **Start Server**:
   ```bash
   npm run dev
   ```

4. **Redis**:
   - Ensure Redis is running locally for caching (Optional but recommended).

## Atomic Wallet Operations
The wallet operations are now atomic via Postgres Functions:
- `deduct_balance(user_id, amount, currency)`
- `add_balance(user_id, amount, currency)`

## Admin Panel
The Admin Panel APIs are fully functional and query the PostgreSQL database directly.
Admin stats are aggregated via the `get_admin_stats` RPC function for performance.
