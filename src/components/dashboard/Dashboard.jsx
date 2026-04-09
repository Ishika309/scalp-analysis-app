// src/components/dashboard/Dashboard.jsx
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { ScanLine, MessageCircleHeart, TrendingUp, Clock, ShoppingBag, ChevronRight, BarChart3, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { conditionMeta } from '../../data/products';

const condColors = { healthy: '#0abf8a', dandruff: '#f59e0b', thinning: '#ef4444', greasy: '#f97316' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 13 }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-1)' }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {p.value}%</p>)}
    </div>
  );
};

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [scans,   setScans]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db,'scans'), where('userId','==',currentUser.uid), orderBy('createdAt','desc'), limit(10));
        const snap = await getDocs(q);
        setScans(snap.docs.map(d => ({ id:d.id,...d.data() })));
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, [currentUser]);

  const name    = currentUser?.displayName?.split(' ')[0] || 'there';
  const last    = scans[0];
  const cc      = condColors[last?.topLabel] || '#4361ee';
  const chartData = [...scans].reverse().map((s,i) => ({
    name: `#${i+1}`,
    Healthy:  Math.round((s.predictions?.find(p=>p.className==='healthy')?.probability||0)*100),
    Dandruff: Math.round((s.predictions?.find(p=>p.className==='dandruff')?.probability||0)*100),
    Thinning: Math.round((s.predictions?.find(p=>p.className==='thinning')?.probability||0)*100),
    Greasy:   Math.round((s.predictions?.find(p=>p.className==='greasy')?.probability||0)*100),
  }));

  const stats = [
    { label:'Total Scans',    value: scans.length,                                ac1:'#4361ee',ac2:'#818cf8' },
    { label:'Last Condition', value: last?.topLabel || '—',                       ac1:'#0abf8a',ac2:'#34d399', caps:true },
    { label:'Confidence',     value: last ? `${Math.round((last.topProbability||0)*100)}%` : '—', ac1:'#f59e0b',ac2:'#fcd34d' },
    { label:'This Week',      value: scans.filter(s=>new Date(s.createdAt)>new Date(Date.now()-7*86400e3)).length + ' scans', ac1:'#ef4444',ac2:'#f87171' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin:'0 auto' }}>
      {/* Greeting */}
      <div className="au" style={{ marginBottom: 28 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--blue)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>
          {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
        </p>
        <h1 style={{ fontWeight:800, fontSize:'clamp(24px,3vw,36px)', letterSpacing:'-0.4px' }}>
          Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, {name} 👋
        </h1>
        <p style={{ color:'var(--text-2)', marginTop:4, fontSize:15 }}>Here's your scalp health overview.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
        {stats.map(({ label, value, ac1, ac2, caps }, i) => (
          <div key={label} className={`card stat-card au d${i+1}`} style={{ '--ac1':ac1,'--ac2':ac2, padding:20 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>{label}</p>
            <p style={{ fontWeight:800, fontSize:28, color:'var(--text-1)', textTransform: caps?'capitalize':'none', letterSpacing:'-0.5px' }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:24 }} className="lg:grid">
        {/* Chart */}
        {chartData.length > 1 ? (
          <div className="card au d2" style={{ padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <h2 style={{ fontWeight:700, fontSize:17 }}>Scalp Condition Trends</h2>
                <p style={{ fontSize:13, color:'var(--text-3)', marginTop:2 }}>Last {chartData.length} scans</p>
              </div>
              <Link to="/history" className="btn btn-ghost" style={{ fontSize:13, padding:'7px 14px' }}>
                See all <ChevronRight size={14}/>
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{top:5,right:5,bottom:0,left:-20}}>
                <defs>
                  {[['healthy','#0abf8a'],['dandruff','#f59e0b'],['thinning','#ef4444'],['greasy','#f97316']].map(([k,c])=>(
                    <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.18}/>
                      <stop offset="100%" stopColor={c} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-3)" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis stroke="var(--text-3)" tick={{fontSize:11}} axisLine={false} tickLine={false} unit="%"/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="Healthy"  stroke="#0abf8a" fill="url(#ghealthy)"  strokeWidth={2} dot={false}/>
                <Area type="monotone" dataKey="Dandruff" stroke="#f59e0b" fill="url(#gdandruff)" strokeWidth={2} dot={false}/>
                <Area type="monotone" dataKey="Thinning" stroke="#ef4444" fill="url(#gthinning)" strokeWidth={2} dot={false}/>
                <Area type="monotone" dataKey="Greasy"   stroke="#f97316" fill="url(#ggreasy)"   strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginTop:12 }}>
              {[['Healthy','#0abf8a'],['Dandruff','#f59e0b'],['Thinning','#ef4444'],['Greasy','#f97316']].map(([k,c])=>(
                <div key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:c }}/>
                  <span style={{ fontSize:12, color:'var(--text-2)' }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card au d2" style={{ padding:40, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:12 }}>
            <div style={{ width:56,height:56,borderRadius:16,background:'var(--blue-light)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <BarChart3 size={26} color="var(--blue)"/>
            </div>
            <h3 style={{ fontWeight:700, fontSize:17 }}>No trends yet</h3>
            <p style={{ color:'var(--text-2)', fontSize:14, maxWidth:240 }}>Take 2+ scans to see your scalp health trend chart.</p>
            <Link to="/scanner" className="btn btn-primary" style={{ marginTop:4 }}>
              <ScanLine size={15}/> Start Scanning
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { to:'/scanner',  icon:ScanLine,           label:'New Scan',     desc:'Analyze your scalp', c:'var(--blue)',   b:'var(--blue-light)',   br:'var(--blue-mid)' },
            { to:'/chat',     icon:MessageCircleHeart, label:'Hair Doctor',  desc:'AI dermatologist',   c:'#089e73',       b:'var(--teal-light)',   br:'rgba(10,191,138,.25)' },
            { to:'/products', icon:ShoppingBag,        label:'Products',     desc:'Top Indian brands',  c:'#b45309',       b:'var(--amber-light)',  br:'rgba(245,158,11,.25)' },
          ].map(({ to, icon:Icon, label, desc, c, b, br }) => (
            <Link key={to} to={to} className="card card-hover au"
              style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:14, textDecoration:'none' }}>
              <div style={{ width:40,height:40,borderRadius:10,background:b,border:`1px solid ${br}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <Icon size={18} color={c}/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:14, color:'var(--text-1)' }}>{label}</p>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>{desc}</p>
              </div>
              <ChevronRight size={16} color="var(--text-3)"/>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent scans */}
      {scans.length > 0 && (
        <div className="card au d3" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontWeight:700, fontSize:17 }}>Recent Scans</h2>
            <Link to="/history" className="btn btn-ghost" style={{ fontSize:13, padding:'7px 14px' }}>See all <ChevronRight size={14}/></Link>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {scans.slice(0,4).map(scan => {
              const c = condColors[scan.topLabel] || '#94a3b8';
              return (
                <div key={scan.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:12, background:'var(--surface-2)', border:'1px solid var(--border)' }}>
                  <div style={{ width:44,height:44,borderRadius:10,overflow:'hidden',flexShrink:0,background:'var(--bg)' }}>
                    {scan.imageBase64 ? <img src={scan.imageBase64} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt=""/> : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🔬</div>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <span className="badge" style={{ background:`${c}15`, color:c, border:`1px solid ${c}30`, textTransform:'capitalize' }}>
                        {scan.topLabel||'Unknown'}
                      </span>
                      <span style={{ fontSize:12, color:'var(--text-3)' }}>{Math.round((scan.topProbability||0)*100)}%</span>
                    </div>
                    <p style={{ fontSize:12, color:'var(--text-3)' }}>
                      {new Date(scan.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
