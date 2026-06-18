import { useState, useEffect, useMemo } from "react";

// ─────────────────────────────────────────────
// FUNGSI UTILITAS
// ─────────────────────────────────────────────

/**
 * Mendekode karakter HTML entity (misal: &amp; → &, &#039; → ')
 * Dipakai karena data dari Open Trivia DB mengandung HTML entity
 * di teks soal maupun pilihan jawaban.
 */
const decodeHTML = (str) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

/**
 * Mengacak urutan elemen dalam array menggunakan algoritma Fisher-Yates.
 * Dipakai untuk mengacak urutan pilihan jawaban agar jawaban benar
 * tidak selalu muncul di posisi yang sama.
 */
const acakArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─────────────────────────────────────────────
// FUNGSI PENYIMPANAN (localStorage)
// ─────────────────────────────────────────────

/**
 * [SOAL 1.h] — Resume kuis via localStorage (NILAI PLUS)
 *
 * Menyimpan progres kuis (soal, indeks aktif, jawaban) ke localStorage.
 * Dipanggil setiap kali pengguna menjawab atau melewati soal,
 * sehingga kuis bisa dilanjutkan jika browser ditutup.
 * Jika nilai null dikirim, data progres dihapus (kuis selesai).
 */
const simpanState = (data) =>
  localStorage.setItem("kuis_state", JSON.stringify(data));

/**
 * [SOAL 1.h] — Resume kuis via localStorage (NILAI PLUS)
 *
 * Memuat progres kuis dari localStorage.
 * Mengembalikan objek { soal, indeks, jawaban } jika ada,
 * atau null jika tidak ada progres yang tersimpan.
 */
const muatState = () => JSON.parse(localStorage.getItem("kuis_state") || "null");

/**
 * [SOAL 1.a] — Fitur Login
 *
 * Menyimpan nama pengguna ke localStorage agar tetap tersimpan
 * meski halaman di-refresh.
 */
const simpanPengguna = (nama) => localStorage.setItem("kuis_pengguna", nama);

/**
 * [SOAL 1.a] — Fitur Login
 *
 * Memuat nama pengguna dari localStorage.
 * Mengembalikan string kosong jika belum ada nama yang tersimpan.
 */
const muatPengguna = () => localStorage.getItem("kuis_pengguna") || "";

// ─────────────────────────────────────────────
// KONSTANTA
// ─────────────────────────────────────────────

/**
 * [SOAL 1.e] — Timer
 * Durasi waktu pengerjaan tiap soal dalam detik.
 */
const WAKTU_PER_SOAL = 15;

