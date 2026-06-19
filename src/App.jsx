import { useState, useCallback, useMemo, useEffect } from "react";

const DURASI = 15;
const K_STATE = "kuis_state";
const K_USER  = "kuis_user";

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const rm   = (k) => localStorage.removeItem(k);
const dec  = (s) => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };
const shuf = (a) => [...a].sort(() => Math.random() - 0.5);

// ─── UI primitives ────────────────────────────────────────────────────────────

const Page = ({ children, center }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className={`max-w-md w-full bg-white rounded-2xl shadow-md p-8 ${center ? "text-center" : ""}`}>
      {children}
    </div>
  </div>
);

const Btn = ({ children, outline, ghost, ...p }) => {
  const base = "w-full rounded-xl py-3 font-medium transition text-sm disabled:opacity-40 mb-2";
  const cls  = ghost   ? "text-gray-400 hover:text-gray-600 bg-transparent border-0"
             : outline ? "border border-gray-300 bg-white hover:bg-gray-50"
             :           "bg-gray-900 text-white hover:bg-gray-700";
  return <button {...p} className={`${base} ${cls}`}>{children}</button>;
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [fase,    setFase]    = useState("login");
  const [nama,    setNama]    = useState(() => load(K_USER) || "");
  const [soal,    setSoal]    = useState([]);
  const [idx,     setIdx]     = useState(0);
  const [jawaban, setJawaban] = useState([]);
  const [waktu,   setWaktu]   = useState(DURASI);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── stat ──────────────────────────────────────────────────────────────────
  const stat = useMemo(() => {
    const benar = jawaban.filter((j) => !j.lewat && j.pilihan === soal[j.idx]?.correct_answer).length;
    const lewat = jawaban.filter((j) => j.lewat).length;
    return { benar, lewat, salah: jawaban.length - benar - lewat, skor: soal.length ? Math.round((benar / soal.length) * 100) : 0 };
  }, [jawaban, soal]);

  // ── jawab / lewat ─────────────────────────────────────────────────────────
  const lanjut = useCallback((pilihan, lewat) => {
    setJawaban((prev) => {
      const next = [...prev, { idx, pilihan, lewat }];
      if (idx + 1 < soal.length) save(K_STATE, { soal, idx: idx + 1, jawaban: next });
      else rm(K_STATE);
      return next;
    });
    if (idx + 1 < soal.length) { setIdx((i) => i + 1); setWaktu(DURASI); }
    else setFase("hasil");
  }, [idx, soal]);

  const jawab      = (p)  => lanjut(p, false);
  const waktuHabis = useCallback(() => lanjut("", true), [lanjut]);

  // ── timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fase !== "soal") return;
    setWaktu(DURASI);
    const t = setInterval(() => setWaktu((w) => { if (w <= 1) { clearInterval(t); waktuHabis(); return 0; } return w - 1; }), 1000);
    return () => clearInterval(t);
  }, [fase, idx, waktuHabis]);

  // ── fetch soal ────────────────────────────────────────────────────────────
  const mulai = useCallback(async (lanjutkan) => {
    if (lanjutkan) {
      const p = load(K_STATE);
      if (p) { setSoal(p.soal); setIdx(p.idx); setJawaban(p.jawaban); setWaktu(DURASI); setFase("soal"); return; }
    }
    setLoading(true); setError("");
    try {
      const res  = await fetch("https://opentdb.com/api.php?amount=5&type=multiple");
      const data = await res.json();
      if (!data.results?.length) throw new Error();
      setSoal(data.results.map((s) => ({ ...s, pilihan: shuf([s.correct_answer, ...s.incorrect_answers]) })));
      setIdx(0); setJawaban([]); setWaktu(DURASI); rm(K_STATE); setFase("soal");
    } catch { setError("Gagal memuat soal. Coba lagi."); }
    finally  { setLoading(false); }
  }, []);

  const keluar = () => { rm(K_USER); setNama(""); setFase("login"); };

  // ── views ─────────────────────────────────────────────────────────────────
  if (fase === "login") return (
    <Page center>
      <h1 className="text-xl font-semibold mb-1">Aplikasi Kuis</h1>
      <p className="text-gray-400 text-xs mb-6">Open Trivia DB</p>
      <input
        autoFocus value={nama} onChange={(e) => setNama(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && nama.trim() && (save(K_USER, nama.trim()), setFase("menu"))}
        placeholder="Masukkan nama Anda"
        className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm mb-3 focus:border-gray-400 focus:outline-none"
      />
      <Btn onClick={() => { const v = nama.trim(); if (v) { save(K_USER, v); setNama(v); setFase("menu"); } }}>
        Mulai
      </Btn>
    </Page>
  );

  if (fase === "menu") {
    const lama = load(K_STATE);
    return (
      <Page center>
        <h1 className="text-xl font-semibold mb-1">Halo, {nama}!</h1>
        <p className="text-gray-400 text-xs mb-6">Siap menguji pengetahuanmu?</p>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <Btn onClick={() => mulai(false)} disabled={loading}>{loading ? "Memuat…" : "Kuis baru"}</Btn>
        {lama && <Btn outline onClick={() => mulai(true)} disabled={loading}>Lanjutkan ({lama.idx + 1}/{lama.soal.length})</Btn>}
        <Btn ghost onClick={keluar}>Keluar</Btn>
      </Page>
    );
  }

  if (fase === "soal" && soal[idx]) {
    const s = soal[idx];
    const warna = waktu > 10 ? "bg-green-500" : waktu > 5 ? "bg-yellow-400" : "bg-red-500";
    return (
      <div className="min-h-screen bg-slate-50">
        {/* header */}
        <div className="sticky top-0 bg-white border-b px-5 py-2.5 flex items-center gap-4 text-sm z-10">
          <span className="font-medium">{idx + 1}/{soal.length}</span>
          <span className="text-green-600">✓ {stat.benar}</span>
          <span className="text-red-500">✗ {stat.salah}</span>
          <span className="text-gray-400">— {stat.lewat}</span>
          <span className="ml-auto text-gray-500">⏱ {waktu}s</span>
        </div>
        {/* progress bar */}
        <div className="h-1 bg-gray-100">
          <div className={`h-full ${warna} transition-all duration-1000`} style={{ width: `${(waktu / DURASI) * 100}%` }} />
        </div>
        {/* soal */}
        <div className="max-w-lg mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-xs font-medium text-indigo-500 uppercase tracking-wider mb-2">{dec(s.category)}</p>
            <p className="font-medium mb-5 leading-relaxed">{dec(s.question)}</p>
            {s.pilihan.map((p, i) => (
              <button key={i} onClick={() => jawab(p)}
                className="w-full text-left text-sm border border-gray-200 rounded-xl py-2.5 px-4 mb-2 hover:border-indigo-400 hover:bg-indigo-50 transition">
                {dec(p)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fase === "hasil") return (
    <Page center>
      <h1 className="text-xl font-semibold mb-1">Hasil kuis</h1>
      <p className="text-gray-400 text-xs mb-4">{nama}</p>
      <div className="text-5xl font-semibold mb-1">{stat.skor}%</div>
      <p className="text-gray-400 text-xs mb-6">{stat.benar} dari {soal.length} soal benar</p>
      <div className="flex justify-center gap-8 mb-8">
        {[["Benar", stat.benar, "text-green-500"], ["Salah", stat.salah, "text-red-500"], ["Lewat", stat.lewat, "text-gray-400"]].map(
          ([l, v, c]) => <div key={l} className="flex flex-col items-center gap-0.5"><span className={`text-2xl font-semibold ${c}`}>{v}</span><span className="text-xs text-gray-400">{l}</span></div>
        )}
      </div>
      <Btn onClick={() => mulai(false)} disabled={loading}>{loading ? "Memuat…" : "Main lagi"}</Btn>
      <Btn outline onClick={keluar}>Keluar</Btn>
    </Page>
  );

  return null;
}
