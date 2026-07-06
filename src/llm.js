import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("../config.json", import.meta.url)),
);
const { baseUrl } = config.lmstudio;

let modelId = config.lmstudio.model;

export async function resolveModel() {
  if (modelId) return modelId;
  const res = await fetch(`${baseUrl}/models`);
  if (!res.ok)
    throw new Error(
      `LM Studio not reachable at ${baseUrl} — is the server running? (LM Studio > Developer > Start Server)`,
    );
  const { data } = await res.json();
  if (!data?.length)
    throw new Error("LM Studio is running but no model is loaded.");
  modelId = data[0].id;
  console.log(`Using model: ${modelId}`);
  return modelId;
}

export async function analyzeArticle({ title, content, feed }) {
  const model = await resolveModel();
  const text = (content || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 3000);

  const prompt = `You score news articles for one reader. Their interests, in their own words:
${config.interests.map((i) => `- ${i}`).join("\n")}

Article from ${feed}:
Title: ${title}
Body: ${text || "(no body available — judge from the title)"}

Respond with ONLY a JSON object, no markdown fences, no commentary:
{"summary": "<two plain sentences, factual, no hype>", "score": <integer 0-10, how much this reader will care>, "topic": "<one short lowercase tag, e.g. displays, ai, dev, security, business, other>"}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 400,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "article_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              score: { type: "integer", minimum: 0, maximum: 10 },
              topic: { type: "string" },
            },
            required: ["summary", "score", "topic"],
          },
        },
      },
    }),
  });
  if (!res.ok)
    throw new Error(`LM Studio error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Model returned no JSON: ${raw.slice(0, 120)}`);

  const parsed = JSON.parse(match[0]);
  return {
    summary: String(parsed.summary ?? "").slice(0, 500),
    score: Math.max(0, Math.min(10, Math.round(Number(parsed.score) || 0))),
    topic: String(parsed.topic ?? "other")
      .toLowerCase()
      .slice(0, 24),
  };
}
