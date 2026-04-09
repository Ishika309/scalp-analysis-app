// src/components/auth/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Eye, EyeOff, ArrowRight, ScanLine, Zap, BarChart3 } from 'lucide-react';

function getErr(code) {
  const m = {
    'auth/user-not-found':        'No account with this email. Please sign up.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/invalid-email':         'Invalid email address.',
    'auth/invalid-credential':    'Incorrect email or password.',
    'auth/too-many-requests':     'Too many attempts. Wait a few minutes.',
    'auth/network-request-failed':'Network error. Check your connection.',
    'auth/operation-not-allowed': 'Email/Password login not enabled. Go to Firebase Console → Authentication → Sign-in method → Enable Email/Password.',
  };
  return m[code] || code;
}

const features = [
  { icon: ScanLine,  label: 'AI Scalp Analysis',        desc: 'Instant diagnosis from a photo' },
  { icon: Zap,       label: 'Personalised Advice',       desc: 'Products matched to your condition' },
  { icon: BarChart3, label: 'Track Your Progress',       desc: 'Charts of scalp health over time' },
];

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email.trim(), password); navigate('/'); }
    catch (err) { console.error(err); setError(getErr(err.code)); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex" style={{
        width: '48%', flexDirection: 'column', justifyContent: 'space-between',
        background: 'linear-gradient(140deg, #2d4be0 0%, #4361ee 50%, #3b82f6 100%)',
        padding: '48px 52px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background shapes */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} color="#fff" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.3px' }}>ScalpGuard</span>
            <span style={{ fontWeight: 300, fontSize: 20, color: 'rgba(255,255,255,0.8)' }}> AI</span>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ color: '#fff' }}>
          <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 16 }}>AI-Powered Scalp Health</p>
          <h1 style={{ fontSize: 'clamp(32px, 3.5vw, 44px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.5px' }}>
            Understand your<br />scalp. Treat it<br />right.
          </h1>
          <p style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.65, marginBottom: 36 }}>
            Upload a photo, get an instant AI diagnosis and discover the best Indian products for your specific condition.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color="#fff" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{label}</p>
                  <p style={{ fontSize: 13, opacity: 0.7, marginTop: 1 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Powered by Google Gemini & Teachable Machine · 100% Free</p>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="au">
          {/* Mobile logo */}
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#4361ee,#3a56d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-1)' }}>ScalpGuard <span style={{ color: 'var(--blue)', fontWeight: 400 }}>AI</span></span>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: 28, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.4px' }}>Welcome back</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 28 }}>Sign in to continue your scalp health journey</p>

          {error && (
            <div style={{ background: 'var(--rose-light)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: 'var(--rose)' }} className="au">
              <strong style={{ display: 'block', marginBottom: 2 }}>Sign in failed</strong>{error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} required autoComplete="email"
                onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} required autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)} className="input" style={{ paddingRight: 48 }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 4 }}>
              {loading
                ? <><svg style={{ width:18,height:18,animation:'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> Signing in…</>
                : <><span>Sign In</span><ArrowRight size={16}/></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-3)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>Create one free →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
