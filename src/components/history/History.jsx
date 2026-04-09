import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Loader, ScanLine, ImageOff } from 'lucide-react';

const CC = { healthy:'#0abf8a', dandruff:'#f59e0b', thinning:'#ef4444', greasy:'#f97316' };
const CE = { healthy:'✅', dandruff:'⚠️', thinning:'🔴', greasy:'🟠' };

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const [scans,    setScans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const q = query(collection(db,'scans'), where('userId','==',currentUser.uid), orderBy('createdAt','desc'));
      const snap = await getDocs(q);
      setScans(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) {
      setError(e.code==='permission-denied'?'Permission denied. Check your Firestore rules.':'Could not load history. Check browser console.');
      console.error(e);
    }
    setLoading(false);
  }

  async function del(id) {
    if (!confirm('Delete this scan?')) return;
    setDeleting(id);
    try { await deleteDoc(doc(db,'scans',id)); setScans(p=>p.filter(s=>s.id!==id)); }
    catch(e) { alert('Could not delete.'); }
    setDeleting(null);
  }

  const counts = scans.reduce((a,s)=>{ if(s.topLabel) a[s.topLabel]=(a[s.topLabel]||0)+1; return a; },{});

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 0', gap:12 }}>
      <Loader size={28} color="var(--blue)" style={{ animation:'spin 1s linear infinite' }}/>
      <p style={{ color:'var(--text-2)', fontSize:14 }}>Loading your scan history…</p>
    </div>
  );

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      {/* Header */}
      <div className="au" style={{ marginBottom:28 }}>
        <h1 style={{ fontWeight:800, fontSize:'clamp(22px,3vw,32px)', letterSpacing:'-0.4px', marginBottom:4 }}>Scan History</h1>
        <p style={{ color:'var(--text-2)', fontSize:15 }}>{scans.length} scan{scans.length!==1?'s':''} recorded.</p>
      </div>

      {error && <div style={{ background:'var(--rose-light)', border:'1px solid rgba(239,68,68,.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:14, color:'var(--rose)' }} className="au">{error}</div>}

      {/* Summary */}
      {scans.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }} className="au d1">
          {[['healthy','#0abf8a'],['dandruff','#f59e0b'],['thinning','#ef4444'],['greasy','#f97316']].map(([k,c])=>(
            <div key={k} className="card" style={{ padding:'16px', textAlign:'center' }}>
              <p style={{ fontSize:22, marginBottom:4 }}>{CE[k]}</p>
              <p style={{ fontWeight:800, fontSize:26, color:c }}>{counts[k]||0}</p>
              <p style={{ fontSize:12, color:'var(--text-3)', textTransform:'capitalize', fontWeight:600 }}>{k}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {scans.length === 0 && !error && (
        <div className="card au" style={{ padding:60, textAlign:'center' }}>
          <div style={{ width:64,height:64,borderRadius:18,background:'var(--blue-light)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
            <Clock size={30} color="var(--blue)"/>
          </div>
          <h3 style={{ fontWeight:700, fontSize:20, marginBottom:8 }}>No scans yet</h3>
          <p style={{ color:'var(--text-2)', fontSize:15, marginBottom:24, maxWidth:300, margin:'0 auto 24px' }}>Your scan history will appear here. Take your first scan!</p>
          <Link to="/scanner" className="btn btn-primary"><ScanLine size={16}/> Go to Scanner</Link>
        </div>
      )}

      {/* Scan list */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {scans.map((scan,idx)=>{
          const c = CC[scan.topLabel] || '#94a3b8';
          return (
            <div key={scan.id} className={`card au`} style={{ padding:18, display:'flex', gap:16, animationDelay:`${idx*0.04}s` }}>
              {/* Thumbnail */}
              <div style={{ width:72,height:72,borderRadius:12,overflow:'hidden',flexShrink:0,background:'var(--surface-2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                {scan.imageBase64||scan.imageUrl
                  ? <img src={scan.imageBase64||scan.imageUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt=""/>
                  : <ImageOff size={22} color="var(--text-3)"/>}
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span className="badge" style={{ background:`${c}15`, color:c, border:`1px solid ${c}30`, textTransform:'capitalize' }}>
                      {CE[scan.topLabel]} {scan.topLabel||'Unknown'}
                    </span>
                    <span style={{ fontSize:13, color:'var(--text-3)', fontWeight:600 }}>
                      {Math.round((scan.topProbability||0)*100)}% confidence
                    </span>
                  </div>
                  <button onClick={()=>del(scan.id)} disabled={deleting===scan.id}
                    className="btn" style={{ padding:'6px', background:'none', border:'none', color:'var(--text-3)', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--rose)'}
                    onMouseLeave={e=>e.currentTarget.style.color='var(--text-3)'}>
                    {deleting===scan.id ? <Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Trash2 size={14}/>}
                  </button>
                </div>
                <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:10 }}>
                  {new Date(scan.createdAt).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                </p>
                {scan.predictions && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 20px' }}>
                    {[...scan.predictions].sort((a,b)=>b.probability-a.probability).map(p=>{
                      const pct = Math.round(p.probability*100);
                      const pc  = CC[p.className]||'#94a3b8';
                      return (
                        <div key={p.className} style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, color:'var(--text-3)', width:58, textTransform:'capitalize', fontWeight:500 }}>{p.className}</span>
                          <div className="progress-track" style={{ flex:1, height:5 }}>
                            <div className="progress-fill" style={{ width:`${pct}%`, background:pc }}/>
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:pc, width:28, textAlign:'right' }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
