import Parser from "rss-parser";
import { readFileSync } from "node:fs";
import {
  db,
  insertArticle,
  unprocessed,
  saveResult,
  markProcessed,
} from "./db.js";
import { analyzeArticle, resolveModel } from "./llm.js";
import { dedupe } from "./dedupe.js";

const config = JSON.parse(
  readFileSync(new URL("../config.json", import.meta.url)),
);
const feeds = JSON.parse(
  readFileSync(new URL("../feeds.json", import.meta.url)),
);
const parser = new Parser({ timeout: 30000 });

async function fetchFeeds() {
  let added = 0;
  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items ?? []) {
        const guid = item.guid || item.link || `${feed.name}:${item.title}`;
        const result = insertArticle.run(
          guid,
          feed.name,
          (item.title || "(untitled)").trim(),
          item.link ?? null,
          item.isoDate || item.pubDate || null,
          item.contentSnippet || item.content || null,
        );
        added += result.changes;
      }
      console.log(`✓ ${feed.name}`);
    } catch (err) {
      console.error(`✗ ${feed.name}: ${err.message}`);
    }
  }
  return added;
}

async function processNew() {
  await resolveModel();
  const batch = unprocessed.all(config.maxArticlesPerRun);
  console.log(`Processing ${batch.length} article(s)...`);
  let done = 0;
  for (const article of batch) {
    const dupeOf = dedupe(article);
    if (dupeOf) {
      markProcessed.run(article.id);
      done++;
      continue;
    }
    try {
      const result = await analyzeArticle(article);
      saveResult.run(result.summary, result.score, result.topic, article.id);
      done++;
      process.stdout.write(`\r${done}/${batch.length}`);
    } catch (err) {
      console.error(
        `\nSkipping "${article.title.slice(0, 60)}": ${err.message}`,
      );
    }
  }
  console.log(`\nDone. ${done}/${batch.length} processed.`);
}

const added = await fetchFeeds();
console.log(`${added} new article(s) fetched.`);
await processNew();
db.close();