// ─────────────────────────────────────────────
// KOMPONEN UTAMA
// ─────────────────────────────────────────────
export default function App() {

  // "fase" menentukan halaman mana yang ditampilkan:
  // "login" → form nama | "menu" → pilih kuis | "soal" → pengerjaan | "hasil" → skor akhir
  const [fase, setFase] = useState("login");

  // Indeks soal yang sedang dikerjakan (0 = soal pertama)
  const [indeks, setIndeks] = useState(0);

  // Array yang menyimpan semua jawaban pengguna selama kuis berlangsung
  // Tiap elemen: { indeks, jawaban, lewat }
  const [jawaban, setJawaban] = useState([]);

  // [SOAL 1.e] — Timer: sisa waktu countdown per soal
  const [sisaWaktu, setSisaWaktu] = useState(WAKTU_PER_SOAL);

  // [SOAL 1.b] — Array soal dari API Open Trivia DB, sudah diacak pilihan jawabannya
  const [soal, setSoal] = useState([]);

  // [SOAL 1.a] — Nama pengguna yang sedang login
  const [pengguna, setPengguna] = useState(muatPengguna());

  // Nilai sementara input nama di halaman login
  const [namaInput, setNamaInput] = useState("");

  // [SOAL 1.h] — Cek apakah ada progres kuis yang tersimpan di localStorage
  const stateLama = muatState();

  // ─────────────────────────────────────────────
  // FUNGSI LOGIKA KUIS
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.b] — Mengambil soal dari API Open Trivia DB
   * [SOAL 1.c] — Jumlah & type soal bebas (3 soal, pilihan ganda)
   * [SOAL 1.h] — Resume kuis: jika lanjutkan=true, pulihkan dari localStorage
   *
   * Memulai atau melanjutkan kuis.
   * - Jika lanjutkan=true dan ada data tersimpan → pulihkan state dari localStorage.
   * - Jika lanjutkan=false → ambil soal baru dari API, acak pilihan jawaban,
   *   lalu reset semua state ke kondisi awal.
   */
  const mulaiKuis = async (lanjutkan = false) => {
    if (lanjutkan && stateLama) {
      // Pulihkan progres dari localStorage (fitur resume kuis)
      setSoal(stateLama.soal);
      setIndeks(stateLama.indeks);
      setJawaban(stateLama.jawaban);
      setSisaWaktu(WAKTU_PER_SOAL);
      setFase("soal");
      return;
    }

    // [SOAL 1.b] — Ambil 5 soal pilihan ganda dari Open Trivia DB
    const res = await fetch(
      "https://opentdb.com/api.php?amount=3&type=multiple"
    );
    const data = await res.json();

    // Untuk tiap soal, gabungkan jawaban benar + salah lalu acak urutannya
    const soalAcak = data.results.map((s) => ({
      ...s,
      jawabanAcak: acakArray([s.correct_answer, ...s.incorrect_answers]),
    }));

    setSoal(soalAcak);
    setIndeks(0);
    setJawaban([]);
    setSisaWaktu(WAKTU_PER_SOAL);
    setFase("soal");
    simpanState(null); // hapus progres lama jika ada
  };

  /**
   * [SOAL 1.f] — Satu halaman satu soal; pindah soal setelah jawab
   * [SOAL 1.d] — Total soal & jumlah dikerjakan terupdate setelah tiap jawaban
   * [SOAL 1.h] — Simpan progres ke localStorage setelah tiap jawaban
   *
   * Dipanggil saat pengguna memilih salah satu jawaban.
   * Menyimpan jawaban ke state, lalu langsung pindah ke soal berikutnya
   * atau ke halaman hasil jika soal sudah habis.
   */
  const pilihJawaban = (j) => {
    const baru = [...jawaban, { indeks, jawaban: j, lewat: false }];
    setJawaban(baru);

    if (indeks + 1 < soal.length) {
      // Masih ada soal berikutnya → langsung pindah [SOAL 1.f]
      setIndeks(indeks + 1);
      setSisaWaktu(WAKTU_PER_SOAL); // reset timer untuk soal baru [SOAL 1.e]
      simpanState({ soal, indeks: indeks + 1, jawaban: baru }); // [SOAL 1.h]
    } else {
      // Soal sudah habis → tampilkan hasil
      simpanState(null);
      setFase("hasil");
    }
  };

  /**
   * [SOAL 1.g] — Jika timer habis, soal ditutup & langsung tampilkan hasil
   *
   * PERBAIKAN dari versi sebelumnya:
   * Versi lama: timer habis → lewati ke soal berikutnya (tidak sesuai poin 1.g)
   * Versi baru: timer habis di soal MANAPUN → catat soal sebagai "lewat",
   * kemudian LANGSUNG ke halaman hasil tanpa menunggu soal berikutnya.
   *
   * Sisa soal yang belum dikerjakan otomatis dihitung sebagai "lewat"
   * agar statistik benar/salah/lewat tetap akurat.
   */
  const lewatiSoalKarenaTimer = () => {
    // Tandai soal aktif sebagai dilewati karena waktu habis
    const jawabanSoalIni = { indeks, jawaban: "", lewat: true };

    // Tandai semua soal yang belum sempat dikerjakan juga sebagai lewat
    const soalSisaLewat = soal
      .slice(indeks + 1)
      .map((_, i) => ({ indeks: indeks + 1 + i, jawaban: "", lewat: true }));

    const semuaJawaban = [...jawaban, jawabanSoalIni, ...soalSisaLewat];
    setJawaban(semuaJawaban);

    // [SOAL 1.g] — Langsung tampilkan hasil setelah timer habis
    simpanState(null); // hapus progres karena kuis berakhir
    setFase("hasil");
  };

  // ─────────────────────────────────────────────
  // EFEK SAMPING: TIMER COUNTDOWN
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.e] — Timer countdown per soal
   * [SOAL 1.g] — Saat timer habis, panggil lewatiSoalKarenaTimer()
   *              yang langsung membawa pengguna ke halaman hasil
   *
   * Menjalankan countdown timer selama fase "soal" aktif.
   * Setiap detik, sisaWaktu berkurang 1.
   * Jika sisaWaktu mencapai 0, lewatiSoalKarenaTimer() dipanggil otomatis.
   * Timer di-reset (clearInterval) saat soal berpindah atau fase berubah.
   */
  useEffect(() => {
    if (fase !== "soal") return;
    if (sisaWaktu <= 0) {
      lewatiSoalKarenaTimer(); // [SOAL 1.g] waktu habis → langsung ke hasil
      return;
    }
    const timer = setInterval(() => setSisaWaktu((w) => w - 1), 1000);
    return () => clearInterval(timer);
  }, [fase, sisaWaktu, indeks]);

  // ─────────────────────────────────────────────
  // KALKULASI STATISTIK (MEMOIZED)
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.d] — Menampilkan total soal & jumlah yang dikerjakan
   * [SOAL 1.g] — Data yang ditampilkan di halaman hasil (benar, salah, lewat)
   *
   * Menghitung jumlah jawaban benar, salah, dilewati, dan skor persentase.
   * Menggunakan useMemo agar tidak dihitung ulang setiap render.
   */
  const statistik = useMemo(() => {
    const benar = jawaban.filter(
      (j) => !j.lewat && j.jawaban === soal[j.indeks]?.correct_answer
    ).length;
    const salah = jawaban.filter(
      (j) => !j.lewat && j.jawaban !== soal[j.indeks]?.correct_answer
    ).length;
    const lewat = jawaban.filter((j) => j.lewat).length;
    const skor = soal.length ? Math.round((benar / soal.length) * 100) : 0;
    return { benar, salah, lewat, skor };
  }, [jawaban, soal]);

  // ─────────────────────────────────────────────
  // VARIABEL TAMPILAN TIMER
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.e] — Indikator visual timer
   *
   * Warna progress bar berubah sesuai sisa waktu:
   * - Hijau  : > 10 detik (aman)
   * - Kuning : 6–10 detik (waspada)
   * - Merah  : ≤ 5 detik  (mendesak)
   */
  const warnaTimer =
    sisaWaktu > 10
      ? "bg-green-500"
      : sisaWaktu > 5
      ? "bg-yellow-500"
      : "bg-red-500";

  /** [SOAL 1.e] — Persentase lebar progress bar timer */
  const persenTimer = (sisaWaktu / WAKTU_PER_SOAL) * 100;

  // ─────────────────────────────────────────────
  // HANDLER AUTENTIKASI
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.a] — Fitur Login
   *
   * Memproses login pengguna.
   * Nama yang dimasukkan disimpan ke localStorage dan state,
   * lalu pengguna diarahkan ke halaman menu.
   * Tidak akan diproses jika nama kosong/hanya spasi.
   */
  const handleLogin = () => {
    if (!namaInput.trim()) return; // validasi: nama tidak boleh kosong
    simpanPengguna(namaInput.trim()); // [SOAL 1.a] simpan nama ke localStorage
    setPengguna(namaInput.trim());
    setFase("menu");
  };

  /**
   * [SOAL 1.a] — Fitur Login / Logout
   *
   * Memproses logout pengguna.
   * Menghapus nama dari localStorage, mereset state terkait pengguna,
   * dan mengarahkan kembali ke halaman login.
   */
  const handleKeluar = () => {
    simpanPengguna("");
    setPengguna("");
    setFase("login");
    setNamaInput("");
  };

  // ─────────────────────────────────────────────
  // RENDER: HALAMAN LOGIN
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.a] — Halaman Login
   *
   * Menampilkan form input nama pengguna sebelum masuk ke kuis.
   * Pengguna bisa menekan tombol "Mulai" atau tekan Enter untuk login.
   */
  if (fase === "login") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center text-black mb-2">
            Aplikasi Kuis
          </h1>
          <p className="text-center text-gray-400 text-sm mb-6">
            React · Open Trivia DB · localStorage
          </p>
          {/* [SOAL 1.a] Input nama pengguna; Enter juga bisa memicu login */}
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

  // ─────────────────────────────────────────────
  // RENDER: HALAMAN MENU
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.a] — Menampilkan nama pengguna setelah login berhasil
   * [SOAL 1.h] — Tombol "Lanjutkan Kuis" muncul jika ada progres tersimpan
   */
  if (fase === "menu") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* [SOAL 1.a] Sambutan dengan nama pengguna */}
          <h1 className="text-2xl font-bold text-black mb-2">
            Halo, {pengguna}!
          </h1>
          <p className="text-gray-500 mb-6">Siap menguji pengetahuanmu?</p>
          <div className="space-y-3">
            {/* Tombol untuk memulai kuis baru (soal diambil ulang dari API) */}
            <button
              onClick={() => mulaiKuis(false)}
              className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 transition"
            >
              Kuis Baru
            </button>

            {/* [SOAL 1.h] Tombol "Lanjutkan" hanya muncul jika ada progres di localStorage */}
            {stateLama && (
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

  // ─────────────────────────────────────────────
  // RENDER: HALAMAN SOAL
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.d] — Menampilkan total soal & nomor soal aktif
   * [SOAL 1.e] — Progress bar timer countdown
   * [SOAL 1.f] — Satu soal per halaman; pindah otomatis setelah memilih jawaban
   * [SOAL 1.g] — Timer ditampilkan; jika habis langsung ke hasil
   */
  if (fase === "soal" && soal.length > 0) {
    const soalAktif = soal[indeks];
    const sudahJawab = jawaban.find((j) => j.indeks === indeks);

    return (
      <div className="min-h-screen bg-[#f8fafc]">

        {/* [SOAL 1.d] Navbar: nomor soal aktif dari total soal + statistik sementara */}
        <div className="sticky top-0 bg-white border-b px-6 py-3 flex justify-between items-center text-sm z-10">
          <span className="font-semibold">
            Soal {indeks + 1}/{soal.length}
          </span>
          <span className="text-green-600">✓ Benar: {statistik.benar}</span>
          <span className="text-red-500">✗ Salah: {statistik.salah}</span>
          <span className="text-gray-400">— Lewat: {statistik.lewat}</span>
        </div>

        {/* [SOAL 1.e] Progress bar timer: lebar mengecil, warna berubah sesuai urgensi */}
        <div className="w-full h-1.5 bg-gray-200">
          <div
            className={`h-full ${warnaTimer} transition-all duration-1000`}
            style={{ width: `${persenTimer}%` }}
          />
        </div>

        {/* [SOAL 1.e] Angka sisa waktu */}
        <div className="max-w-xl mx-auto px-8 pt-4 text-right text-sm text-gray-400">
          ⏱ {sisaWaktu} detik tersisa
        </div>

        {/* [SOAL 1.f] Area soal — satu soal per halaman */}
        <div className="max-w-xl mx-auto p-8 pt-2">
          <div className="bg-white rounded-2xl shadow-lg p-8">

            {/* Kategori soal */}
            <p className="text-xs font-medium text-indigo-500 uppercase tracking-wider mb-2">
              {decodeHTML(soalAktif.category)}
            </p>

            {/* Teks soal */}
            <h2 className="text-lg font-semibold mb-6">
              {decodeHTML(soalAktif.question)}
            </h2>

            {/* [SOAL 1.f] Pilihan jawaban — klik langsung pindah soal berikutnya */}
            <div className="space-y-3">
              {soalAktif.jawabanAcak.map((j) => {
                const benar = j === soalAktif.correct_answer;
                const dipilih = sudahJawab?.jawaban === j;

                // Gaya tombol berdasarkan status:
                // dipilih & benar → hijau | dipilih & salah → merah | default → abu-abu
                let kelas =
                  "border-2 rounded-xl py-3 px-4 cursor-pointer transition ";
                if (dipilih && benar)
                  kelas += "bg-green-50 border-green-500";
                else if (dipilih && !benar)
                  kelas += "bg-red-50 border-red-500";
                else
                  kelas += "border-gray-200 hover:border-indigo-400";

                return (
                  <div
                    key={j}
                    // [SOAL 1.f] Klik hanya diproses jika soal belum dijawab
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

  // ─────────────────────────────────────────────
  // RENDER: HALAMAN HASIL
  // ─────────────────────────────────────────────

  /**
   * [SOAL 1.g] — Halaman hasil ditampilkan ketika:
   *   (a) semua soal sudah dijawab secara normal, ATAU
   *   (b) timer habis di tengah kuis (lewatiSoalKarenaTimer dipanggil)
   *
   * Menampilkan skor akhir dalam persentase beserta ringkasan
   * jumlah jawaban benar, salah, dan dilewati.
   */
  if (fase === "hasil") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-1">Hasil Kuis</h1>
          <p className="text-gray-400 text-sm mb-4">{pengguna}</p>

          {/* [SOAL 1.g] Skor akhir dalam persentase */}
          <div className="text-6xl font-bold text-black mb-1">
            {statistik.skor}%
          </div>
          <p className="text-gray-400 text-sm mb-6">
            {statistik.benar} dari {soal.length} soal dijawab benar
          </p>

          {/* [SOAL 1.g] Ringkasan: benar, salah, lewat */}
          <div className="flex justify-center gap-6 mb-8 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-green-500">
                {statistik.benar}
              </span>
              <span className="text-gray-400">Benar</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-red-500">
                {statistik.salah}
              </span>
              <span className="text-gray-400">Salah</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-400">
                {statistik.lewat}
              </span>
              <span className="text-gray-400">Lewat</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Mulai kuis baru dengan soal baru dari API */}
            <button
              onClick={() => mulaiKuis(false)}
              className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 transition"
            >
              Main Lagi
            </button>

            {/* [SOAL 1.a] Keluar dan kembali ke halaman login */}
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

  // Fallback: tidak me-render apapun jika fase tidak dikenali
  return null;
}