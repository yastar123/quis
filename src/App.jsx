import { useState, useEffect, useMemo } from "react";

const WAKTU_PER_SOAL = 15;

// decode html entity dari opentdb (&quot; dll)
function decodeHTML(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function saveProgress(data) {
  localStorage.setItem("kuis_state", JSON.stringify(data));
}
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("kuis_state") || "null");
  } catch {
    return null;
  }
}

function saveUser(nama) {
  localStorage.setItem("kuis_pengguna", nama);
}
function loadUser() {
  return localStorage.getItem("kuis_pengguna") || "";
}

export default function App() {
  const [fase, setFase] = useState("login");
  const [indeks, setIndeks] = useState(0);
  const [jawaban, setJawaban] = useState([]);
  const [waktu, setWaktu] = useState(WAKTU_PER_SOAL);
  const [soal, setSoal] = useState([]);
  const [pengguna, setPengguna] = useState(loadUser());
  const [namaInput, setNamaInput] = useState("");

  const progresLama = loadProgress();

  async function mulaiKuis(lanjut) {
    if (lanjut && progresLama) {
      setSoal(progresLama.soal);
      setIndeks(progresLama.indeks);
      setJawaban(progresLama.jawaban);
      setWaktu(WAKTU_PER_SOAL);
      setFase("soal");
      return;
    }

    const res = await fetch("https://opentdb.com/api.php?amount=3&type=multiple");
    const data = await res.json();

    const soalBaru = data.results.map((s) => ({
      ...s,
      pilihan: shuffle([s.correct_answer, ...s.incorrect_answers]),
    }));

    setSoal(soalBaru);
    setIndeks(0);
    setJawaban([]);
    setWaktu(WAKTU_PER_SOAL);
    setFase("soal");
    saveProgress(null);
  }

  function pilihJawaban(j) {
    const updated = [...jawaban, { indeks, jawaban: j, lewat: false }];
    setJawaban(updated);

    if (indeks + 1 < soal.length) {
      setIndeks(indeks + 1);
      setWaktu(WAKTU_PER_SOAL);
      saveProgress({ soal, indeks: indeks + 1, jawaban: updated });
    } else {
      saveProgress(null);
      setFase("hasil");
    }
  }

  // kalo waktu habis, soal ini + sisanya dianggap lewat semua, langsung ke hasil
  function waktuHabis() {
    const sisaLewat = soal.slice(indeks).map((_, i) => ({
      indeks: indeks + i,
      jawaban: "",
      lewat: true,
    }));
    setJawaban((prev) => [...prev, ...sisaLewat]);
    saveProgress(null);
    setFase("hasil");
  }

  useEffect(() => {
    if (fase !== "soal") return;
    if (waktu <= 0) {
      waktuHabis();
      return;
    }
    const t = setInterval(() => setWaktu((w) => w - 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, waktu, indeks]);

  const statistik = useMemo(() => {
    let benar = 0, salah = 0, lewat = 0;
    for (const j of jawaban) {
      if (j.lewat) lewat++;
      else if (j.jawaban === soal[j.indeks]?.correct_answer) benar++;
      else salah++;
    }
    const skor = soal.length ? Math.round((benar / soal.length) * 100) : 0;
    return { benar, salah, lewat, skor };
  }, [jawaban, soal]);

  const warnaTimer = waktu > 10 ? "bg-green-500" : waktu > 5 ? "bg-yellow-500" : "bg-red-500";
  const persenTimer = (waktu / WAKTU_PER_SOAL) * 100;

  function handleLogin() {
    const nama = namaInput.trim();
    if (!nama) return;
    saveUser(nama);
    setPengguna(nama);
    setFase("menu");
  }

  function handleKeluar() {
    saveUser("");
    setPengguna("");
    setNamaInput("");
    setFase("login");
  }

  if (fase === "login") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center text-black mb-2">Aplikasi Kuis</h1>
          <p className="text-center text-gray-400 text-sm mb-6">React · Open Trivia DB</p>
          <input
            type="text"
            placeholder="Masukkan nama Anda"
            value={namaInput}
            onChange={(e) => setNamaInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 mb-4 focus:border-black focus:outline-none transition"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 transition"
          >
            Mulai
          </button>
        </div>
      </div>
    );
  }

  if (fase === "menu") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-2">Halo, {pengguna}!</h1>
          <p className="text-gray-500 mb-6">Siap menguji pengetahuanmu?</p>
          <div className="space-y-3">
            <button
              onClick={() => mulaiKuis(false)}
              className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 transition"
            >
              Kuis Baru
            </button>
            {progresLama && (
              <button
                onClick={() => mulaiKuis(true)}
                className="w-full bg-white border-2 border-black text-black rounded-xl py-3 font-semibold hover:bg-gray-100 transition"
              >
                Lanjutkan Kuis
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (fase === "soal" && soal.length > 0) {
    const soalAktif = soal[indeks];
    const sudahJawab = jawaban.find((j) => j.indeks === indeks);

    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="sticky top-0 bg-white border-b px-6 py-3 flex justify-between items-center text-sm z-10">
          <span className="font-semibold">Soal {indeks + 1}/{soal.length}</span>
          <span className="text-green-600">✓ Benar: {statistik.benar}</span>
          <span className="text-red-500">✗ Salah: {statistik.salah}</span>
          <span className="text-gray-400">— Lewat: {statistik.lewat}</span>
        </div>

        <div className="w-full h-1.5 bg-gray-200">
          <div
            className={`h-full ${warnaTimer} transition-all duration-1000`}
            style={{ width: `${persenTimer}%` }}
          />
        </div>

        <div className="max-w-xl mx-auto px-8 pt-4 text-right text-sm text-gray-400">
          ⏱ {waktu} detik tersisa
        </div>

        <div className="max-w-xl mx-auto p-8 pt-2">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <p className="text-xs font-medium text-indigo-500 uppercase tracking-wider mb-2">
              {decodeHTML(soalAktif.category)}
            </p>
            <h2 className="text-lg font-semibold mb-6">{decodeHTML(soalAktif.question)}</h2>

            <div className="space-y-3">
              {soalAktif.pilihan.map((j) => {
                const benar = j === soalAktif.correct_answer;
                const dipilih = sudahJawab?.jawaban === j;

                let kelas = "border-2 rounded-xl py-3 px-4 cursor-pointer transition ";
                if (dipilih && benar) kelas += "bg-green-50 border-green-500";
                else if (dipilih && !benar) kelas += "bg-red-50 border-red-500";
                else kelas += "border-gray-200 hover:border-indigo-400";

                return (
                  <div
                    key={j}
                    onClick={() => !sudahJawab && pilihJawaban(j)}
                    className={kelas}
                  >
                    {decodeHTML(j)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fase === "hasil") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-1">Hasil Kuis</h1>
          <p className="text-gray-400 text-sm mb-4">{pengguna}</p>

          <div className="text-6xl font-bold text-black mb-1">{statistik.skor}%</div>
          <p className="text-gray-400 text-sm mb-6">
            {statistik.benar} dari {soal.length} soal dijawab benar
          </p>

          <div className="flex justify-center gap-6 mb-8 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-green-500">{statistik.benar}</span>
              <span className="text-gray-400">Benar</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-red-500">{statistik.salah}</span>
              <span className="text-gray-400">Salah</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-400">{statistik.lewat}</span>
              <span className="text-gray-400">Lewat</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => mulaiKuis(false)}
              className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 transition"
            >
              Main Lagi
            </button>
            <button
              onClick={handleKeluar}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
