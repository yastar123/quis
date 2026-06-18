import { useState, useEffect, useMemo } from "react";

const decodeHTML = (str) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

const acakArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const simpanState = (data) => localStorage.setItem("kuis_state", JSON.stringify(data));
const muatState = () => JSON.parse(localStorage.getItem("kuis_state") || "null");
const simpanPengguna = (nama) => localStorage.setItem("kuis_pengguna", nama);
const muatPengguna = () => localStorage.getItem("kuis_pengguna") || "";

const WAKTU_PER_SOAL = 15;

export default function App() {
  const [fase, setFase] = useState("login");
  const [indeks, setIndeks] = useState(0);
  const [jawaban, setJawaban] = useState([]);
  const [sisaWaktu, setSisaWaktu] = useState(WAKTU_PER_SOAL);
  const [soal, setSoal] = useState([]);
  const [pengguna, setPengguna] = useState(muatPengguna());
  const [namaInput, setNamaInput] = useState("");

  const stateLama = muatState();

  const mulaiKuis = async (lanjutkan = false) => {
    if (lanjutkan && stateLama) {
      setSoal(stateLama.soal);
      setIndeks(stateLama.indeks);
      setJawaban(stateLama.jawaban);
      setSisaWaktu(WAKTU_PER_SOAL);
      setFase("soal");
      return;
    }
    const res = await fetch("https://opentdb.com/api.php?amount=10&type=multiple");
    const data = await res.json();
    const soalAcak = data.results.map((s) => ({
      ...s,
      jawabanAcak: acakArray([s.correct_answer, ...s.incorrect_answers]),
    }));
    setSoal(soalAcak);
    setIndeks(0);
    setJawaban([]);
    setSisaWaktu(WAKTU_PER_SOAL);
    setFase("soal");
    simpanState(null);
  };

  const pilihJawaban = (j) => {
    const baru = [...jawaban, { indeks, jawaban: j, lewat: false }];
    setJawaban(baru);
    if (indeks + 1 < soal.length) {
      setIndeks(indeks + 1);
      setSisaWaktu(WAKTU_PER_SOAL);
      simpanState({ soal, indeks: indeks + 1, jawaban: baru });
    } else {
      simpanState(null);
      setFase("hasil");
    }
  };

  const lewatiSoal = () => {
    const baru = [...jawaban, { indeks, jawaban: "", lewat: true }];
    setJawaban(baru);
    if (indeks + 1 < soal.length) {
      setIndeks(indeks + 1);
      setSisaWaktu(WAKTU_PER_SOAL);
      simpanState({ soal, indeks: indeks + 1, jawaban: baru });
    } else {
      simpanState(null);
      setFase("hasil");
    }
  };

  useEffect(() => {
    if (fase !== "soal") return;
    if (sisaWaktu <= 0) {
      lewatiSoal();
      return;
    }
    const timer = setInterval(() => setSisaWaktu((w) => w - 1), 1000);
    return () => clearInterval(timer);
  }, [fase, sisaWaktu, indeks]);

  const statistik = useMemo(() => {
    const benar = jawaban.filter((j) => !j.lewat && j.jawaban === soal[j.indeks]?.correct_answer).length;
    const salah = jawaban.filter((j) => !j.lewat && j.jawaban !== soal[j.indeks]?.correct_answer).length;
    const lewat = jawaban.filter((j) => j.lewat).length;
    const skor = soal.length ? Math.round((benar / soal.length) * 100) : 0;
    return { benar, salah, lewat, skor };
  }, [jawaban, soal]);

  const warnaTimer = sisaWaktu > 10 ? "bg-green-500" : sisaWaktu > 5 ? "bg-yellow-500" : "bg-red-500";
  const persenTimer = (sisaWaktu / WAKTU_PER_SOAL) * 100;

  const handleLogin = () => {
    if (!namaInput.trim()) return;
    simpanPengguna(namaInput.trim());
    setPengguna(namaInput.trim());
    setFase("menu");
  };

  const handleKeluar = () => {
    simpanPengguna("");
    setPengguna("");
    setFase("login");
    setNamaInput("");
  };

  if (fase === "login") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center text-indigo-600 mb-6">Kuis Trivia</h1>
          <input
            type="text"
            placeholder="Masukkan nama Anda"
            value={namaInput}
            onChange={(e) => setNamaInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 mb-4 focus:border-indigo-600 focus:outline-none"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition"
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
          <h1 className="text-2xl font-bold text-indigo-600 mb-2">Halo, {pengguna}!</h1>
          <p className="text-gray-500 mb-6">Siap menguji pengetahuanmu?</p>
          <div className="space-y-3">
            <button
              onClick={() => mulaiKuis(false)}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition"
            >
              Kuis Baru
            </button>
            {stateLama && (
              <button
                onClick={() => mulaiKuis(true)}
                className="w-full bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl py-3 font-semibold hover:bg-indigo-50 transition"
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
          <span>Soal {indeks + 1}/{soal.length}</span>
          <span>Benar {statistik.benar}</span>
          <span>Salah {statistik.salah}</span>
          <span>Lewat {statistik.lewat}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200">
          <div
            className={`h-full ${warnaTimer} transition-all duration-1000`}
            style={{ width: `${persenTimer}%` }}
          />
        </div>
        <div className="max-w-xl mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-lg font-semibold mb-6">{decodeHTML(soalAktif.question)}</h2>
            <div className="space-y-3">
              {soalAktif.jawabanAcak.map((j) => {
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
          <h1 className="text-2xl font-bold text-indigo-600 mb-4">Hasil Kuis</h1>
          <div className="text-5xl font-bold text-indigo-600 mb-2">{statistik.skor}%</div>
          <div className="flex justify-center gap-6 mb-6 text-sm">
            <span className="text-green-600 font-semibold">Benar: {statistik.benar}</span>
            <span className="text-red-600 font-semibold">Salah: {statistik.salah}</span>
            <span className="text-gray-500 font-semibold">Lewat: {statistik.lewat}</span>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => mulaiKuis(false)}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition"
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
