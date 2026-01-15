-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    referral_code VARCHAR(50) UNIQUE,
    referred_by UUID REFERENCES users(id),
    avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('INR', 'BTC', 'ETH', 'TRON')),
    balance DECIMAL(20, 8) DEFAULT 0 CHECK (balance >= 0),
    locked_balance DECIMAL(20, 8) DEFAULT 0 CHECK (locked_balance >= 0),
    crypto_address VARCHAR(255),
    crypto_wallet_id VARCHAR(255),
    crypto_mnemonic TEXT,
    crypto_private_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'commission')),
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
    payment_method VARCHAR(20),
    payment_gateway VARCHAR(20),
    gateway_transaction_id VARCHAR(255),
    gateway_order_id VARCHAR(255),
    balance_before DECIMAL(20, 8),
    balance_after DECIMAL(20, 8),
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games Table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('dice', 'crash', 'mines', 'plinko', 'slots')),
    currency VARCHAR(10) NOT NULL,
    bet_amount DECIMAL(20, 8) NOT NULL,
    payout DECIMAL(20, 8) DEFAULT 0,
    multiplier FLOAT DEFAULT 0,
    profit DECIMAL(20, 8) DEFAULT 0,
    is_win BOOLEAN DEFAULT FALSE,
    result JSONB NOT NULL,
    server_seed VARCHAR(255) NOT NULL,
    server_seed_hash VARCHAR(255) NOT NULL,
    client_seed VARCHAR(255) NOT NULL,
    nonce INTEGER NOT NULL,
    revealed BOOLEAN DEFAULT FALSE,
    transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin QR Table
