# Newswire

A local AI-curated news feed. RSS in → SQLite → your LM Studio model summarizes,
scores against your interests, and tags each story → ranked dashboard at localhost.
Nothing leaves your machine.

## Prerequisites

- Node 24+ (you have 26.4.0 — good)
- LM Studio with a model loaded and the local server running:
  LM Studio → Developer tab → Start Server (default port 1234)

## Setup

```
cd newswire
npm install
```

## Use

```
npm run ingest   # fetch feeds, dedupe, summarize + score new articles
npm start        # dashboard at http://localhost:4820
```

Run `ingest` whenever you want fresh stories. First run processes everything
currently in the feeds (~60 articles by default), so it takes a few minutes on
a 12B model; later runs only touch new items.

## Configure

- `feeds.json` — add/remove sources. Any RSS/Atom URL works.
- `config.json`
  - `interests` — plain-English list the model scores against. Rewrite freely;
    this is the whole personalization mechanism.
  - `lmstudio.model` — leave empty to auto-use whatever model is loaded.
  - `dedupe.titleSimilarityThreshold` — raise toward 0.7 if distinct stories
    get merged, lower toward 0.4 if obvious repeats slip through.
  - `maxArticlesPerRun` — cap on LLM calls per ingest.

## Automate (optional)

To ingest every morning at 8, add a cron entry (`crontab -e`):

```
0 8 * * * cd /path/to/newswire && /opt/homebrew/bin/node src/ingest.js >> ingest.log 2>&1
```

LM Studio must be open with the server running for the LLM step to work;
fetching still succeeds without it and articles queue up as unprocessed.

## Notes

- Database is `newswire.db` in the project root. Delete it to start over.
- Dashboard shows the last 7 days, ranked by score. Duplicates are folded into
  the earliest version with a "+N more sources" badge.
- Dedupe is title-similarity only (fast, free). If it's not good enough,
  the upgrade path is embeddings via LM Studio's /v1/embeddings endpoint.
