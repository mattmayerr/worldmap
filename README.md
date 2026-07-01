# Sales Agent Assistant

An AI-powered sales practice and coaching app. Role-play with a simulated prospect, ask a coach how to handle tough situations, and tailor everything to your business with uploaded documents.

## Features

- **Practice mode** — The AI plays a realistic prospect with objections and pushback so you can rehearse calls, demos, and closes.
- **Coach mode** — Ask how to handle specific objections, deal stages, or scenarios and get structured advice.
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
```

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Business** (`/settings`) — Fill in your sales context.
2. **Documents** (`/documents`) — Upload product sheets, pricing CSVs, scripts, FAQs, etc.
3. **Chat** (`/`) — Switch between **Practice** and **Coach** modes.

Uploaded documents and your business profile are injected into every conversation automatically.

## Supported file types

| Type | Extensions |
|------|------------|
| PDF | `.pdf` |
| Spreadsheets | `.csv` |
| Text | `.txt`, `.md`, `.json` |

Documents are stored locally in `data/documents/`. Your profile is saved to `data/profile.json`.

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
