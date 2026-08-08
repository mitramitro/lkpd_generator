# LKPD Builder

Aplikasi web untuk guru SMK membuat **Lembar Kerja Peserta Didik (LKPD)** dengan cepat dan rapi.

Guru memasukkan konten mentah, aplikasi memahami struktur konten (block-based), dan otomatis menyusun LKPD menjadi desain A4 yang rapi dengan page break otomatis.

## Teknologi

- React 19 + Vite + TypeScript (strict)
- Tailwind CSS v4
- React Router v7
- Zustand (central document state)

## Status (Milestone 1 — Foundation)

Sudah bekerja:

- Dashboard dengan daftar LKPD (persistence localStorage)
- Buat LKPD (form identitas + pilihan template)
- Editor block-based: heading, teks, soal pilihan ganda, soal uraian, gambar (upload), halaman baru
- Preview halaman A4 (210mm × 297mm) dengan 4 template desain
- Pagination otomatis berbasis estimasi tinggi block
- Penomoran soal otomatis (structured question model)

Belum dibuat (milestone berikutnya):

- Import/paste soal → parsing otomatis ke structured questions
- Smart layout dengan pengukuran tinggi presisi
- Export PDF
- Supabase (auth, database, storage)
- Gemini AI (generate konten/parsing — M5.1 baru fondasi integrasi)

## Menjalankan

```bash
npm install
npm run dev
```

Build & lint:

```bash
npm run build   # tsc + vite build
npm run lint    # oxlint
```

## Gemini AI — Milestone 5.1 (fondasi)

Integrasi Gemini berjalan lewat endpoint server-side. Browser **tidak pernah**
memegang API key — key hanya dibaca server dari environment.

### Local setup

1. Salin contoh env: `copy .env.example .env.local` (atau buat `.env` — keduanya dibaca Vite).
2. Isi `GEMINI_API_KEY` di file env tersebut dengan key dari Google AI Studio.
3. `npm run dev`
4. Buka aplikasi → menu **Gemini AI Test** (atau langsung `/ai-test`)
5. Masukkan prompt, klik **Test Gemini**.

`.env` / `.env.local` **jangan pernah di-commit** (sudah dikecualikan di `.gitignore`).

### Vercel (untuk nanti)

Project Settings → Environment Variables → tambah `GEMINI_API_KEY`.
Endpoint `POST /api/ai/test` otomatis terdeploy sebagai Serverless Function
dari folder `api/`.

### Catatan teknis

- Endpoint: `POST /api/ai/test`, body `{ "prompt": string }`.
- Model default `gemini-flash-latest` (alias stabil), bisa diganti via `GEMINI_MODEL` (server-side).
- Dev lokal melayani `/api/ai/test` lewat middleware Vite; produksi lewat
  Serverless Function Vercel — logika handler sama (`server/handler.ts`).
- M5.1 memiliki rate limiting sederhana per-instance (bukan production-grade)
  dan belum ada autentikasi/database/history AI.

## Gemini AI — Milestone 5.2 (Generate Soal)

Guru memasukkan materi/topik → AI menyusun soal pilihan ganda / uraian / campuran
dalam jumlah yang diminta → pratinjau dengan checkbox → sisipkan soal terpilih ke LKPD.

### Alur

1. Di editor, klik **Buat Soal dengan AI** (di atas panel "Konten LKPD").
2. Isi materi (bisa otomatis dari blok **Materi** LKPD), jumlah soal (1–20),
   jenis soal, tingkat kesulitan, kelas (opsional), dan bahasa.
3. Klik **Generate** → soal muncul di pratinjau dengan kunci jawaban untuk guru.
4. Centang soal yang diinginkan → **Masukkan N Soal ke LKPD** → soal terpasang
   di akhir dokumen (penomoran otomatis).

### Catatan teknis

- Endpoint: `POST /api/ai/generate-questions`,
  body `{ source, count, questionType, difficulty, grade?, language? }`.
- Key tetap server-side saja (`GEMINI_API_KEY`); browser tidak pernah melihatnya.
- Gemini memakai structured output (`responseSchema` + `responseMimeType: application/json`),
  lalu server **memvalidasi ulang** respons (format + jumlah soal harus pas) —
  hasil AI tidak pernah masuk ke dokumen tanpa lolos validasi.
- Kunci jawaban & pembahasan hanya untuk guru di pratinjau; tidak ikut tercetak.
- Model default `gemini-flash-latest`, sama seperti M5.1.
- Batasan M5.2 (sesuai spesifikasi): tidak ada generate gambar, tidak ada chat/history AI,
  tidak ada Supabase/auth/billing; satu permintaan per klik, tanpa polling/retry.

## Struktur folder

```
src/
  app/            # application shell, header
  pages/          # Dashboard, Create LKPD, Editor
  models/         # domain types (document, block, template)
  templates/      # 4 template desain + registry
  store/          # zustand store (satu sumber kebenaran)
  services/       # repository layer (localStorage; siap diganti Supabase)
  lib/            # factories, pagination, seed, format
  components/
    ui/           # primitives (Button, Input, dll)
    editor/       # block editor + template picker
    preview/      # A4 page rendering
```
