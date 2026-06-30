# AlgoBetAi Telegram Onboarding Bot 🤖

A production-ready Telegram bot built with **Node.js**, **TypeScript**, and **Telegraf** that automates the member-onboarding flow for a private Telegram channel — with age-gating, legal declarations, admin approval/rejection, and a PostgreSQL backend.

---

## Features

- 🔔 Listens for `chat_join_request` — auto-DMs users who request to join
- 🔞 Age gate (18+) with inline buttons
- 📋 Legal declaration with inline confirmation
- 💾 Saves user data automatically (no manual input from user)
- 👮 Admin notification with Approve / Reject inline buttons
- 📊 `/pending` — view all pending join requests
- 📥 `/export` — download a CSV of all completed onboardings
- 🔍 Channel ID auto-detect helper (forward a message → prints ID to console)

---

## Project Structure

```
algobet-onboarding-bot/
├── src/
│   ├── index.ts                  # Entry point & bot bootstrap
│   ├── types/
│   │   ├── index.ts              # Enums & interfaces
│   │   └── context.ts            # Telegraf context extension
│   ├── db/
│   │   └── index.ts              # PostgreSQL pool, query helper, initDb()
│   ├── services/
│   │   └── userRepository.ts     # All DB queries (upsert, update, fetch)
│   ├── handlers/
│   │   ├── start.ts              # /start command
│   │   ├── joinRequest.ts        # chat_join_request event
│   │   ├── onboarding.ts         # Inline button callbacks (age/statement/legal)
│   │   └── admin.ts              # Admin approve/reject + /pending + /export
│   └── utils/
│       ├── keyboards.ts          # Inline keyboard markup factories
│       ├── csv.ts                # CSV generator for /export
│       └── logger.ts             # Winston logger
├── schema.sql                    # PostgreSQL schema (applied automatically on startup)
├── .env.example                  # Environment variable template
├── railway.json                  # Railway deployment config
├── Procfile                      # Process file (Railway / Heroku)
├── tsconfig.json
└── package.json
```

