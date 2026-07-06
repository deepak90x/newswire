# Newswire

A self-hosted, AI-curated news feed. RSS articles flow into SQLite, a local LLM
(via [LM Studio](https://lmstudio.ai)) summarizes each story, scores it 0–10
against your stated interests, and tags it by topic. A ranked dashboard shows
the result. Everything runs on your machine — no cloud APIs, no accounts, no
data leaving localhost.

## How it works

```
RSS feeds → SQLite → local LLM (summary + relevance score + topic) → dashboard
```

Duplicate stories across outlets are detected by title similarity and folded
into a single entry with a "+N more sources" badge.

## Requirements

- Node.js 24+
- LM Studio with any instruct model downloaded (12B-class works well;
  4B-class is usually sufficient and much faster)

## Setup

```bash
npm install
```

In LM Studio: load your model, then Developer tab → toggle the server on
(default: http://localhost:1234).

## Usage

```bash
npm run ingest   # fetch feeds, dedupe, summarize + score new articles
npm start        # dashboard at http://localhost:4820
```

Re-run `ingest` whenever you want fresh stories. Already-seen articles are
skipped; only new ones cost LLM time.

## Configuration

- **`feeds.json`** — your sources. Any RSS/Atom URL works.
- **`config.json`**
  - `interests` — a plain-English list the model scores against. This is the
    entire personalization mechanism; write it in your own words.
  - `lmstudio.model` — leave empty to auto-use whatever model is loaded.
  - `dedupe.titleSimilarityThreshold` — raise toward 0.7 if distinct stories
    get merged, lower toward 0.4 if repeats slip through.
  - `maxArticlesPerRun` — cap on LLM calls per ingest.

## Automating (optional)

Ingest every morning at 8 via cron (`crontab -e`):

```
0 8 * * * cd /path/to/newswire && /opt/homebrew/bin/node src/ingest.js >> ingest.log 2>&1
```

LM Studio must be running with the server on for scoring; feed fetching still
succeeds without it, and articles queue as unprocessed until a model is
available.

## Notes

- All data lives in `newswire.db`. Delete it to start over (e.g. to re-score
  everything after rewriting your interests).
- The dashboard shows the last 7 days, ranked by score.
- Feeds that ship no article body (e.g. Hacker News) are scored from the
  title alone, so their summaries are vaguer by nature.

## License

GPL-3.0 — see [LICENSE](LICENSE).
