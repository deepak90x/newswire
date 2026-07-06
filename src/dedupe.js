import { readFileSync } from "node:fs";
import { recentOriginals, markDuplicate } from "./db.js";

const config = JSON.parse(readFileSync(new URL("../config.json", import.meta.url)));
const STOP = new Set(["the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "is", "are", "its", "with", "at", "by", "from", "as", "new"]);

function tokens(title) {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function dedupe(article) {
  const mine = tokens(article.title);
  const lookback = `-${config.dedupe.lookbackDays} days`;
  for (const other of recentOriginals.all(article.id, lookback)) {
    if (jaccard(mine, tokens(other.title)) >= config.dedupe.titleSimilarityThreshold) {
      markDuplicate.run(other.id, article.id);
      return other.id;
    }
  }
  return null;
}
