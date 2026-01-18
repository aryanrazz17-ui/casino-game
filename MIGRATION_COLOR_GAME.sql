-- Migration to add 'color_prediction' to game_type check constraint
-- Run this in your Supabase SQL Editor

ALTER TABLE games DROP CONSTRAINT games_game_type_check;

ALTER TABLE games ADD CONSTRAINT games_game_type_check 
CHECK (game_type IN ('dice', 'crash', 'mines', 'plinko', 'slots', 'color_prediction', 'aviator', 'coinflip', 'wheel', 'keno'));
