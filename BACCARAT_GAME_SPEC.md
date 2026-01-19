# Baccarat Game - Technical Specification & Implementation Guide

This document defines the technical specifications, rules, game flow, and architecture for the Real-Time Online Baccarat Casino Game. This specification is designed for a production-ready implementation using Next.js (Frontend), Node.js/Socket.IO (Backend), and Supabase (Database).

────────────────────────────
## 1. GAME OVERVIEW
────────────────────────────
- **Game Name:** Baccarat
- **Game Type:** Real-time multiplayer casino table game
- **Objective:** Players compete against the Banker (House) by betting on which hand (Player or Banker) will have a total closer to 9, or if there will be a Tie.
- **Cards Used:** 
  - Standard 52-card deck (No Jokers).
  - Decks are shuffled virtually using a cryptographically secure PRNG.
  - **Infinite Deck Model:** A fresh virtual deck (or multiple decks) is shuffled every single round.
  - **Values:**
    - Ace: 1
    - 2–9: Face Value
    - 10, Jack, Queen, King: 0
- **Game Outcome:** Determined by standard Baccarat drawing rules (Tableau).

**Disclaimer regarding Roadmaps:**
While the game displays "Bead Road", "Big Road", etc., these are for visual trend representation only. Because each round uses a freshly shuffled infinite deck, past results have **zero influence** on future outcomes. This must be clearly stated in the "How to Play" section to comply with regulated market standards.

────────────────────────────
## 2. CORE GAME RULES
────────────────────────────
The game logic must strictly follow these rules server-side.

### Hand Calculation
- Sum of cards modulo 10.
- Example: 7 + 8 = 15 -> **Score is 5**.
- Example: 10 + 9 = 19 -> **Score is 9** (Natural).

### The Deal
1. **Initial Deal:**
   - Card 1 -> Player
   - Card 2 -> Banker
   - Card 3 -> Player
   - Card 4 -> Banker
2. **Natural Win Check:**
   - If Player or Banker has a total of **8 or 9** with the first two cards, the round ends immediately (Natural Hand). No third cards are drawn.

### Third Card Rules (Tableau)
If neither has a Natural (8 or 9):

**Player's Rule:**
| Player's Total (2 Cards) | Action |
|--------------------------|--------|
| 0 - 5                    | Draws Third Card |
| 6 - 7                    | Stands |

**Banker's Rule:**
(When Player stands on 6 or 7, Banker draws on 0-5 and stands on 6-7).
When Player draws a third card, Banker acts based on Banker's Score and Player's Third Card:

| Banker's Score | Draws if Player's 3rd Card is: | Stands if Player's 3rd Card is: |
|----------------|-------------------------------|---------------------------------|
| 0, 1, 2        | Always Draws                  | Never Stands                    |
| 3              | 0, 1, 2, 3, 4, 5, 6, 7, 9     | 8                               |
| 4              | 2, 3, 4, 5, 6, 7              | 0, 1, 8, 9                      |
| 5              | 4, 5, 6, 7                    | 0, 1, 2, 3, 8, 9                |
| 6              | 6, 7                          | 0, 1, 2, 3, 4, 5, 8, 9          |
| 7              | Never Draws                   | Always Stands                   |

────────────────────────────
## 3. BETTING OPTIONS & PAYOUTS
────────────────────────────
Note: Commissions and multipliers should be configurable in environment variables.

| Bet Type | Payout | Commission | Verification |
|----------|--------|------------|--------------|
| **Player** | 1:1 (2.00x) | 0% | Player Total > Banker Total |
| **Banker** | 0.95:1 (1.95x)| 5% | Banker Total > Player Total |
| **Tie** | 8:1 (9.00x) | 0% | Banker Total == Player Total |

**CRITICAL RULE - TIE SCENARIO:**
If the result is a **TIE**:
1.  **Tie Bets** WIN and are paid 8:1.
2.  **Player Bets** are **PUSHED** (Refunded 100%).
3.  **Banker Bets** are **PUSHED** (Refunded 100%).
*They are NOT marked as 'LOST'.*

- **Side Bets (Optional/Future):** P Pair, B Pair (11:1).
- **Constraints:**
  - Bets accepted only during `BETTING` phase.
  - Min/Max bet limits must be enforced per currency.

────────────────────────────
## 4. GAME FLOW / ROUND WORKFLOW
────────────────────────────

