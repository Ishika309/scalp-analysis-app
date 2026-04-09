import { useState, useRef, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Send, Bot, User, Loader, RotateCcw, Sparkles, Shield } from 'lucide-react';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // Free, fast model on Groq

const SYSTEM = `You are Dr. ScalpGuard — a friendly, expert AI dermatologist specialising in scalp and hair health for Indian patients.

You are a helpful skincare and haircare assistant. Your tone should always be warm, clear, and reassuring, like a caring expert speaking to someone who may be worried.

Keep every response limited to one focused paragraph only. Use simple, easy-to-understand language and avoid technical jargon unless necessary. Focus on giving practical, actionable advice that the user can actually follow.

Always include:

1 2 practical tips the user can start immediately
At least one simple home remedy that is safe and easy to do using common household ingredients

You may suggest types of products (e.g., gentle cleanser, oil-free moisturizer, anti-dandruff shampoo), but never mention specific product or brand names.

Be supportive but realistic. Do not make exaggerated claims or guarantees.

At the end of every response, gently remind the user that you are an AI assistant, not a doctor. If the issue sounds serious, painful, worsening, or persistent, advise them to consult a qualified dermatologist.

Avoid long explanations, avoid lists unless very short, and keep everything concise and helpful.`;

const QUICK = [
  'Why is my scalp so oily?', 'Best oil for hair growth?',
  'How to remove dandruff fast?', 'My hair is falling a lot — help!',
  'Suggest a daily hair care routine', 'Which shampoo for dry scalp?',
];

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: isUser ? 'var(--blue-light)' : 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        {isUser ? <User size={15} color="var(--blue)" /> : <Bot size={15} color="var(--text-2)" />}
      </div>
      <div className={isUser ? 'bubble-user' : 'bubble-ai'}
        style={{ maxWidth: '78%', padding: '12px 16px', fontSize: 14, lineHeight: 1.65, color: isUser ? '#fff' : 'var(--text-1)' }}>
        {msg.text}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm Dr. ScalpGuard 👨‍⚕️ — your AI hair and scalp specialist. Describe your concern and I'll give you expert, personalised advice. What's troubling you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        const q = query(
          collection(db, 'chats'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'asc'),
          limit(40)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setMessages(prev => [...prev, ...snap.docs.map(d => d.data())]);
        }
      } catch (e) { console.error(e); }
    })();
  }, [currentUser]);

  async function send(text) {
    const txt = (text || input).trim();
    if (!txt || loading) return;

    const uMsg = { role: 'user', text: txt };
    setMessages(prev => [...prev, uMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build message history for Groq (OpenAI-compatible format)
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role === 'model' ? 'assistant' : m.role, // handle old firebase messages
          content: m.text,
        }));

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM },
            ...history,
            { role: 'user', content: txt },
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Groq API error:', err);
        throw new Error(err.error?.message || 'API error');
      }

      const data = await response.json();
      const aiText = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      const aMsg = { role: 'assistant', text: aiText };

      setMessages(prev => [...prev, aMsg]);

      // Save to Firestore
      const ts = new Date().toISOString();
      await addDoc(collection(db, 'chats'), { ...uMsg, userId: currentUser.uid, createdAt: ts });
      await addDoc(collection(db, 'chats'), { ...aMsg, userId: currentUser.uid, createdAt: ts });

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I had a connection issue: ${e.message}. Please try again.` }]);
      console.error(e);
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <div className="card au" style={{ padding: '18px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-light)', border: '1px solid var(--blue-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 18 }}>Dr. ScalpGuard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div className="dot-online" />
              <span style={{ fontSize: 12, color: '#089e73', fontWeight: 600 }}>AI Hair Doctor · Online</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setMessages([{ role: 'assistant', text: 'Hello again! 👋 What would you like to know about your hair and scalp today?' }])}
          className="btn btn-ghost"
          style={{ fontSize: 13, padding: '8px 14px' }}>
          <RotateCcw size={13} /> New Chat
        </button>
      </div>

      {/* Quick prompts (only at start) */}
      {messages.length <= 1 && (
        <div className="card au" style={{ padding: '16px 20px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} /> Quick questions
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} className="btn btn-ghost" style={{ fontSize: 13, padding: '7px 14px', borderRadius: 99 }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="card" style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              <Bot size={15} color="var(--text-2)" />
            </div>
            <div className="bubble-ai" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Loader size={14} color="var(--text-3)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14, color: 'var(--text-3)' }}>Dr. ScalpGuard is thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ paddingTop: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Describe your hair or scalp concern…"
            className="input"
            style={{ flex: 1 }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{ width: 48, height: 48, padding: 0, flexShrink: 0 }}>
            <Send size={17} />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
          Dr. ScalpGuard is an AI assistant, not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  );
}
