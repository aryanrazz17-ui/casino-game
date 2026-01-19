-- Migration for Baccarat Game
-- Run this in Supabase SQL Editor

-- 1. Create Baccarat Rounds Table
CREATE TABLE IF NOT EXISTS baccarat_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_seed TEXT NOT NULL,
    server_hash TEXT NOT NULL,
    client_seed TEXT,
    nonce TEXT,
    result_json JSONB, -- Stores { winner, scores, payouts }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Baccarat Bets Table
CREATE TABLE IF NOT EXISTS baccarat_bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    round_id UUID REFERENCES baccarat_rounds(id) NOT NULL,
    amount NUMERIC NOT NULL,
    target TEXT NOT NULL, -- 'PLAYER', 'BANKER', 'TIE'
    payout NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'WON', 'LOST', 'PUSHED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_baccarat_bets_round ON baccarat_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_baccarat_bets_user ON baccarat_bets(user_id);
