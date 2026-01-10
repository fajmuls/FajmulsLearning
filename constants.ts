
import { CategoryType, GeneralStudyMethod, IshiharaPlate } from './types';

export const CATEGORIES: {id: CategoryType, name: string, desc: string}[] = [
  { id: 'SKRIPSI', name: 'Skripsi Helper', desc: 'Bantuan Judul, Outline, & Metodologi' },
  { id: 'UTBK', name: 'UTBK SNBT', desc: 'Tes Potensi Skolastik & Literasi' },
  { id: 'SKD', name: 'SKD CPNS/Kedinasan', desc: 'TWK, TIU, TKP' },
  { id: 'TPA', name: 'TPA & TBI', desc: 'Tes Potensi Akademik & B.Inggris (Seleksi Lanjutan)' },
  { id: 'PSIKOTEST', name: 'Psikotes General', desc: 'Tes IQ: Logika, Spasial, Numerik' },
  { id: 'INTERVIEW', name: 'Wawancara Tulis', desc: 'Simulasi Jawab Interview & Review AI' },
  { id: 'BUTAWRNA', name: 'Tes Buta Warna', desc: 'Simulasi Ishihara & Warna' },
  { id: 'GENERAL', name: 'Materi Umum', desc: 'Belajar Apapun: PDF, Topik, Hafalan' }
];

export const GENERAL_METHODS: {id: GeneralStudyMethod, name: string, desc: string, icon: string}[] = [
    { id: 'ACTIVE_RECALL', name: 'Active Recall', desc: 'Paksa otak mengingat tanpa melihat catatan.', icon: 'Brain' },
    { id: 'PRACTICE', name: 'Latihan Soal', desc: 'Drill soal pilihan ganda dari materi.', icon: 'PenTool' },
    { id: 'SPACED_REPETITION', name: 'Spaced Repetition', desc: 'Flashcards untuk hafalan jangka panjang.', icon: 'Repeat' },
    { id: 'FEYNMAN', name: 'Feynman Technique', desc: 'Jelaskan materi seolah ke anak kecil.', icon: 'MessageCircle' },
    { id: 'MIND_MAP', name: 'Mind Mapping', desc: 'Visualisasikan hubungan antar konsep.', icon: 'Share2' },
    { id: 'PBL', name: 'Problem-Based', desc: 'Belajar lewat studi kasus nyata.', icon: 'Search' },
    { id: 'TEACHING', name: 'Teaching Method', desc: 'Simulasi mengajar murid (AI).', icon: 'GraduationCap' },
    { id: 'SQ3R', name: 'SQ3R Method', desc: 'Survey, Question, Read, Recite, Review.', icon: 'BookOpen' },
];

export const UTBK_SUBTESTS = [
  'Penalaran Umum',
  'Pengetahuan Kuantitatif',
  'Pemahaman Bacaan & Menulis',
  'Pengetahuan & Pemahaman Umum',
  'Literasi Bahasa Indonesia',
  'Literasi Bahasa Inggris',
  'Penalaran Matematika'
];

export const SKD_SUBTESTS = [
  'Tes Wawasan Kebangsaan (TWK)',
  'Tes Intelegensia Umum (TIU)',
  'Tes Karakteristik Pribadi (TKP)'
];

export const TPA_SUBTESTS = [
  'Verbal (Analogi, Silogisme)',
  'Numerik (Deret, Aritmatika)',
  'Penalaran Logis & Analitis',
  'Spasial (Gambar)',
  'Tes Bahasa Inggris (TBI)'
];

export const PSIKOTEST_SUBTESTS = [
  'Tes IQ General (Campuran)',
  'Logika Aritmatika',
  'Kemampuan Verbal',
  'Spasial & Pola Gambar'
];

export const INTERVIEW_TOPICS = [
  'Pertanyaan Personal (Kelebihan/Kekurangan)',
  'Motivasi & Komitmen',
  'Studi Kasus & Problem Solving',
  'Wawasan Kebangsaan & Integritas'
];

// Using Wikimedia Commons or reliable public placeholders for Ishihara
export const ISHIHARA_PLATES: IshiharaPlate[] = [
    { id: 1, image: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Ishihara_9.png", correctAnswer: "74", type: "Normal", description: "Orang normal melihat 74." },
    { id: 2, image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Ishihara_1.png", correctAnswer: "12", type: "Normal", description: "Semua orang (termasuk buta warna) harusnya melihat 12." },
    { id: 3, image: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Ishihara_2.png", correctAnswer: "8", type: "Red-Green", description: "Normal melihat 8, buta warna merah-hijau melihat 3." },
    { id: 4, image: "https://upload.wikimedia.org/wikipedia/commons/4/42/Ishihara_5.png", correctAnswer: "29", type: "Red-Green", description: "Normal melihat 29, buta warna merah-hijau melihat 70." },
    { id: 5, image: "https://upload.wikimedia.org/wikipedia/commons/9/93/Ishihara_6.png", correctAnswer: "5", type: "Red-Green", description: "Normal melihat 5, buta warna merah-hijau melihat 2." },
    { id: 6, image: "https://upload.wikimedia.org/wikipedia/commons/8/89/Ishihara_7.png", correctAnswer: "3", type: "Red-Green", description: "Normal melihat 3, buta warna merah-hijau melihat 5." },
    { id: 7, image: "https://upload.wikimedia.org/wikipedia/commons/6/68/Ishihara_11.png", correctAnswer: "6", type: "Red-Green", description: "Normal melihat 6, sebagian buta warna tidak melihat apa-apa." },
    { id: 8, image: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Ishihara_23.png", correctAnswer: "42", type: "Red-Green", description: "Normal melihat 42, buta warna merah/hijau melihat 2 atau 4." },
    { id: 9, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Ishihara_19.png/300px-Ishihara_19.png", correctAnswer: "nothing", type: "Total", description: "Normal tidak melihat angka. Beberapa kelainan melihat angka 2." },
    { id: 10, image: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Ishihara_Plate_8.jpg", correctAnswer: "6", type: "Normal", description: "Angka 6 terlihat jelas." },
];
