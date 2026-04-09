import { useRef, useState, useCallback } from 'react';
import * as tmImage from '@teachablemachine/image';
import Webcam from 'react-webcam';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  Camera, Upload, ScanLine, RotateCcw, CheckCircle,
  AlertCircle, Loader, Info, Zap,
} from 'lucide-react';
import Products from '../products/Products';
import { conditionMeta } from '../../data/products';

// ✅ Replace with YOUR Teachable Machine model URL
const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/HH89efCpH/';

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX — className normalizer
//
// Teachable Machine class names are whatever YOU typed when training the model.
// Common examples seen in the wild:
//   "Dandr..."  "Dandruff"  "dandruff"  "DANDRUFF"
//   "Greasy Root"  "Greasy"  "greasy"  "Greasy Scalp"
//   "Thinni..."  "Thinning"  "thinning"  "Hair Thinning"
//   "Healthy"  "healthy"  "Normal"  "Normal Scalp"
//
// The fix: we normalise whatever string comes back from the model into one of
// our four canonical keys: 'dandruff' | 'greasy' | 'thinning' | 'healthy'
// using a keyword-match approach.  This is resilient to truncation, casing,
// and extra words.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeClassName(rawName) {
  if (!rawName) return 'healthy';
  const lower = rawName.toLowerCase().trim();

  if (lower.includes('dandr'))                          return 'dandruff';
  if (lower.includes('grease') || lower.includes('greasy') ||
      lower.includes('oily')   || lower.includes('excess'))  return 'greasy';
  if (lower.includes('thin')   || lower.includes('loss') ||
      lower.includes('bald')   || lower.includes('alopecia')) return 'thinning';
  if (lower.includes('health') || lower.includes('normal') ||
      lower.includes('good')   || lower.includes('clean'))   return 'healthy';

  // Fallback: return as-is (will still display, just without a colour match)
  return lower;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compress image for Firestore storage (no Firebase Storage needed)