---

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 (local or cloud — Railway provides this for free)
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Your bot must be added as an **Admin** to your private channel

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
BOT_TOKEN=your_bot_token_here
DATABASE_URL=postgresql://user:password@localhost:5432/algobet_bot
ADMIN_CHAT_ID=123456789
CHANNEL_ID=-1001234567890
NODE_ENV=production
```

| Variable        | How to get it |
|-----------------|---------------|
| `BOT_TOKEN`     | Talk to [@BotFather](https://t.me/BotFather) → `/newbot` |
| `DATABASE_URL`  | Railway auto-fills this if you add a Postgres plugin |
| `ADMIN_CHAT_ID` | Talk to [@userinfobot](https://t.me/userinfobot) — it replies with your Telegram user ID |
| `CHANNEL_ID`    | See the Channel ID helper section below |

### Channel ID Helper

The channel ID is a negative number like `-1001234567890`. To find it:

1. Start the bot locally with a partial `.env` (any placeholder `CHANNEL_ID` works for this step)
2. In Telegram, forward any message **from your private channel** to the bot
3. The bot will reply with the ID and also print it to the console:

```
==================================================
CHANNEL ID DETECTED: -1001234567890
Add this to your .env → CHANNEL_ID=-1001234567890
==================================================
```

4. Copy the value into your `.env` and restart.

---

## Local Development

```bash
# 1. Clone & install
git clone https://github.com/yourrepo/algobet-onboarding-bot.git
cd algobet-onboarding-bot
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Run in dev mode (auto-restarts on file changes)
npm run dev
```

### Run the schema manually (optional)

The bot runs `initDb()` on every startup, which creates the table automatically.
If you prefer to manage the schema yourself:

```bash
psql $DATABASE_URL -f schema.sql
```

---

## Production Build

```bash
npm run build   # Compiles TypeScript → dist/
npm start       # Runs dist/index.js
```

---

## Deploy to Railway (Recommended — Free Tier Available)

Railway gives you a free PostgreSQL database and always-on hosting.

### Step-by-step

1. **Create a Railway account** at [railway.app](https://railway.app) (GitHub login)

2. **New Project → Deploy from GitHub repo** — connect this repository

3. **Add a PostgreSQL plugin:**
   - Inside your Railway project → click **+ New** → **Database** → **PostgreSQL**
   - Railway automatically sets `DATABASE_URL` in your service's environment

4. **Set environment variables** in Railway:
   - Go to your service → **Variables** tab
   - Add `BOT_TOKEN`, `ADMIN_CHAT_ID`, `CHANNEL_ID`
   - `DATABASE_URL` is already set by the Postgres plugin

5. **Deploy** — Railway will run `npm run build && npm start` automatically (see `railway.json`)

6. **Verify** — check the Deploy Logs tab. You should see:
   ```
   AlgoBetAi Onboarding Bot is running!
   Username : @YourBotName
   ```

### Railway cost estimate

| Resource | Free tier |
|----------|-----------|
| Bot (Node.js service) | 500 hours/month free |
| PostgreSQL | 1 GB storage free |

For a low-traffic onboarding bot this is more than enough.

---

## Bot Setup Checklist

- [ ] Create bot via @BotFather and copy the token
- [ ] Get your Telegram user ID via @userinfobot
- [ ] Add the bot as **Administrator** to your private channel
  - Required permissions: **Invite Users**, **Manage Chat**
- [ ] Enable **Join Requests** on your channel (Channel Settings → Invite Links → Require admin approval)
- [ ] Fill in `.env` / Railway variables
- [ ] Start the bot and forward a channel message to get the `CHANNEL_ID`
- [ ] Test: click your invite link → tap "Request to Join" → check your DMs

---

## Admin Commands

| Command     | Description |
|-------------|-------------|
| `/pending`  | List all users whose onboarding is complete but not yet approved/rejected |
| `/export`   | Download a `.csv` of all completed onboardings |

---

## Onboarding Flow

```
User clicks invite link → taps "Request to Join"
         │
         ▼
[chat_join_request event]
         │
         ▼
Bot DMs user:
  Step 1 — Welcome message
  Step 2 — Age gate (YES / NO buttons)
         │
    NO ──┤── "Πρόσβαση απορρίφθηκε" → END
         │
        YES
         │
  Step 3 — Statement declaration (Confirm / Cancel buttons)
         │
  Cancel─┤── "Διαδικασία ακυρώθηκε" → END
         │
  Confirm
         │
  Step 4 — Data captured automatically (username, first_name, ID)
         │
  Step 5 — Legal notice ("Το κατάλαβα 👍" button)
         │
  Step 6 — DB saved (PENDING) → Admin notified
         │
         ▼
Admin receives notification with [Approve ✅] [Reject ❌]
         │
  Approve ──→ approveChatJoinRequest → User gets access + notification
  Reject  ──→ declineChatJoinRequest → User gets rejection message
```

---

## Database Schema

See `schema.sql` for the full schema. Key table:

```sql
users (
  id              SERIAL PRIMARY KEY,
  telegram_id     BIGINT UNIQUE,
  username        VARCHAR(255),
  first_name      VARCHAR(255),
  age_confirmed   BOOLEAN DEFAULT FALSE,
  legal_accepted  BOOLEAN DEFAULT FALSE,
  status          VARCHAR(50) DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED | DECLINED_AGE | CANCELLED
  onboarding_step VARCHAR(50) DEFAULT 'WELCOME',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
)
```

---

## Important Note on Bot DM Permissions

Telegram **does not allow bots to initiate a DM** unless the user has previously messaged the bot first. This means:

> If a user requests to join your channel but has **never messaged @YourBot**, the bot cannot send them the onboarding DM.

**Solution:** Add a note to your channel invite link or bio saying:
> "Πριν κάνεις αίτηση, στείλε /start στο @YourBotUsername"

This ensures the DM channel is open when the join request fires.

---

## License

MIT — use freely for your own projects.
