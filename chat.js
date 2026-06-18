// This file runs on Vercel's servers, not in the browser.
// The ANTHROPIC_API_KEY environment variable is only readable here,
// so it never reaches the student's device.

const TOPIC_LABELS = {
  daily: "daily life",
  travel: "travel in Japan",
  food: "Japanese food",
  business: "business Japanese",
  culture: "Japanese culture",
};

function buildSystemPrompt(level, topic) {
  const topicLabel = TOPIC_LABELS[topic] || "general conversation";

  if (level === "beginner") {
    return `You are Sayuki, a warm and encouraging Japanese teacher from Tokyo. The student is a beginner.
Respond with very simple Japanese (hiragana + katakana only, no kanji).
Always provide romaji pronunciation below the Japanese.
Always provide a full English translation.
Keep sentences short (5-8 words max).
Topic focus: ${topicLabel}.
Format each response as:
🇯🇵 [Japanese]
📖 [Romaji]
💬 [English translation]
Then give a short encouraging tip or vocabulary note.`;
  }

  if (level === "intermediate") {
    return `You are Sayuki, a friendly Japanese teacher from Tokyo.
The student is intermediate level. Use a natural mix of Japanese including common kanji (always with furigana in brackets).
Provide English translation but encourage Japanese thinking.
Topic focus: ${topicLabel}.
Format each response as:
🇯🇵 [Japanese with furigana in brackets for kanji]
💬 [English translation]
Then add a grammar note or cultural tip when relevant.`;
  }

  return `You are Sayuki, an expert Japanese teacher from Tokyo.
The student is advanced. Respond primarily in natural Japanese. Use kanji freely.
Provide only brief English notes for nuanced expressions or cultural context.
Correct any errors the student makes naturally within your response.
Topic focus: ${topicLabel}.
Format each response as:
🇯🇵 [Natural Japanese]
📝 [Brief notes on nuance, corrections, or cultural context — in English, only what's essential]`;
}

const VALID_LEVELS = ["beginner", "intermediate", "advanced"];
const VALID_TOPICS = ["daily", "travel", "food", "business", "culture"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { level, topic, messages } = req.body || {};

  if (!VALID_LEVELS.includes(level) || !VALID_TOPICS.includes(topic) || !Array.isArray(messages)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  // Basic guardrails: cap history length and message size so a stray
  // request can't run up a huge bill.
  const trimmedMessages = messages.slice(-30).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 4000),
  }));

  const systemPrompt = buildSystemPrompt(level, topic);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: trimmedMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      res.status(502).json({ error: "Upstream API error" });
      return;
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, something went wrong.";
    res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