### 1. Round Initialization (State: `PREPARING`)
- **Server:** 
  - Generates `serverSeed` (random 64-char hex text).
  - Broadcasts `round-start` event with `roundId` and `hash(serverSeed)`.
  - Timer set to T=15s (configurable).

### 2. Betting Phase (State: `BETTING`)
- **Frontend:**
  - Displays countdown timer.
  - Allows users to drag/click chips.
  - Sends `place-bet` socket events (must include `betId`).
- **Server:**
  - Validates balance & bet limits.
  - Checks `betId` for **idempotency** (ignore duplicates).
  - Deducts balance **atomically** (Wallet Service).
  - Broadcasts `bet-update` to all users.

### 3. Betting Close (State: `DEALING`)
- **Server:**
  - When timer hits 0, state changes.
  - Rejects new bets: `bet-reject` event.
  - Calculates Card Sequence (Provably Fair) using Rejection Sampling.

### 4. Card Dealing Logic
- The dealing is calculated instantly on the back-end but **revealed** over time (animations) to the frontend via socket events.
- **Dealing Sequence:**
  1. `deal-card` -> Player Card 1
  2. `deal-card` -> Banker Card 1
  3. `deal-card` -> Player Card 2
  4. `deal-card` -> Banker Card 2
  5. (If rule applies) `deal-card` -> Player Card 3
  6. (If rule applies) `deal-card` -> Banker Card 3

### 5. Result Calculation (State: `RESULT`)
- Determine Winner: `PLAYER` | `BANKER` | `TIE`.
- **Server:**
  - Broadcasts `game-result` with winner, winning numbers, and unhashed `serverSeed`.
  - **Payouts:**
    - Iterate through active bets.
    - **WIN:** If `bet.target == winner`, CREDIT (`betAmount * multiplier`).
    - **PUSH:** If `result == TIE` AND `bet.target != TIE`, REFUND (`betAmount`).
    - **LOSS:** Otherwise, set status to `LOST`.

### 6. History & Cleanup
- Update `History` array (Bead Road).
- Update `Trends` (percentage of P/B/T).
- Wait 3-5 seconds cooldown.
- Loop to Step 1.

────────────────────────────
## 5. REAL-TIME FEATURES (SOCKET.IO)
────────────────────────────
Namespace: `/baccarat`

**Backend Authority Rule:** 
The Frontend state is **NON-AUTHORITATIVE**. All timers, card values, and game states are dictated by the Server. Client events are mere requests.

| Event Name | Direction | Payload Example | Description |
|------------|-----------|-----------------|-------------|
| `game-status` | S -> C | `{ state: 'BETTING', timer: 12, dealingIndex: 0, ... }` | Sync state on connect |
| `round-start` | S -> C | `{ roundId: '...', hash: '...' }` | New round begins |
| `place-bet` | C -> S | `{ betId: 'uuid', amount: 100, target: 'PLAYER' }` | User bet attempt (Req `betId`) |
| `bet-accepted`| S -> C | `{ balance: 900, betId: 'uuid' }` | Confirms bet |
| `bet-update` | S -> C | `{ totals: { PLAYER: 5000, ... } }` | Update global pools |
| `deal-card` | S -> C | `{ hand: 'PLAYER', card: 'h5', value: 5, index: 1 }`| Card reveal |
| `game-result`| S -> C | `{ winner: 'PLAYER', serverSeed: '...' }`| Round end |

────────────────────────────
## 6. PROVABLY FAIR SYSTEM
────────────────────────────
To ensure true randomness without bias, we use **HMAC-SHA256** with **Rejection Sampling**. Naive modulo (`% 52`) introduces slight bias and is unacceptable for certified gaming.

**Algorithm:**
1. **Inputs:**
   - `Server Seed`: Random 64-char hex string.
   - `Client Seed`: Public string (or user contributed).
   - `Nonce`: Round Number.
