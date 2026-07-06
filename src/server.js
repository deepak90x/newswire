import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const app = express();

app.use(express.static(path.join(root, "public")));

const listArticles = db.prepare(`
  SELECT a.id, a.feed, a.title, a.link, a.published, a.summary, a.score, a.topic,
         (SELECT COUNT(*) FROM articles d WHERE d.duplicate_of = a.id) AS dupes
  FROM articles a
  WHERE a.processed = 1 AND a.duplicate_of IS NULL AND a.score IS NOT NULL
    AND a.created_at > datetime('now', '-7 days')
  ORDER BY a.score DESC, a.published DESC
  LIMIT 200
`);

app.get("/api/articles", (_req, res) => {
  res.json(listArticles.all());
});

const port = process.env.PORT || 4820;
app.listen(port, () => console.log(`Newswire dashboard: http://localhost:${port}`));
