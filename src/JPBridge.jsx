import { useState, useRef, useEffect } from "react";

const LEVELS = [
  { id: "beginner", label: "Beginner", jp: "初級", desc: "Simple words, lots of English help" },
  { id: "intermediate", label: "Intermediate", jp: "中級", desc: "Mix of Japanese and English" },
  { id: "advanced", label: "Advanced", jp: "上級", desc: "Mostly Japanese, minimal help" },
];

const TOPICS = [
  { id: "daily", label: "Daily Life", emoji: "🏠" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "culture", label: "Culture", emoji: "⛩️" },
];

export default function JPBridge() {
  const [level, setLevel] = useState("beginner");
  const [topic, setTopic] = useState("daily");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Browser TTS voices can load asynchronously; nudge them to load early.
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Pull out just the Japanese lines so Miyu speaks Japanese, not the romaji/English.
  function extractJapanese(text) {
    const lines = text.split("\n");
    const jpLines = lines.filter(line => /[\u3040-\u30ff\u4e00-\u9faf]/.test(line));
    // Strip leading emoji/symbols and bracketed notes, keep the Japanese text.
    const cleaned = jpLines
      .map(line => line.replace(/[🇯🇵📖💬📝✨🌸😊⛩️]/g, "").replace(/\[.*?\]/g, "").trim())
      .filter(Boolean)
      .join("。 ");
    return cleaned || text;
  }

  function speak(text) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const jp = extractJapanese(text);
    if (!jp) return;
    const utterance = new SpeechSynthesisUtterance(jp);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const jpVoice = voices.find(v => v.lang === "ja-JP" || v.lang.startsWith("ja"));
    if (jpVoice) utterance.voice = jpVoice;
    window.speechSynthesis.speak(utterance);
  }

  function toggleListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev ? prev + " " : "") + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function startConversation() {
    setStarted(true);
    setLoading(true);
    const greeting = await callClaude([], `The student just arrived. Greet them warmly in English as Miyu, their teacher. Ask where they'd like to start: a specific Minna no Nihongo lesson, or Lesson 1 if they're new. Keep it short, welcoming, and in English — don't start teaching yet, just open the class.`);
    setMessages([{ role: "assistant", content: greeting }]);
    setLoading(false);
    speak(greeting);
  }

  async function callClaude(history, userMessage) {
    const msgs = [...history, { role: "user", content: userMessage }];
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          topic,
          messages: msgs,
        }),
      });
      if (!res.ok) {
        return "Sorry, something went wrong on the server.";
      }
      const data = await res.json();
      return data.reply || "Sorry, something went wrong.";
    } catch {
      return "Connection error. Please try again.";
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    const reply = await callClaude(newMessages, userMsg);
    setMessages([...newMessages, { role: "assistant", content: reply }]);
    setLoading(false);
    speak(reply);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function reset() {
    setMessages([]);
    setStarted(false);
    setInput("");
  }

  const currentLevel = LEVELS.find(l => l.id === level);

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", color: "#E8E8E8", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0D1117 0%, #1A2332 100%)", borderBottom: "1px solid #3A2020", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "28px" }}>⛩️</div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#FFFFFF", letterSpacing: "-0.3px" }}>JP Bridge</div>
            <div style={{ fontSize: "12px", color: "#E14F4F", letterSpacing: "1.5px", textTransform: "uppercase" }}>Japanese Practice</div>
          </div>
        </div>
        {started && (
          <button onClick={reset} style={{ background: "transparent", border: "1px solid #2A3A4A", color: "#8899AA", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
            New Session
          </button>
        )}
      </div>

      {!started ? (
        /* Setup Screen */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: "32px", maxWidth: "520px", margin: "0 auto", width: "100%" }}>
          
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "42px", marginBottom: "12px" }}>日本語</div>
            <div style={{ fontSize: "22px", fontWeight: "600", color: "#FFFFFF", marginBottom: "8px" }}>Start Practising</div>
            <div style={{ fontSize: "14px", color: "#8899AA" }}>AI conversation with real Japanese teachers</div>
          </div>

          {/* Level Select */}
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: "11px", color: "#E14F4F", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Your Level</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {LEVELS.map(l => (
                <button key={l.id} onClick={() => setLevel(l.id)} style={{
                  background: level === l.id ? "#2A1414" : "#111920",
                  border: `1px solid ${level === l.id ? "#E14F4F" : "#3A2020"}`,
                  borderRadius: "10px", padding: "12px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  transition: "all 0.15s"
                }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: level === l.id ? "#E14F4F" : "#FFFFFF" }}>{l.label}</span>
                    <span style={{ fontSize: "13px", color: "#8899AA" }}>{l.jp}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#667788" }}>{l.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Topic Select */}
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: "11px", color: "#E14F4F", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Topic</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {TOPICS.map(t => (
                <button key={t.id} onClick={() => setTopic(t.id)} style={{
                  background: topic === t.id ? "#2A1414" : "#111920",
                  border: `1px solid ${topic === t.id ? "#E14F4F" : "#3A2020"}`,
                  borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
                  fontSize: "13px", color: topic === t.id ? "#E14F4F" : "#AABBCC",
                  display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s"
                }}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={startConversation} style={{
            background: "linear-gradient(135deg, #B5342E, #E14F4F)",
            border: "none", borderRadius: "12px", padding: "16px 48px",
            color: "#FFFFFF", fontSize: "16px", fontWeight: "600",
            cursor: "pointer", letterSpacing: "0.3px", width: "100%",
            boxShadow: "0 4px 20px rgba(225, 79, 79, 0.25)"
          }}>
            始めましょう — Let's Begin
          </button>
        </div>

      ) : (
        /* Chat Screen */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "640px", margin: "0 auto", width: "100%" }}>
          
          {/* Level badge */}
          <div style={{ padding: "10px 20px", borderBottom: "1px solid #3A2020", display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ background: "#2A1414", color: "#E14F4F", fontSize: "11px", padding: "3px 10px", borderRadius: "20px", fontWeight: "600", letterSpacing: "0.5px" }}>
              {currentLevel?.label} · {currentLevel?.jp}
            </span>
            <span style={{ background: "#111920", color: "#8899AA", fontSize: "11px", padding: "3px 10px", borderRadius: "20px" }}>
              {TOPICS.find(t => t.id === topic)?.emoji} {TOPICS.find(t => t.id === topic)?.label}
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #B5342E, #E14F4F)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginRight: "10px", flexShrink: 0, marginTop: "4px" }}>
                    ⛩️
                  </div>
                )}
                <div style={{
                  maxWidth: "80%",
                  background: msg.role === "user" ? "linear-gradient(135deg, #3D1A1A, #B5342E)" : "#111920",
                  border: `1px solid ${msg.role === "user" ? "#B5342E" : "#3A2020"}`,
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "12px 16px",
                  fontSize: "14px", lineHeight: "1.7", color: "#E8E8E8",
                  whiteSpace: "pre-wrap"
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #B5342E, #E14F4F)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>⛩️</div>
                <div style={{ background: "#111920", border: "1px solid #3A2020", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: "6px", alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E14F4F", animation: "pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #3A2020", background: "#0D1117" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type in English or Japanese..."
                rows={1}
                style={{
                  flex: 1, background: "#111920", border: "1px solid #3A2020",
                  borderRadius: "12px", padding: "12px 16px", color: "#E8E8E8",
                  fontSize: "14px", resize: "none", outline: "none",
                  fontFamily: "inherit", lineHeight: "1.5",
                  minHeight: "44px", maxHeight: "120px"
                }}
              />
              <button onClick={toggleListening} title={listening ? "Listening — tap to stop" : "Tap to speak Japanese"} style={{
                background: listening ? "linear-gradient(135deg, #B5342E, #E14F4F)" : "#111920",
                border: `1px solid ${listening ? "#E14F4F" : "#3A2020"}`, borderRadius: "12px", width: "44px", height: "44px",
                cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, animation: listening ? "micpulse 1.2s ease-in-out infinite" : "none"
              }}>
                🎤
              </button>
              <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
                background: loading || !input.trim() ? "#1A2332" : "linear-gradient(135deg, #B5342E, #E14F4F)",
                border: "none", borderRadius: "12px", width: "44px", height: "44px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", flexShrink: 0
              }}>
                →
              </button>
            </div>
            <div style={{ fontSize: "11px", color: "#445566", marginTop: "8px", textAlign: "center" }}>
              {listening ? "Listening… speak in Japanese" : "Type, or tap 🎤 to speak"}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
        @keyframes micpulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(225,79,79,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(225,79,79,0); }
        }
        * { box-sizing: border-box; }
        textarea:focus { border-color: #E14F4F !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3A2020; border-radius: 2px; }
      `}</style>
    </div>
  );
}
