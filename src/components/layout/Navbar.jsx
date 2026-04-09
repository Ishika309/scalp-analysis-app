import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ScanLine, LayoutDashboard, History, ShoppingBag,
  MessageCircleHeart, LogOut, User, Menu, X, Shield, Zap,
} from 'lucide-react';

const links = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scanner',  label: 'Analyze',   icon: ScanLine        },
  { to: '/chat',     label: 'Hair Doctor', icon: MessageCircleHeart },
  { to: '/history',  label: 'History',   icon: History         },
  { to: '/products', label: 'Products',  icon: ShoppingBag     },
];

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu,   setUserMenu]   = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (currentUser?.email?.[0] || 'U').toUpperCase();

  return (
    <>
      {/* ─── Desktop top bar ───────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 8 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #4361ee, #3a56d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(67,97,238,0.30)',
            }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-1)', letterSpacing: '-0.3px' }}>ScalpGuard</span>
              <span style={{ fontWeight: 400, fontSize: 17, color: 'var(--blue)' }}> AI</span>
            </div>
          </Link>

          {/* Status dot - desktop */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'var(--teal-light)', border: '1px solid rgba(10,191,138,0.2)', marginRight: 'auto' }}>
            <div className="dot-online" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#089e73' }}>Ready</span>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 2 }}>
            {links.map(({ to, label }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to} className={`nav-link ${active ? 'active' : ''}`}>
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User avatar */}
          <div style={{ position: 'relative', marginLeft: 8 }}>
            <button
              onClick={() => setUserMenu(!userMenu)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4361ee, #0abf8a)',
                color: '#fff', fontWeight: 700, fontSize: 13,
                border: '2px solid var(--blue-mid)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {initials}
            </button>
            {userMenu && (
              <div style={{
                position: 'absolute', top: 44, right: 0, minWidth: 220,
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 14, boxShadow: 'var(--shadow-lg)', padding: 8, zIndex: 200,
              }} className="as">
                <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{currentUser?.displayName || 'User'}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{currentUser?.email}</p>
                </div>
                <button onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 12px', borderRadius: 8, border: 'none', background: 'none',
                    color: 'var(--rose)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--rose-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}
            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)' }}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div style={{ borderTop: '1px solid var(--border)', background: '#fff', padding: '8px 16px 16px' }} className="md:hidden au">
            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                  className={`nav-link ${active ? 'active' : ''}`}
                  style={{ marginBottom: 4, width: '100%' }}>
                  <Icon size={16} /> {label}
                </Link>
              );
            })}
            <hr className="divider" style={{ margin: '8px 0' }} />
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: 'none', background: 'none', color: 'var(--rose)', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}
      </header>

      {/* ─── Mobile bottom nav ──────────────────────────────────────────── */}
      <nav className="mobile-nav md:hidden">
        {links.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to} className={`mn-item ${active ? 'active' : ''}`}>
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
