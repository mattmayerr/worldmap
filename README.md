# Sales Agent Assistant

An AI-powered sales practice and coaching app. Role-play with a simulated prospect, ask a coach how to handle tough situations, and tailor everything to your business with uploaded documents.

## Features

- **Practice mode** — The AI plays a realistic prospect with objections and pushback so you can rehearse calls, demos, and closes.
- **Coach mode** — Ask how to handle specific objections, deal stages, or scenarios and get structured advice.
- **Knowledge mode** — Ask questions about your company, plans, and policies grounded in your documents.
- **User accounts** — Agents sign in to save practice sessions and review them from home or work.
- **Admin dashboard** — View team metrics, create agent accounts, and spot weak objections across the team.
- **Business profile** — Configure your company, product, target customer, value prop, and common objections.
- **Document uploads** — Feed PDFs, CSVs, and text files so responses stay grounded in your real materials.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and add your OpenAI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
AUTH_SECRET=a-long-random-string-at-least-16-chars
ADMIN_EMAIL=you@yourcompany.com
ADMIN_PASSWORD=your-secure-password
```

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

4. **Sign in as admin** using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env.local`. The first admin account is created automatically.

5. **Create agent accounts** from the Admin dashboard (`/admin`). Agents can log in from any device — their practice sessions are saved to their account.

## Usage

1. **Business** (`/settings`) — Fill in your sales context.
2. **Documents** (`/documents`) — Upload product sheets, pricing CSVs, scripts, FAQs, etc.
3. **Chat** (`/`) — Switch between **Practice**, **Coach**, and **Knowledge** modes.
4. **History** (`/history`) — Review saved practice sessions and scores.
5. **Admin** (`/admin`) — Team metrics, agent performance, and account management (admin only).

Uploaded documents and your business profile are injected into every conversation automatically.

## Supported file types

| Type | Extensions |
|------|------------|
| PDF | `.pdf` |
| Spreadsheets | `.csv` |
| Text | `.txt`, `.md`, `.json` |

Documents are stored locally in `data/documents/`. Your profile is saved to `data/profile.json`. User accounts live in `data/users.json` and practice sessions in `data/practice-sessions/` (all gitignored).

## Tech stack

- Next.js 14 (App Router)
- OpenAI API (streaming chat)
- Tailwind CSS

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