// ─────────────────────────────────────────────────────────────────────────────
function compressImage(dataUrl, maxSize = 300, quality = 0.65) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio  = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Circular confidence ring
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceRing({ pct, color }) {
  const r          = 34;
  const circ       = 2 * Math.PI * r;
  const dashOffset = circ - (pct / 100) * circ;
  return (
    <div className="ring-container">
      <svg className="ring-svg" width="80" height="80" viewBox="0 0 80 80">
        <circle className="ring-bg"   cx="40" cy="40" r={r} />
        <circle className="ring-fill" cx="40" cy="40" r={r}
          style={{ stroke: color, strokeDasharray: circ, strokeDashoffset: dashOffset }} />
      </svg>
      <div className="ring-label">
        <span className="ring-pct" style={{ color }}>{pct}%</span>
        <span className="ring-sub">conf.</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition score row (progress bar + label + percentage)
// ─────────────────────────────────────────────────────────────────────────────
function ConditionRow({ label, pct, color, isTop }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: isTop ? 700 : 500, fontSize: 15, color: isTop ? 'var(--text-1)' : 'var(--text-2)' }}>
            {label}
          </span>
          {isTop && (
            <span className="badge"
              style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontSize: 10 }}>
              Top
            </span>
          )}
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: isTop ? color : 'var(--text-3)' }}>
          {pct}%
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// Fixed display order and labels
const CONDITION_ORDER  = ['healthy', 'dandruff', 'thinning', 'greasy'];
const CONDITION_LABELS = {
  healthy:  'Healthy Scalp',
  dandruff: 'Dandruff',
  thinning: 'Hair Thinning',
  greasy:   'Excess Oil',
};
const CONDITION_COLORS = {
  healthy:  '#0abf8a',
  dandruff: '#f59e0b',
  thinning: '#ef4444',
  greasy:   '#f97316',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function Scanner() {
  const webcamRef    = useRef(null);
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();

  const [mode,         setMode]         = useState('upload');
  const [imagePreview, setImagePreview] = useState(null);
  const [predictions,  setPredictions]  = useState(null); // normalised array
  const [topResult,    setTopResult]    = useState(null);
  const [rawPredictions, setRawPredictions] = useState(null); // raw for debugging
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState('');

  // ─── Run Teachable Machine model ─────────────────────────────────────────
  async function runModel(imgEl) {
    setLoading(true); setError('');
    try {
      const model    = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
      const rawPreds = await model.predict(imgEl);

      // DEBUG: log raw output so you can see exactly what class names your model uses
      console.log('🔬 Raw model output:', rawPreds.map(p => `${p.className}: ${(p.probability * 100).toFixed(1)}%`));

      // Save raw predictions for reference
      setRawPredictions(rawPreds);

      // ── KEY FIX ──────────────────────────────────────────────────────────
      // Normalise every class name AND accumulate probabilities per canonical key.
      // If two raw classes map to the same key (unlikely but safe), they are summed.
      const accumulated = {};
      for (const p of rawPreds) {
        const key = normalizeClassName(p.className);
        accumulated[key] = (accumulated[key] || 0) + p.probability;
      }

      // Build a clean array: one entry per canonical condition key
      // Probabilities are kept as decimals (0–1) matching TM's output format
      const normalised = Object.entries(accumulated).map(([className, probability]) => ({
        className,
        probability,
        // Store the original class name for display / debugging
        rawClassName: rawPreds.find(p => normalizeClassName(p.className) === className)?.className || className,
      }));

      // Sort descending by probability
      normalised.sort((a, b) => b.probability - a.probability);

      console.log('✅ Normalised predictions:', normalised.map(p => `${p.className}: ${(p.probability * 100).toFixed(1)}%`));

      setPredictions(normalised);
      setTopResult(normalised[0]);
      // ─────────────────────────────────────────────────────────────────────

    } catch (err) {
      console.error('Model error:', err);
      setError(
        MODEL_URL.includes('YOUR_MODEL_ID')
          ? 'Replace MODEL_URL in Scanner.jsx with your Teachable Machine model URL.'
          : 'Could not load AI model. Check the MODEL_URL and ensure your model is published.'
      );
    }
    setLoading(false);
  }

  // ─── File upload ──────────────────────────────────────────────────────────
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    // Reset file input so the same file can be re-selected
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target.result;
      setImagePreview(src); setPredictions(null); setRawPredictions(null);
      setSaved(false); setError('');
      const img = new Image();
      img.src = src;
      img.onload = () => runModel(img);
    };
    reader.readAsDataURL(file);
  }

  // ─── Webcam capture ───────────────────────────────────────────────────────
  const captureWebcam = useCallback(() => {
    const src = webcamRef.current?.getScreenshot();
    if (!src) return;
    setImagePreview(src); setPredictions(null); setRawPredictions(null);
    setSaved(false); setError('');
    const img = new Image();
    img.src = src;
    img.onload = () => runModel(img);
  }, []);

  // ─── Save scan to Firestore (stores compressed base64 – no Storage needed) ─
  async function saveScan() {
    if (!predictions) return;
    setSaving(true); setError('');
    try {
      const compressed = await compressImage(imagePreview, 300, 0.65);
      await addDoc(collection(db, 'scans'), {
        userId:         currentUser.uid,
        imageBase64:    compressed,
        predictions,                           // normalised
        rawPredictions: rawPredictions || [],  // original for reference
        topLabel:       topResult?.className,
        topProbability: topResult?.probability,
        createdAt:      new Date().toISOString(),
      });
      setSaved(true);
    } catch (err) {
      console.error('Save error:', err);
      setError('Could not save. Check your Firestore security rules (Step 10 in guide).');
    }
    setSaving(false);
  }

  function reset() {
    setImagePreview(null); setPredictions(null); setRawPredictions(null);
    setTopResult(null); setSaved(false); setError('');
  }

  // ─── Derived display values ───────────────────────────────────────────────
  const meta   = topResult ? conditionMeta[topResult.className] : null;
  const topPct = topResult ? Math.round(topResult.probability * 100) : 0;
  const topColor = CONDITION_COLORS[topResult?.className] || '#4361ee';

  // Build the fixed-order display rows.
  // For each canonical key, look up its probability in the normalised predictions.
  const displayRows = CONDITION_ORDER.map(key => {
    const found = predictions?.find(p => p.className === key);
    return {
      key,
      pct:   found ? Math.round(found.probability * 100) : 0,
      color: CONDITION_COLORS[key] || '#94a3b8',
      label: CONDITION_LABELS[key] || key,
    };
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="au" style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 800, fontSize: 'clamp(22px,3vw,32px)', letterSpacing: '-0.4px', marginBottom: 6 }}>
          Scalp Analysis
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 15 }}>
          Upload or capture a scalp image for instant AI-powered condition analysis.
        </p>
      </div>

      {/* Two-column grid: left = image input, right = results */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: predictions && !loading ? '1fr 1fr' : '1fr',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ── LEFT: Image input card ─────────────────────────────────────── */}
        <div className="card au d1">
          {/* Card header */}
          <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={16} color="var(--blue)" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>Input Scalp Image</h2>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            {/* Mode toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, background: 'var(--surface-2)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
              {[['upload', 'Upload File', Upload], ['camera', 'Live Camera', Camera]].map(([m, label, Icon]) => (
                <button key={m} onClick={() => { setMode(m); reset(); }}
                  className="btn"
                  style={{
                    padding: '10px 12px', fontSize: 13,
                    background: mode === m ? '#fff' : 'transparent',
                    color:      mode === m ? 'var(--blue)' : 'var(--text-3)',
                    boxShadow:  mode === m ? 'var(--shadow-sm)' : 'none',
                    border:     mode === m ? '1px solid var(--border)' : '1px solid transparent',
                  }}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {/* Input area */}
            {!imagePreview ? (
              mode === 'upload' ? (
                <div className="drop-zone"
                  onClick={() => fileInputRef.current.click()}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 20px', gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={24} color="var(--blue)" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 4 }}>Upload File</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Click to browse · JPG, PNG, WEBP</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*"
                    style={{ display: 'none' }} onChange={handleFileUpload} />
                </div>
              ) : (
                <div>
                  <Webcam ref={webcamRef} screenshotFormat="image/jpeg"
                    style={{ width: '100%', borderRadius: 12, maxHeight: 280, objectFit: 'cover' }}
                    videoConstraints={{ facingMode: 'environment' }} />
                  <button onClick={captureWebcam} className="btn btn-primary"
                    style={{ width: '100%', marginTop: 12, padding: 13 }}>
                    <Camera size={16} /> Capture & Analyze
                  </button>
                </div>
              )
            ) : (
              <div>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={imagePreview} alt="Scalp"
                    style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />

                  {/* Loading overlay */}
                  {loading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ScanLine size={24} color="var(--blue)" style={{ animation: 'spin 1.5s linear infinite' }} />
                      </div>
                      <p style={{ fontWeight: 700, color: 'var(--text-1)' }}>Analyzing your scalp…</p>
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>This takes 2–5 seconds</p>
                    </div>
                  )}

                  <button onClick={reset} className="btn btn-ghost"
                    style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '7px 14px', fontSize: 13 }}>
                    <RotateCcw size={13} /> Retake
                  </button>
                </div>
              </div>
            )}

            {/* Tip box */}
            <div className="tip-box" style={{ marginTop: 14 }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 3 }}>Tips for best results</strong>
                Use bright, diffused lighting. Hold camera 5–10 cm from scalp. Avoid blur and shadows for accurate detection.
              </div>
            </div>
          </div>

          {/* Neural engine status */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="dot-online" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#089e73' }}>Neural Engine Ready</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
              TensorFlow.js
            </span>
          </div>
        </div>

        {/* ── RIGHT: Results panel (shown only after successful prediction) ── */}
        {predictions && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Analysis Overview — circular ring + top condition */}
            <div className="card au d1" style={{ padding: 20 }}>
              <p className="section-label" style={{ marginBottom: 14 }}>Analysis Overview</p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <ConfidenceRing pct={topPct} color={topColor} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-1)', marginBottom: 6 }}>
                    {CONDITION_LABELS[topResult?.className] || topResult?.className} Signs
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {meta?.advice || 'Consult a dermatologist for a thorough evaluation.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Condition Scores — ALL four conditions with real percentages */}
            <div className="card au d2" style={{ padding: 20 }}>
              <p className="section-label" style={{ marginBottom: 4 }}>Condition Scores</p>

              {displayRows.map(({ key, pct, color, label }) => (
                <ConditionRow
                  key={key}
                  label={label}
                  pct={pct}
                  color={color}
                  isTop={key === topResult?.className}
                />
              ))}

              {/* If the model returned a class we couldn't map, show it too */}
              {predictions
                .filter(p => !CONDITION_ORDER.includes(p.className))
                .map(p => (
                  <ConditionRow
                    key={p.className}
                    label={p.rawClassName || p.className}
                    pct={Math.round(p.probability * 100)}
                    color="#94a3b8"
                    isTop={false}
                  />
                ))}
            </div>

            {/* Personalized Care Guide */}
            <div className="card au d3"
              style={{ padding: 20, background: 'var(--text-1)', border: '1px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Zap size={16} color="#f59e0b" />
                <p style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Personalized Care Guide</p>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 14 }}>
                View a tailored treatment plan based on your scan results and condition severity.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {(meta?.tips || []).map(tip => (
                  <span key={tip} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    {tip}
                  </span>
                ))}
              </div>

              {!saved ? (
                <button onClick={saveScan} disabled={saving} className="btn"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '11px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                  {saving
                    ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                    : '💾 Save to History'}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 11, borderRadius: 12, background: 'rgba(10,191,138,0.2)', color: '#34d399', fontWeight: 600, fontSize: 14 }}>
                  <CheckCircle size={16} /> Saved to your history!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="au" style={{ display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'var(--rose-light)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--rose)', fontSize: 14 }}>
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Product recommendations (shown below after a successful scan) */}
      {topResult && !loading && (
        <div style={{ marginTop: 36 }} className="au">
          <Products condition={topResult.className} inline />
        </div>
      )}
    </div>
  );
}
