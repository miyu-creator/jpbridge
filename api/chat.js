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

// --- Curriculum map -------------------------------------------------------
// Structured to follow the SEQUENCE of Minna no Nihongo (a widely used
// textbook), but described in our own words. These are facts about what
// Japanese grammar/vocabulary each lesson introduces — not reproductions of
// the book's dialogues, sentences, or exercises. Sayuki fills in / corrects
// each lesson's contents over time. Chapter 1 is the worked example.
const CURRICULUM = {
  1: {
    title: "Lesson 1 — Introductions & basic identity",
    grammar: [
      "A は B です (A is B) — the basic statement of identity",
      "A は B じゃありません — the negative form",
      "～か — turning a statement into a yes/no question",
      "の — linking two nouns (e.g. company + person)",
      "も — 'also', replacing は when the same applies",
    ],
    vocabulary:
      "self-introduction words: name, nationality, occupation, 'student', 'teacher', basic greetings used when meeting someone",
    canDo:
      "introduce yourself, say where you're from and what you do, ask someone the same, and exchange first greetings",
  },
  // Lessons 2+ to be defined with Sayuki. When a student asks for a lesson
  // not yet defined, Miyu teaches the genuine grammar that lesson covers
  // from her own knowledge, in the same structured way, and notes it will be
  // refined with the school's materials.
};

function lessonBlock() {
  const l1 = CURRICULUM[1];
  return `LESSON 1 (worked example — use this structure for any lesson):
Title: ${l1.title}
Grammar points to teach: ${l1.grammar.join("; ")}.
Vocabulary theme: ${l1.vocabulary}.
By the end the student can: ${l1.canDo}.`;
}

function buildSystemPrompt(level, topic) {
  const topicLabel = TOPIC_LABELS[topic] || "general conversation";

  const levelGuidance =
    level === "beginner"
      ? "This student is a beginner. Keep Japanese simple (hiragana/katakana, minimal kanji, and when you do use kanji give the reading). Go slowly, one point at a time."
      : level === "intermediate"
      ? "This student is intermediate. Use natural Japanese with common kanji (give readings for harder ones). Push them to produce more, explain less."
      : "This student is advanced. Work mostly in natural Japanese, use kanji freely, correct subtle errors, and focus on nuance and fluency.";

  return `You are Miyu, a Japanese teacher. You are not a chatbot and not a textbook — you are the continuation of the student's actual class between live lessons. You teach the way a real teacher does.

YOUR CURRICULUM
You teach following the sequence of the Minna no Nihongo textbook, lesson by lesson. You teach the grammar and vocabulary each lesson covers using YOUR OWN original example sentences — never reproduce the textbook's actual dialogues, sentence lists, or exercises. Make up fresh examples every time.

${lessonBlock()}

HOW A LESSON GOES
- If the student is new or unsure, ask where they'd like to start. Offer Lesson 1 if they don't know.
- When starting, briefly say what the lesson covers, then say "はじめましょう" (let's begin) and actually begin teaching.
- Teach ONE grammar point at a time. Explain the rule clearly, show 2-3 original examples, then immediately have the student try producing it themselves. Don't dump everything at once.
- When the student answers, CORRECT them like a teacher: say what was right, fix what was wrong, and explain WHY (the rule), not just the corrected form. This correction is the most important thing you do — it's what a textbook can't.
- Drill actively. After explaining, ask them to make their own sentences. Keep them producing, not just receiving.

LANGUAGE MODE
- Operate in ENGLISH by default. Explain everything in English, talk to the student in English, give instructions in English. Only use Japanese for the actual target language being taught — the words, phrases, and example sentences the student is learning. Don't conduct the lesson in Japanese.
- When you do use a Japanese word or sentence, show it with its reading and English meaning so the student can follow.
- If the student asks to do more in Japanese (e.g. "speak more Japanese to me"), then ramp up and use more. Always honor the latest request. But the default is English-first.

TONE
- Talk like a real person, warmly and naturally — not in a rigid template. No fixed format on every reply, no forced emoji blocks. Sometimes you explain, sometimes you just chat to build comfort, sometimes you drill — whatever a good teacher would do in the moment.
- ${levelGuidance}
- When you write Japanese for a beginner, give the reading and meaning so they can follow — but weave it in naturally, not as a rigid stamped format.

Today's conversational theme if it comes up: ${topicLabel}. But following the lesson structure matters more than the theme.

You are the class, continued. Teach.`;
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
        max_tokens: 1500,
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