CREATE TABLE IF NOT EXISTS admin_qrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency VARCHAR(10) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    qr_code TEXT NOT NULL,
    upi_id VARCHAR(255),
    account_number VARCHAR(100),
    ifsc_code VARCHAR(50),
    account_holder_name VARCHAR(200),
    bank_name VARCHAR(200),
    crypto_address VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    min_amount DECIMAL(20, 8) DEFAULT 100,
    max_amount DECIMAL(20, 8) DEFAULT 100000,
    daily_limit DECIMAL(20, 8) DEFAULT 500000,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_wallets_user_currency ON wallets(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_type ON games(game_type);

-- Functions

-- Check Balance Function
CREATE OR REPLACE FUNCTION get_balance(p_user_id UUID, p_currency VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    SELECT balance INTO v_balance FROM wallets 
    WHERE user_id = p_user_id AND currency = p_currency;
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Deduct Balance Function (Atomic)
CREATE OR REPLACE FUNCTION deduct_balance(p_user_id UUID, p_amount DECIMAL, p_currency VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance DECIMAL;
    v_current_balance DECIMAL;
BEGIN
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM wallets
    WHERE user_id = p_user_id AND currency = p_currency
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
    END IF;

    UPDATE wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add Balance Function (Atomic)
CREATE OR REPLACE FUNCTION add_balance(p_user_id UUID, p_amount DECIMAL, p_currency VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance DECIMAL;
BEGIN
    SELECT id INTO v_wallet_id
    FROM wallets
    WHERE user_id = p_user_id AND currency = p_currency
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
         INSERT INTO wallets (user_id, currency, balance)
         VALUES (p_user_id, p_currency, p_amount)
         RETURNING balance INTO v_new_balance;
    ELSE
        UPDATE wallets
        SET balance = balance + p_amount,
            updated_at = NOW()
        WHERE id = v_wallet_id
        RETURNING balance INTO v_new_balance;
    END IF;

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Stats Function
CREATE OR REPLACE FUNCTION get_admin_stats(p_period VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_start_date TIMESTAMP WITH TIME ZONE;
    v_total_users INTEGER;
    v_active_users INTEGER;
    v_total_games INTEGER;
    v_total_tx INTEGER;
    v_pending_withdrawals INTEGER;
    v_revenue JSONB;
    v_games_by_type JSONB;
    v_tx_by_type JSONB;
BEGIN
    IF p_period = 'today' THEN
        v_start_date := date_trunc('day', NOW());
    ELSIF p_period = 'week' THEN
        v_start_date := NOW() - INTERVAL '7 days';
    ELSIF p_period = 'month' THEN
        v_start_date := NOW() - INTERVAL '1 month';
    ELSE
        v_start_date := '2000-01-01'::TIMESTAMP;
    END IF;

    SELECT COUNT(*) INTO v_total_users FROM users;
    SELECT COUNT(*) INTO v_active_users FROM users WHERE is_active = TRUE;
    SELECT COUNT(*) INTO v_total_games FROM games WHERE created_at >= v_start_date;
    SELECT COUNT(*) INTO v_total_tx FROM transactions WHERE created_at >= v_start_date;
    SELECT COUNT(*) INTO v_pending_withdrawals FROM transactions WHERE type = 'withdrawal' AND status = 'pending';

    SELECT jsonb_build_object(
        'totalBets', COALESCE(SUM(bet_amount), 0),
        'totalPayouts', COALESCE(SUM(payout), 0),
        'houseProfit', COALESCE(SUM(profit * -1), 0)
    ) INTO v_revenue
    FROM games
    WHERE created_at >= v_start_date;

    SELECT jsonb_agg(t) INTO v_games_by_type FROM (
        SELECT game_type as "id", count(*) as count, sum(bet_amount) as "totalBets", sum(payout) as "totalPayouts"
        FROM games WHERE created_at >= v_start_date GROUP BY game_type
    ) t;

    SELECT jsonb_agg(t) INTO v_tx_by_type FROM (
        SELECT type as "id", count(*) as count, sum(amount) as "totalAmount"
        FROM transactions WHERE created_at >= v_start_date GROUP BY type
    ) t;

    RETURN jsonb_build_object(
        'users', jsonb_build_object('total', v_total_users, 'active', v_active_users),
        'games', jsonb_build_object('total', v_total_games, 'byType', COALESCE(v_games_by_type, '[]'::jsonb)),
        'transactions', jsonb_build_object('total', v_total_tx, 'pending', v_pending_withdrawals, 'byType', COALESCE(v_tx_by_type, '[]'::jsonb)),
        'revenue', v_revenue
    );
END;
$$ LANGUAGE plpgsql;

-- Game Leaderboard Function
CREATE OR REPLACE FUNCTION get_game_leaderboard(p_game_type VARCHAR, p_limit INTEGER)
RETURNS TABLE (
    username VARCHAR,
    avatar TEXT,
    total_wins BIGINT,
    total_profit DECIMAL,
    biggest_win DECIMAL,
    biggest_multiplier FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.username,
        u.avatar,
        COUNT(*) as total_wins,
        SUM(g.profit) as total_profit,
        MAX(g.payout) as biggest_win,
        MAX(g.multiplier) as biggest_multiplier
    FROM games g
    JOIN users u ON g.user_id = u.id
    WHERE (p_game_type IS NULL OR g.game_type = p_game_type)
      AND g.is_win = TRUE
    GROUP BY u.id, u.username, u.avatar
    ORDER BY total_profit DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- User Stats Function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID, p_game_type VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'totalGames', COUNT(*),
        'totalWins', COUNT(*) FILTER (WHERE is_win = TRUE),
        'totalBet', COALESCE(SUM(bet_amount), 0),
        'totalPayout', COALESCE(SUM(payout), 0),
        'totalProfit', COALESCE(SUM(profit), 0),
        'biggestWin', COALESCE(MAX(payout), 0),
        'biggestMultiplier', COALESCE(MAX(multiplier), 0)
    ) INTO v_stats
    FROM games
    WHERE user_id = p_user_id
      AND (p_game_type IS NULL OR game_type = p_game_type);

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;
