import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';

function getErr(code) {
  const m = {
    'auth/email-already-in-use':   'This email is already registered. Please sign in.',
    'auth/invalid-email':          'Invalid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/operation-not-allowed':  'Sign-up not enabled. Go to Firebase Console → Authentication → Enable Email/Password.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return m[code] || code;
}

export default function Signup() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { signup } = useAuth();
  const navigate   = useNavigate();

  async function submit(e) {
    e.preventDefault();
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setError(''); setLoading(true);
    try { await signup(email.trim(), password, name.trim()); navigate('/'); }
    catch (err) { console.error(err); setError(getErr(err.code)); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left */}
      <div className="hidden lg:flex" style={{
        width: '48%', flexDirection: 'column', justifyContent: 'space-between',
        background: 'linear-gradient(140deg, #0a9e73 0%, #0abf8a 60%, #34d399 100%)',
        padding: '48px 52px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>ScalpGuard <span style={{ fontWeight: 300 }}>AI</span></span>
        </div>
        <div style={{ color: '#fff' }}>
          <h1 style={{ fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 800, lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.5px' }}>
            Join thousands of<br />Indians with<br />healthier hair.
          </h1>
          <p style={{ fontSize: 16, opacity: 0.85, lineHeight: 1.65, marginBottom: 32 }}>
            Get your personalised scalp diagnosis and discover the exact products your hair needs — completely free.
          </p>
          {['Instant AI scalp diagnosis', 'Top Indian brand recommendations', 'Chat with AI Hair Doctor', 'Track progress with charts'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CheckCircle size={17} color="rgba(255,255,255,0.9)" />
              <span style={{ fontSize: 15, opacity: 0.9 }}>{f}</span>
            </div>
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>100% free · No credit card required</p>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="au">
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#4361ee,#3a56d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-1)' }}>ScalpGuard <span style={{ color: 'var(--blue)', fontWeight: 400 }}>AI</span></span>
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 28, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.4px' }}>Create account</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 28 }}>Free forever. No credit card needed.</p>

          {error && (
            <div style={{ background: 'var(--rose-light)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: 'var(--rose)' }} className="au">
              <strong style={{ display: 'block', marginBottom: 2 }}>Sign up failed</strong>{error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Full Name</label>
              <input type="text" value={name} required onChange={e => setName(e.target.value)} className="input" placeholder="Rohit Sharma" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} required autoComplete="email" onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} required autoComplete="new-password"
                  onChange={e => setPassword(e.target.value)} className="input" style={{ paddingRight: 48 }} placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-teal" style={{ width: '100%', padding: 14, fontSize: 15, marginTop: 4 }}>
              {loading
                ? <><svg style={{ width:18,height:18,animation:'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> Creating account…</>
                : <><span>Create Account</span><ArrowRight size={16}/></>}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