2. **Generation Process:**
   - Calculate `hash = HMAC_SHA256(ServerSeed, ClientSeed + Nonce)`.
   - Take 4 bytes (8 hex chars) at a time.
   - Convert to Integer `X` (0 to 4,294,967,295).
   - **Rejection Sampling:**
     - If `X < 4,294,967,296 - (4,294,967,296 % 52)`, then `Card Index = X % 52`.
     - Else, discard `X` and take next 4 bytes (this removes the tiny bias where numbers don't divide evenly by 52).
3. **Verification:**
   - User receives `Hashed Server Seed` BEFORE betting.
   - User receives `Server Seed` AFTER round.
   - User can regenerate the shuffle to prove the game wasn't rigged.

**Card Mapping:**
- 0-12: Spades (A, 2...K)
- 13-25: Hearts
- 26-38: Clubs
- 39-51: Diamonds

────────────────────────────
## 7. BACKEND IMPLEMENTATION (Node.js)
────────────────────────────
### Engine Logic (`baccarat.engine.ts`)
```typescript
class BaccaratEngine {
  calculateHandValue(cards: Card[]): number {
    const sum = cards.reduce((acc, card) => {
      const val = card.rank > 9 ? 0 : card.rank; // 10,J,Q,K = 0
      return acc + val;
    }, 0);
    return sum % 10;
  }
  // ... (Standard Drawing Rules logic remains same) ...
}
```

### Wallet Atomicity & Idempotency
All balance changes must happen in a **Database Transaction**.

```sql
-- Pseudocode for Bet Placement (Atomicity)
BEGIN;
  -- Lock row to prevent race conditions
  SELECT balance FROM users WHERE id = 'user_abc' FOR UPDATE;
  
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM baccarat_bets WHERE bet_id = 'uuid_123') THEN
    ROLLBACK; -- Ignore duplicate request
    RETURN ALREADY_PROCESSED;
  END IF;

  -- Deduct Logic
  IF balance >= bet_amount THEN
    UPDATE users SET balance = balance - bet_amount WHERE id = 'user_abc';
    INSERT INTO baccarat_bets (...) VALUES (...);
    COMMIT;
  ELSE
    ROLLBACK; -- Insufficient funds
  END IF;
```

### Database Schema (Supabase/Postgres)
**`baccarat_rounds`**
- `id` (UUID)
- `server_seed` (Text)
- `server_hash` (Text)
- `result_json` (JSONB): Stores cards drawn, scores, winner.
- `created_at`

**`baccarat_bets`**
- `id` (UUID) - **Primary Key**
- `bet_id` (UUID) - **Client provided for Idempotency**
- `user_id` (UUID)
- `round_id` (UUID)
- `amount` (Numeric)
- `target` (Enum: 'PLAYER', 'BANKER', 'TIE')
- `payout` (Numeric)
- `status` (Enum: 'PENDING', 'WON', 'LOST', 'PUSHED')

────────────────────────────
## 8. FRONTEND RESPONSIBILITIES (Next.js)
────────────────────────────
**UI Components:**
- **Table Layout:** Canvas or SVG based table surface.
- **Card Sprites:** High-quality images for cards.
- **Roadmaps:** Visual-only history (Bead Plate, Big Road).
- **Chip Selector:** Bottom bar with denomination chips.

**Resiliency & Reconnection:**
- **On Reconnect:**
  - Socket emits `game-status`.
  - Content: `{ state: 'DEALING', cards: [c1, c2, c3], currentCardIndex: 2 }`.
  - Frontend Logic: **Fast-forward** checks.
    - "Do I show c1? Yes."
    - "Do I show c2? Yes."
    - "Do I show c3? Yes, animate it."
  - This ensures users syncing in the middle of a hand don't see "ghost cards" flipping out of order.

────────────────────────────
## 9. EDGE CASES & SAFETY
────────────────────────────
1. **Tie Refunds (Mandatory):** 
   - Ensure backend logic handles `PUSH` status correctly. Do not simply `RETURN`; you must Credit the original amount back to user balance.
2. **Late Bets:**
   - Server timestamp check > Betting End Time = Reject.
3. **Double Click / Network Lag:**
   - **Frontend:** Generate `betId` (UUID v4) for each click. Disable button until ACK.
   - **Backend:** Check `betId` uniqueness before processing.

────────────────────────────
## 10. GOAL: DEVELOPER CHECKLIST
────────────────────────────
- [ ] Implement `BaccaratEngine` logic (Unit Test this heavily).
- [ ] Create `baccarat.socket.ts` namespace with `betId` checks.
- [ ] Design Database Tables (`rounds`, `bets` with `bet_id` unique constraint).
- [ ] Build Frontend Table Component with Reconnect fast-forwarding.
- [ ] Integrate Wallet Service (Credit/Debit using Transactions).
- [ ] Implement **Rejection Sampling** in Provably Fair PRNG.
