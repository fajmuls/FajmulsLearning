import React, { useState, useEffect, useRef } from 'react';
import { CategoryType, StudyMode, Question, DrillMaterial, GeneralMaterialInput, UserAnswer, SkdStreamType, TestHistoryItem, InterviewFeedback, GeneralStudyMethod, FlashcardData, MindMapNode, FeynmanFeedback, SkripsiFeature, IshiharaPlate, MaterialLength, QuestionDifficulty } from './types';
import { CATEGORIES, UTBK_SUBTESTS, SKD_SUBTESTS, TPA_SUBTESTS, PSIKOTEST_SUBTESTS, INTERVIEW_TOPICS, GENERAL_METHODS, ISHIHARA_PLATES } from './constants';
import * as Gemini from './services/geminiService';
import { Clock, Brain, Zap, Target, Upload, FileText, ChevronRight, AlertTriangle, CheckCircle, XCircle, Activity, ArrowLeft, Loader2, BookOpen, GraduationCap, Briefcase, MessageSquare, Palette, Repeat, Share2, PenTool, Landmark, Building2, Timer, MessageCircle, Filter, Calendar, TrendingUp, Award, Trash2, LogOut, Book, FileSearch, User as UserIcon, Save, Download, Upload as UploadIcon, Search, History, Lightbulb, Moon, Sun } from 'lucide-react';
import { PomodoroTimer } from './components/PomodoroTimer';
import { Flashcard } from './components/Flashcard';
import { MindMapViewer } from './components/MindMapViewer';
import { Quiz } from './components/Quiz';
import { SkeletonLoader, CardSkeleton } from './components/SkeletonLoader';

// --- HELPER COMPONENTS ---

// Simple Markdown Renderer
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/\n- (.*?)/g, '<br/>• $1')
        .replace(/\n/g, '<br/>');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm font-sans" />;
};

const LoginScreen: React.FC<{ onLogin: (name: string) => void }> = ({ onLogin }) => {
    const [name, setName] = useState('');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 transition-colors duration-300">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                        <GraduationCap size={32}/>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Selamat Datang</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Masukkan nama untuk mulai belajar.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onLogin(name); }}>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Pengguna</label>
                        <input 
                            type="text" 
                            className="w-full p-4 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:border-indigo-600 focus:ring-0 outline-none font-medium text-slate-800 placeholder:text-slate-400"
                            placeholder="Contoh: Budi Santoso"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-2">
                        Mulai Belajar <ChevronRight size={20}/>
                    </button>
                </form>
            </div>
        </div>
    );
};

// Canvas-based Ishihara Generator
const ColorBlindPlate: React.FC<{ targetNumber: number }> = ({ targetNumber }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw number on an offscreen canvas to get pixel data
        const offCanvas = document.createElement('canvas');
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return;

        offCtx.fillStyle = '#000000'; // Background
        offCtx.fillRect(0, 0, canvas.width, canvas.height);
        offCtx.fillStyle = '#FFFFFF'; // Text
        offCtx.font = 'bold 200px Arial';
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        offCtx.fillText(targetNumber.toString(), canvas.width / 2, canvas.height / 2);

        const imgData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;

        // 2. Generate dots
        // Dot colors
        const bgColors = ['#88B04B', '#92A8D1', '#955251', '#B565A7']; // Random greenish/bluish
        const fgColors = ['#FF6F61', '#E15D44', '#D65076', '#C3447A']; // Random reddish/pinkish

        const numCircles = 2200;
        
        for (let i = 0; i < numCircles; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const r = Math.random() * 5 + 2; // Radius 2-7

            // Check if this pixel is white (foreground)
            const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
            const isForeground = pixels[idx] > 128; // Red channel > 128 (White)

            // Pick color
            const palette = isForeground ? fgColors : bgColors;
            const color = palette[Math.floor(Math.random() * palette.length)];

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

    }, [targetNumber]);

    return <canvas ref={canvasRef} width={300} height={300} className="rounded-full shadow-inner bg-slate-100 dark:bg-slate-700 mx-auto" />;
};

const ColorBlindTest: React.FC<{ onBack: () => void, onComplete: (item: TestHistoryItem) => void }> = ({ onBack, onComplete }) => {
    // Generate simple random numbers 
    const [testPlates, setTestPlates] = useState<{number: number}[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        // Generate 10 random plates
        const plates = Array.from({length: 10}, () => ({
            number: Math.floor(Math.random() * 90) + 10 // 10-99
        }));
        setTestPlates(plates);
    }, []);

    const handleNext = () => {
        const newAnswers = [...answers, input];
        setAnswers(newAnswers);
        setInput('');

        if (currentIndex < testPlates.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setFinished(true);
        }
    };

    if (testPlates.length === 0) return <div className="p-10 text-center dark:text-white">Loading Plates...</div>;

    if (finished) {
        // Strict string comparison (trim spaces)
        const correctCount = testPlates.filter((p, i) => p.number.toString().trim() === answers[i]?.trim()).length;
        const passed = correctCount >= 8; 
        
        // Mocking Question objects for history compatibility
        const mockQuestions: Question[] = testPlates.map((p, i) => ({
            id: `cb-q-${i}`,
            type: 'short_answer',
            content: `Ishihara Plate #${i+1}`,
            correctAnswer: p.number.toString(),
            explanation: `Plate displayed number ${p.number}`,
            metadata: { difficulty: 'Medium', idealTimeSeconds: 10, topic: 'Buta Warna', subtest: 'Ishihara' }
        }));

        const mockAnswers: UserAnswer[] = answers.map((ans, i) => ({
            questionId: `cb-q-${i}`,
            selectedAnswer: ans,
            isCorrect: ans.trim() === testPlates[i].number.toString().trim(),
            scoreEarned: ans.trim() === testPlates[i].number.toString().trim() ? 10 : 0,
            timeTakenSeconds: 0,
            isOverthinking: false,
            isGuessing: false
        }));

        const historyItem: TestHistoryItem = {
            id: `cb-${Date.now()}`,
            date: new Date().toISOString(),
            category: 'BUTAWRNA',
            score: correctCount * 10,
            maxScore: 100,
            details: { type: 'Ishihara Simulation', passed },
            questions: mockQuestions,
            answers: mockAnswers
        };

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center transition-colors">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-lg w-full text-center max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {passed ? <CheckCircle size={40}/> : <AlertTriangle size={40}/>}
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">{passed ? 'Hasil Normal' : 'Indikasi Buta Warna'}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Skor Anda: {correctCount}/{testPlates.length}</p>
                    
                    {/* Detail Results Table */}
                    <div className="mb-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-left">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold">
                                <tr>
                                    <th className="p-3">Plate</th>
                                    <th className="p-3">Angka</th>
                                    <th className="p-3">Jawab</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {testPlates.map((p, i) => {
                                    const userAns = answers[i];
                                    const isRight = p.number.toString().trim() === userAns.trim();
                                    return (
                                        <tr key={i} className="border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                            <td className="p-3 font-medium">#{i+1}</td>
                                            <td className="p-3 font-mono">{p.number}</td>
                                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{userAns || '-'}</td>
                                            <td className="p-3">
                                                {isRight ? <CheckCircle size={16} className="text-emerald-500"/> : <XCircle size={16} className="text-rose-500"/>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-sm text-slate-400 mb-6">Catatan: Ini hanya simulasi. Konsultasikan dengan dokter mata untuk diagnosis resmi.</p>
                    
                    <button onClick={() => onComplete(historyItem)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none">
                        Simpan & Keluar
                    </button>
                </div>
            </div>
        );
    }

    const plate = testPlates[currentIndex];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center transition-colors">
             <div className="w-full max-w-md">
                 <button onClick={onBack} className="flex items-center text-slate-500 dark:text-slate-400 mb-6 hover:text-indigo-600"><ArrowLeft size={18} className="mr-2"/> Batalkan Tes</button>
                 
                 <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 text-center">
                     <div className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Plate {currentIndex + 1} of {testPlates.length}</div>
                     
                     <div className="mb-8 flex justify-center bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                         <ColorBlindPlate targetNumber={plate.number} />
                     </div>

                     <p className="mb-4 text-slate-600 dark:text-slate-300 font-medium">Angka berapa yang Anda lihat?</p>
                     
                     <input 
                        type="number" 
                        className="w-full p-4 text-center text-2xl font-bold border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl mb-6 focus:border-indigo-600 focus:ring-0 outline-none"
                        placeholder="?"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && input && handleNext()}
                     />

                     <button 
                        onClick={handleNext}
                        disabled={!input}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 hover:bg-indigo-700 transition"
                     >
                         Lanjut
                     </button>

                     <p className="mt-4 text-xs text-slate-400">Jika tidak melihat angka, isi 0.</p>
                 </div>
             </div>
        </div>
    );
};

const ResultsAnalysis: React.FC<{ 
    answers: UserAnswer[], 
    questions: Question[], 
    onHome: () => void, 
    onRetry: () => void,
    category: CategoryType 
}> = ({ answers, questions, onHome, onRetry, category }) => {
    // Basic Scoring Logic
    const correctCount = answers.filter(a => a.isCorrect).length;
    let score = 0;
    
    // Improvement Logic
    const [improvementAdvice, setImprovementAdvice] = useState<string>('');
    const [loadingAdvice, setLoadingAdvice] = useState(false);
    
    const wrongAnswers = answers.filter(a => !a.isCorrect);
    const weakTopics = Array.from<string>(new Set(wrongAnswers.map(a => {
        const q = questions.find(qu => qu.id === a.questionId);
        return (q?.metadata?.subtest || q?.metadata?.topic || 'General') as string;
    })));

    if (category === 'GENERAL') {
         const totalPoints = answers.reduce((acc, curr) => acc + (curr.scoreEarned || 0), 0);
         score = Math.round(totalPoints / (questions.length || 1));
    } else {
         score = Math.round((correctCount / questions.length) * 100);
    }

    const handleGetAdvice = async () => {
        setLoadingAdvice(true);
        try {
            const advice = await Gemini.getImprovementAdvice(weakTopics);
            setImprovementAdvice(advice);
        } catch (e) {
            alert("Gagal memuat saran AI.");
        } finally {
            setLoadingAdvice(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 p-6 md:p-12 flex flex-col items-center transition-colors">
            <div className="max-w-2xl w-full text-center">
                <div className="inline-block p-4 rounded-full bg-slate-50 dark:bg-slate-800 mb-6">
                    {score >= 80 ? <Award size={48} className="text-emerald-500"/> : <Activity size={48} className="text-amber-500"/>}
                </div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Sesi Selesai!</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Berikut adalah analisis hasil belajar Anda.</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="text-slate-400 font-bold text-xs uppercase mb-1">Skor Akhir</div>
                        <div className="text-4xl font-black text-slate-900 dark:text-white">{score}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="text-slate-400 font-bold text-xs uppercase mb-1">{category === 'GENERAL' ? 'Rata-rata Poin' : 'Akurasi'}</div>
                        <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                             {category === 'GENERAL' ? score : `${Math.round((correctCount/questions.length)*100)}%`}
                        </div>
                    </div>
                </div>

                {/* Weakness Section */}
                {weakTopics.length > 0 && (
                    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900 p-6 rounded-2xl mb-8 text-left">
                        <h3 className="font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2"><Target size={20}/> Topik Perlu Perbaikan</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {weakTopics.map(t => (
                                <span key={t} className="bg-white dark:bg-rose-900/40 text-rose-600 dark:text-rose-200 px-3 py-1 rounded-full text-xs font-bold border border-rose-200 dark:border-rose-800">{t}</span>
                            ))}
                        </div>
                        
                        {!improvementAdvice ? (
                            <button 
                                onClick={handleGetAdvice}
                                disabled={loadingAdvice}
                                className="text-sm font-bold text-rose-700 dark:text-rose-400 underline flex items-center gap-1 hover:text-rose-900 dark:hover:text-rose-300"
                            >
                                {loadingAdvice ? <Loader2 className="animate-spin" size={14}/> : <Lightbulb size={14}/>}
                                Minta Saran Perbaikan AI
                            </button>
                        ) : (
                            <div className="mt-4 pt-4 border-t border-rose-200 dark:border-rose-800">
                                <h4 className="font-bold text-sm text-rose-800 dark:text-rose-400 mb-2">Saran AI:</h4>
                                <div className="prose prose-sm prose-rose max-w-none text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-100 dark:border-rose-800">
                                    <SimpleMarkdown text={improvementAdvice} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden text-left mb-8">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200">Detail Jawaban</div>
                    <div className="max-h-96 overflow-y-auto">
                        {questions.map((q, i) => {
                            const ans = answers.find(a => a.questionId === q.id);
                            const isCorrect = ans?.isCorrect;
                            return (
                                <div key={i} className="p-4 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Soal {i+1}</span>
                                        {isCorrect ? <CheckCircle size={16} className="text-emerald-500"/> : <XCircle size={16} className="text-rose-500"/>}
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{q.content}</p>
                                    {!isCorrect && q.type === 'multiple_choice' && <p className="text-xs text-rose-500 mt-1">Jawaban: {ans?.selectedAnswer || '-'} (Kunci: {q.correctAnswer})</p>}
                                    {q.type !== 'multiple_choice' && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{ans?.aiEvaluation || 'Evaluasi AI'}</p>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={onHome} className="flex-1 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        Ke Menu Utama
                    </button>
                    <button onClick={onRetry} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition">
                        Coba Lagi
                    </button>
                </div>
            </div>
        </div>
    );
};

const HistoryView: React.FC<{ 
    history: TestHistoryItem[], 
    onBack: () => void, 
    onReview: (item: TestHistoryItem) => void, 
    username: string,
    onExport: () => void,
    onImport: (file: File) => void,
    isDarkMode?: boolean
}> = ({ history, onBack, onReview, username, onExport, onImport }) => {
    const [filterCategory, setFilterCategory] = useState<'ALL' | CategoryType>('ALL');
    const fileRef = useRef<HTMLInputElement>(null);

    const filteredHistory = history.filter(item => filterCategory === 'ALL' || item.category === filterCategory);
    const totalTests = filteredHistory.length;
    const avgScore = totalTests > 0 ? Math.round(filteredHistory.reduce((a, b) => a + b.score, 0) / totalTests) : 0;
    const highestScore = totalTests > 0 ? Math.max(...filteredHistory.map(h => h.score)) : 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
            <div className="max-w-4xl mx-auto">
                {/* Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-700 dark:text-slate-300"><ArrowLeft size={20}/></button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Belajar</h1>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <UserIcon size={12}/> {username}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm">
                            <Download size={14}/> Backup JSON
                        </button>
                        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 rounded-xl font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition shadow-sm">
                            <UploadIcon size={14}/> Restore JSON
                        </button>
                        <input type="file" ref={fileRef} className="hidden" accept=".json" onChange={(e) => { if (e.target.files?.[0]) onImport(e.target.files[0]); if (fileRef.current) fileRef.current.value = ''; }} />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                    <button onClick={() => setFilterCategory('ALL')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${filterCategory === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        Semua
                    </button>
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${filterCategory === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 font-bold text-xs uppercase tracking-wider"><Filter size={14}/> Total Tes</div>
                        <div className="text-3xl font-black text-slate-800 dark:text-white">{totalTests}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 font-bold text-xs uppercase tracking-wider"><TrendingUp size={14}/> Rata-rata</div>
                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{avgScore}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 font-bold text-xs uppercase tracking-wider"><Award size={14}/> Tertinggi</div>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{highestScore}</div>
                    </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                            <History size={48} className="mx-auto mb-4 opacity-20"/>
                            <p>Tidak ada riwayat untuk kategori ini.</p>
                        </div>
                    ) : (
                        filteredHistory.map(item => (
                            <div key={item.id} onClick={() => onReview(item)} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500 cursor-pointer transition group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                                item.category === 'UTBK' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : 
                                                item.category === 'SKD' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 
                                                item.category === 'GENERAL' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                                                'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                            }`}>
                                                {item.category}
                                            </span>
                                            {item.skdStream && <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded">{item.skdStream}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                            <Calendar size={14}/> 
                                            {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} 
                                            <span className="opacity-50">•</span>
                                            {new Date(item.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-black text-slate-800 dark:text-white">{item.score}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKOR</div>
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 flex justify-between items-center relative z-10">
                                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md text-xs font-bold text-slate-600 dark:text-slate-300">{(item.questions || []).length} Soal</span>
                                        {item.details && (item.details as any).passed !== undefined && (
                                            (item.details as any).passed ? 
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle size={14}/> Lulus</span> : 
                                            <span className="text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1"><XCircle size={14}/> Tidak Lulus</span>
                                        )}
                                    </div>
                                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Review Detail <ChevronRight size={16}/>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

const ReviewView: React.FC<{ item: TestHistoryItem, onBack: () => void }> = ({ item, onBack }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
            <div className="max-w-3xl mx-auto">
                <button onClick={onBack} className="mb-4 text-slate-500 dark:text-slate-400 flex items-center"><ArrowLeft size={16} className="mr-1"/> Kembali</button>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Review: {item.category}</h2>
                    <div className="space-y-4">
                        {item.questions.map((q, i) => {
                            const ans = item.answers.find(a => a.questionId === q.id);
                            return (
                                <div key={i} className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl">
                                    <div className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">Soal {i+1}</div>
                                    <p className="mb-2 text-slate-700 dark:text-slate-300">{q.content}</p>
                                    <div className="text-sm">
                                        <span className={ans?.isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                                            Jawaban Anda: {ans?.selectedAnswer || '-'}
                                        </span>
                                        {!ans?.isCorrect && (
                                            <span className="ml-4 text-slate-500 dark:text-slate-400">Kunci: {q.correctAnswer}</span>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2 rounded">
                                        <b>Penjelasan:</b> {q.explanation}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SkripsiSession: React.FC<{ result: string, feature: SkripsiFeature, onBack: () => void }> = ({ result, feature, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <button onClick={onBack} className="mb-4 text-slate-500 dark:text-slate-400 flex items-center gap-2"><ArrowLeft size={18}/> Kembali</button>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
             <Book size={28} className="text-indigo-600"/> Hasil {feature}
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
             <SimpleMarkdown text={result} />
          </div>
        </div>
      </div>
    </div>
  );
};

const InterviewSession: React.FC<{ questions: Question[], onComplete: (answers: UserAnswer[]) => void }> = ({ questions, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserAnswer[]>([]);

  const currentQ = questions[index];

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
        const fb = await Gemini.evaluateInterviewAnswer(currentQ.content, answer);
        setFeedback(fb);
    } catch (e) {
        alert("Gagal evaluasi.");
    } finally {
        setLoading(false);
    }
  };

  const handleNext = () => {
      const newResult: UserAnswer = {
          questionId: currentQ.id,
          selectedAnswer: answer,
          isCorrect: true, // Subjective
          scoreEarned: feedback?.score || 0,
          timeTakenSeconds: 0,
          isOverthinking: false,
          isGuessing: false,
          interviewFeedback: feedback || undefined
      };
      const updatedResults = [...results, newResult];
      setResults(updatedResults);
      setAnswer('');
      setFeedback(null);

      if (index < questions.length - 1) {
          setIndex(index + 1);
      } else {
          onComplete(updatedResults);
      }
  };

  return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
               <div className="mb-4 text-sm font-bold text-slate-400">Pertanyaan {index + 1} dari {questions.length}</div>
               <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">{currentQ.content}</h2>
               
               {!feedback ? (
                   <>
                       <textarea 
                            className="w-full p-4 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl mb-4 h-40 focus:ring-2 focus:ring-indigo-500"
                            placeholder="Jawab seolah sedang interview..."
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                       />
                       <button 
                            onClick={handleSubmit} 
                            disabled={loading || !answer}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                       >
                           {loading ? <Loader2 className="animate-spin"/> : <MessageSquare size={18}/>} Submit Jawaban
                       </button>
                   </>
               ) : (
                   <div className="animate-fade-in-up">
                       <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                           <div className="flex justify-between items-center mb-2">
                               <span className="font-bold text-slate-700 dark:text-slate-300">Skor: {feedback.score}/100</span>
                               <span className="text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">{feedback.toneAnalysis}</span>
                           </div>
                           <p className="text-sm text-slate-600 dark:text-slate-400 mb-2"><b>Feedback:</b> {feedback.feedback}</p>
                           <div className="text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
                               <b>Saran Jawaban:</b> {feedback.improvedAnswer}
                           </div>
                       </div>
                       <button onClick={handleNext} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90">
                           Lanjut
                       </button>
                   </div>
               )}
          </div>
      </div>
  );
};

const FlashcardSession: React.FC<{ flashcards: FlashcardData[], onFinish: () => void }> = ({ flashcards, onFinish }) => {
    const [index, setIndex] = useState(0);

    const handleNext = (rating: 'easy' | 'medium' | 'hard') => {
        if (index < flashcards.length - 1) {
            setIndex(index + 1);
        } else {
            onFinish();
        }
    };

    if (flashcards.length === 0) return <div>No Flashcards</div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center">
             <div className="w-full max-w-xl mb-6 flex justify-between items-center">
                 <button onClick={onFinish} className="text-slate-500 hover:text-indigo-600"><ArrowLeft size={20}/></button>
                 <span className="font-bold text-slate-400">{index + 1} / {flashcards.length}</span>
             </div>
             <Flashcard data={flashcards[index]} onNext={handleNext} />
        </div>
    );
};

const FeynmanSession: React.FC<{ topic: string, onFinish: () => void }> = ({ topic, onFinish }) => {
    const [explanation, setExplanation] = useState('');
    const [feedback, setFeedback] = useState<FeynmanFeedback | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const fb = await Gemini.evaluateFeynman(topic, explanation);
            setFeedback(fb);
        } catch(e) { alert("Error"); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Feynman Technique</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Jelaskan topik <b>"{topic}"</b> seolah-olah Anda sedang mengajari anak kecil (5 tahun). Gunakan bahasa sederhana.</p>
                
                {!feedback ? (
                    <>
                        <textarea 
                            className="w-full p-4 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl mb-4 h-48 focus:ring-2 focus:ring-indigo-500"
                            placeholder="Mulai jelaskan di sini..."
                            value={explanation}
                            onChange={e => setExplanation(e.target.value)}
                        />
                        <button 
                            onClick={handleSubmit}
                            disabled={loading || !explanation}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? "Menganalisis..." : "Cek Pemahaman Saya"}
                        </button>
                    </>
                ) : (
                    <div className="animate-fade-in-up">
                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`text-2xl font-bold ${feedback.understandingScore > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{feedback.understandingScore}/100</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold">Skor Pemahaman</div>
                            </div>
                            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                                <p><b>Kualitas Penyederhanaan:</b> {feedback.simplificationQuality}</p>
                                <p><b>Konsep yang Terlewat:</b> {feedback.missingConcepts.join(', ') || 'Tidak ada'}</p>
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300">
                                    <b>Koreksi / Saran:</b> {feedback.correction}
                                </div>
                            </div>
                        </div>
                        <button onClick={onFinish} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold">
                            Selesai Belajar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const SQ3RSession: React.FC<{ topic: string, onFinish: () => void }> = ({ topic, onFinish }) => {
    const steps = ['Survey', 'Question', 'Read', 'Recite', 'Review'];
    const [step, setStep] = useState(0);

    const contents = [
        "Lakukan scanning cepat pada materi. Baca judul, subjudul, dan kesimpulan. Dapatkan gambaran besar.",
        "Buat pertanyaan dari judul/subjudul. Apa yang ingin Anda ketahui? Ubah judul menjadi pertanyaan.",
        "Baca materi dengan seksama untuk mencari jawaban atas pertanyaan Anda tadi.",
        "Tutup materi. Ucapkan kembali apa yang baru saja dibaca dengan kata-kata sendiri.",
        "Review ulang seluruh materi dan catatan Anda. Pastikan semuanya tersimpan di memori."
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-center">
                <div className="flex justify-center mb-8">
                    {steps.map((s, i) => (
                        <div key={s} className={`flex items-center ${i < steps.length - 1 ? 'w-full' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${i <= step ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                {s[0]}
                            </div>
                            {i < steps.length - 1 && <div className={`h-1 flex-1 ${i < step ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-700'}`}></div>}
                        </div>
                    ))}
                </div>
                
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">{steps[step]}</h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">{contents[step]}</p>
                
                <button 
                    onClick={() => {
                        if (step < 4) setStep(step + 1);
                        else onFinish();
                    }}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                >
                    {step < 4 ? 'Lanjut Tahap Berikutnya' : 'Selesai SQ3R'}
                </button>
            </div>
        </div>
    );
};

const SessionEngine: React.FC<{
  mode: StudyMode;
  questions: Question[];
  drillContent: DrillMaterial | null;
  onComplete: (answers: UserAnswer[]) => void;
  isSkdSimulation?: boolean;
  isUtbkSimulation?: boolean;
  category: CategoryType;
}> = ({ mode, questions, drillContent, onComplete, isSkdSimulation, isUtbkSimulation, category }) => {
    // Determine time limit
    const getInitialTime = () => {
        if (isSkdSimulation) return 100 * 60; // 100 minutes
        if (isUtbkSimulation) return 195 * 60; // 195 minutes
        if (category === 'PSIKOTEST' && mode === StudyMode.SIMULATION) return 40 * 60; // 40 minutes for 40 questions
        if (category === 'TPA' && mode === StudyMode.SIMULATION) return 100 * 60;
        return 0; // No timer for practice
    };

    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(getInitialTime());
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isThinking, setIsThinking] = useState(false); // Overthinking detector
    const startTimeRef = useRef(Date.now());
    
    // Timer Effect
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && (isSkdSimulation || isUtbkSimulation)) {
            // Time up
            onComplete(userAnswers);
        }
    }, [timeLeft, isSkdSimulation, isUtbkSimulation, userAnswers, onComplete]);

    // Reset state on question change
    useEffect(() => {
        setSelectedOption(null);
        setShowExplanation(false);
        startTimeRef.current = Date.now();
        setIsThinking(false);
        
        // Detect overthinking after 2 minutes on single question
        const thinker = setTimeout(() => setIsThinking(true), 120000);
        return () => clearTimeout(thinker);
    }, [currentIndex]);

    const handleAnswer = async (option: string) => {
        if (selectedOption) return; // Prevent double answer
        setSelectedOption(option);
        
        const currentQ = questions[currentIndex];
        const timeTaken = (Date.now() - startTimeRef.current) / 1000;
        
        let score = 0;
        let isCorrect = false;

        // Scoring Logic
        if (currentQ.tkpPoints) {
            // TKP
            const point = currentQ.tkpPoints.find(p => p.option === option);
            score = point ? point.points : 0;
            isCorrect = score === 5; // Convention: 5 is "correct" best answer
        } else {
            // Standard
            isCorrect = option === currentQ.correctAnswer;
            score = isCorrect ? (category === 'UTBK' ? 1000 : 5) : 0; // UTBK IRT simplified
        }

        // Flexible grading check (for general essay/short answer if generic)
        let aiEval = '';
        if (currentQ.type !== 'multiple_choice' && category === 'GENERAL') {
             // Use Gemini to grade flexible answer
             try {
                 const grade = await Gemini.evaluateFlexibleAnswer(currentQ.content, currentQ.correctAnswer, option);
                 score = grade.score;
                 isCorrect = grade.isCorrect;
                 aiEval = grade.feedback;
             } catch(e) { console.error("Grading failed"); }
        }

        const newAnswer: UserAnswer = {
            questionId: currentQ.id,
            selectedAnswer: option,
            isCorrect,
            scoreEarned: score,
            timeTakenSeconds: timeTaken,
            isOverthinking: isThinking,
            isGuessing: timeTaken < 3, // Too fast = guessing
            aiEvaluation: aiEval
        };

        const updatedAnswers = [...userAnswers, newAnswer];
        setUserAnswers(updatedAnswers);

        // In Simulation, don't show explanation immediately?
        // Usually simulations don't show answers until end.
        if (mode === StudyMode.SIMULATION) {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                onComplete(updatedAnswers);
            }
        } else {
            // Drill / Practice: Show explanation
            setShowExplanation(true);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete(userAnswers);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const currentQ = questions[currentIndex];
    if (!currentQ) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 flex flex-col items-center transition-colors">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                        Soal {currentIndex + 1} <span className="text-slate-300 dark:text-slate-600">/ {questions.length}</span>
                    </div>
                    {timeLeft > 0 && (
                        <div className={`font-mono text-xl font-bold flex items-center gap-2 ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
                            <Timer size={20}/> {formatTime(timeLeft)}
                        </div>
                    )}
                </div>

                {/* Question Card */}
                <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
                    {mode === StudyMode.DRILL && drillContent && (
                        <div className="mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 text-sm text-slate-700 dark:text-slate-300">
                             <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-2"><Zap size={16}/> {drillContent.topic}</h4>
                             <p className="mb-2">{drillContent.summary}</p>
                             <ul className="list-disc pl-4 space-y-1">
                                 {drillContent.keyPoints.map((k,i) => <li key={i}>{k}</li>)}
                             </ul>
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                             {currentQ.metadata?.subtest || currentQ.metadata?.topic}
                         </span>
                         {currentQ.metadata?.difficulty === 'HOTS' && (
                             <span className="text-xs font-bold text-white bg-rose-500 px-2 py-1 rounded flex items-center gap-1"><Zap size={10}/> HOTS</span>
                         )}
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-8 leading-relaxed">
                        <SimpleMarkdown text={currentQ.content} />
                    </h2>

                    {currentQ.type === 'multiple_choice' ? (
                        <div className="space-y-3">
                            {currentQ.options?.map((opt, idx) => {
                                let stateClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500";
                                let icon = <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-500 flex items-center justify-center text-xs font-bold text-slate-400">{String.fromCharCode(65+idx)}</div>;
                                
                                if (selectedOption) {
                                    if (opt === selectedOption) {
                                        // Selected
                                        if (mode === StudyMode.SIMULATION) {
                                            stateClass = "bg-indigo-600 text-white border-indigo-600";
                                            icon = <CheckCircle size={20} className="text-white"/>;
                                        } else {
                                            // Practice Mode Feedback
                                            const isCorrect = currentQ.tkpPoints ? false : opt === currentQ.correctAnswer;
                                            if (currentQ.tkpPoints) {
                                                stateClass = "bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700";
                                            } else if (isCorrect) {
                                                stateClass = "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400";
                                                icon = <CheckCircle size={20}/>;
                                            } else {
                                                stateClass = "bg-rose-50 dark:bg-rose-900/30 border-rose-500 text-rose-700 dark:text-rose-400";
                                                icon = <XCircle size={20}/>;
                                            }
                                        }
                                    } else if (mode !== StudyMode.SIMULATION && !currentQ.tkpPoints && opt === currentQ.correctAnswer) {
                                        // Show correct answer if missed in practice
                                        stateClass = "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 opacity-70";
                                        icon = <CheckCircle size={20}/>;
                                    } else {
                                        stateClass = "opacity-50 grayscale";
                                    }
                                }

                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => handleAnswer(opt)}
                                        disabled={!!selectedOption && mode !== StudyMode.SIMULATION} 
                                        className={`w-full p-4 rounded-xl border-2 text-left transition flex items-center gap-4 ${stateClass}`}
                                    >
                                        {icon}
                                        <div className="font-medium text-sm md:text-base flex-1 dark:text-white"><SimpleMarkdown text={opt} /></div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        // Short Answer / Essay Input
                        <div>
                             <textarea 
                                className="w-full p-4 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl mb-4"
                                placeholder="Ketik jawaban Anda..."
                                disabled={!!selectedOption}
                                onBlur={(e) => handleAnswer(e.target.value)}
                             />
                             {selectedOption && (
                                 <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm">
                                     <b>Jawaban Anda:</b> {selectedOption}
                                 </div>
                             )}
                        </div>
                    )}

                    {/* Feedback Section (Practice Mode Only) */}
                    {showExplanation && (
                        <div className="mt-8 animate-fade-in-up">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-slate-700 dark:text-slate-300">
                                <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2"><Lightbulb size={18}/> Pembahasan</h4>
                                <SimpleMarkdown text={currentQ.explanation} />
                                {currentQ.shortcut && (
                                    <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800">
                                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Cara Cepat / Trik</span>
                                        <p className="text-sm italic">{currentQ.shortcut}</p>
                                    </div>
                                )}
                            </div>
                            <button onClick={handleNext} className="w-full mt-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg">
                                {currentIndex === questions.length - 1 ? 'Selesai & Lihat Hasil' : 'Soal Selanjutnya'} <ChevronRight size={18}/>
                            </button>
                        </div>
                    )}

                    {/* Navigation for Simulation (Manual Next) */}
                    {mode === StudyMode.SIMULATION && (
                        <div className="mt-8 flex justify-end">
                             <button onClick={handleNext} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                                 {currentIndex === questions.length - 1 ? 'Selesai' : 'Lanjut'}
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<{
  category: CategoryType;
  onBack: () => void;
  onStartSession: (mode: StudyMode, difficulty?: string, count?: number) => void;
  onGeneralInputSubmit: (input: GeneralMaterialInput) => void;
  generalInput: GeneralMaterialInput | null;
  setGeneralInput?: (input: GeneralMaterialInput | null) => void;
  isReadingMaterial: boolean;
  onResetMaterial: () => void;
  onSubtestSelect: (s: string) => void;
  selectedSubtest: string;
  weakTopicsCount: number;
  loading: boolean;
  skdStream: SkdStreamType | null;
  onSkdStreamSelect: (s: SkdStreamType) => void;
  onHistory: () => void;
  onStartGeneralSession: (m: GeneralStudyMethod) => void;
  onStartSkripsiSession?: (feature: SkripsiFeature, input: string) => void;
  username: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}> = ({ category, onBack, onStartSession, onGeneralInputSubmit, generalInput, setGeneralInput, isReadingMaterial, onResetMaterial, onSubtestSelect, selectedSubtest, weakTopicsCount, loading, skdStream, onSkdStreamSelect, onHistory, onStartGeneralSession, onStartSkripsiSession, username, isDarkMode, onToggleDarkMode }) => {
  
  const [inputText, setInputText] = useState('');
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [materialLength, setMaterialLength] = useState<MaterialLength>('MEDIUM');
  const [questionDiff, setQuestionDiff] = useState<QuestionDifficulty>('MEDIUM');
  const [pdfLoading, setPdfLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New State for Custom Practice
  const [practiceCount, setPracticeCount] = useState<number>(5);
  const [practiceDifficulty, setPracticeDifficulty] = useState<string>('Medium');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.type !== 'application/pdf') {
            alert("Hanya file PDF yang diperbolehkan.");
            return;
        }
        setPdfName(file.name);
        setInputText('');
        setPdfLoading(true);
        
        // Immediate preview logic simulation with slightly better feedback
        const reader = new FileReader();
        reader.onload = (ev) => {
             // Keep raw base64 for the API
             const rawBase64 = (ev.target?.result as string).split(',')[1];
             
             // Simulate a short loading delay for visual feedback if file is small, 
             // but mostly just set state when done
             setTimeout(() => {
                 if (setGeneralInput) {
                     setGeneralInput({ 
                         type: 'pdf', 
                         content: rawBase64, // For API
                         title: file.name, 
                         lengthPreference: materialLength, 
                         difficultyPreference: questionDiff,
                    });
                 }
                 setPdfLoading(false);
             }, 800);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleInputSubmit = () => {
    if (generalInput?.type === 'pdf') {
         onGeneralInputSubmit({ ...generalInput, lengthPreference: materialLength, difficultyPreference: questionDiff });
    } else if (inputText) {
         onGeneralInputSubmit({ type: 'text', content: inputText, title: 'Input Manual', lengthPreference: materialLength, difficultyPreference: questionDiff });
    } else {
        alert("Mohon masukkan teks atau upload PDF.");
    }
  };

  const renderSubtests = (list: string[]) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 animate-fade-in-up">
        <h3 className="font-bold text-slate-800 dark:text-white mb-3">Pilih Topik / Subtes:</h3>
        <div className="flex flex-wrap gap-2">
            {list?.map(sub => (
                <button
                    key={sub}
                    onClick={() => onSubtestSelect(sub)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedSubtest === sub ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                    {sub}
                </button>
            ))}
        </div>
        
        {/* CUSTOM PRACTICE CONFIGURATION PANEL */}
        {selectedSubtest && category !== 'INTERVIEW' && category !== 'SKRIPSI' && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block uppercase">Jumlah Soal</label>
                        <select 
                            value={practiceCount}
                            onChange={(e) => setPracticeCount(Number(e.target.value))}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl font-medium dark:text-white"
                        >
                            <option value="5">5 Soal</option>
                            <option value="10">10 Soal</option>
                            <option value="15">15 Soal</option>
                            <option value="20">20 Soal</option>
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block uppercase">Tingkat Kesulitan</label>
                        <select 
                            value={practiceDifficulty}
                            onChange={(e) => setPracticeDifficulty(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl font-medium dark:text-white"
                        >
                            <option value="Easy">Mudah</option>
                            <option value="Medium">Sedang</option>
                            <option value="Hard">Sulit</option>
                            <option value="HOTS">HOTS (Analisis Tinggi)</option>
                        </select>
                    </div>
                    <button 
                        onClick={() => onStartSession(StudyMode.PRACTICE, practiceDifficulty, practiceCount)}
                        className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-2"
                    >
                        <PenTool size={18}/> Mulai Latihan
                    </button>
                </div>
            </div>
        )}

        {category === 'INTERVIEW' && selectedSubtest && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-4 animate-fade-in-up">
                <button 
                    onClick={() => onStartSession(StudyMode.DRILL)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-2"
                >
                    <MessageSquare size={20}/> Mulai Sesi Wawancara
                </button>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors duration-300">
      <PomodoroTimer />
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <button onClick={onBack} className="flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 font-medium">
            <ArrowLeft size={18} className="mr-2" /> Kembali
            </button>
            <div className="flex items-center gap-3">
                {onToggleDarkMode && (
                    <button onClick={onToggleDarkMode} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition">
                        {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}
                    </button>
                )}
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <UserIcon size={12}/> {username}
                </span>
            </div>
        </div>

        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-sm font-bold tracking-wider text-indigo-600 uppercase mb-1 block">{category} Dashboard</span>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pusat Kendali Belajar</h1>
          </div>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-4" />
                <p className="text-slate-500 font-medium">AI sedang memproses materi...</p>
                <div className="max-w-md w-full mt-8 space-y-4">
                     <CardSkeleton />
                </div>
            </div>
        ) : (
            <>
                {category === 'SKRIPSI' && (
                     <div className="animate-fade-in-up max-w-2xl mx-auto">
                         <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                             <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Book size={24} className="text-indigo-600"/> Skripsi Assistant</h3>
                             <p className="text-slate-500 dark:text-slate-400 mb-6">Masukkan topik atau judul skripsi Anda untuk mendapatkan bantuan AI.</p>
                             <textarea 
                                className="w-full p-4 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl mb-6 focus:ring-2 focus:ring-indigo-500 h-32"
                                placeholder="Contoh: Pengaruh Kecerdasan Buatan terhadap Minat Belajar Mahasiswa Teknik Informatika..."
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                             />
                             <div className="grid grid-cols-2 gap-3">
                                 <button onClick={() => onStartSkripsiSession && onStartSkripsiSession('TITLE_IDEAS', inputText)} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex flex-col items-center gap-2 border border-indigo-100 dark:border-indigo-800">
                                     <Brain size={24}/> Ide Judul
                                 </button>
                                 <button onClick={() => onStartSkripsiSession && onStartSkripsiSession('OUTLINE', inputText)} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex flex-col items-center gap-2 border border-emerald-100 dark:border-emerald-800">
                                     <FileText size={24}/> Buat Outline
                                 </button>
                                 <button onClick={() => onStartSkripsiSession && onStartSkripsiSession('METHODOLOGY', inputText)} className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 flex flex-col items-center gap-2 border border-amber-100 dark:border-amber-800">
                                     <Search size={24}/> Cek Metodologi
                                 </button>
                                 <button onClick={() => onStartSkripsiSession && onStartSkripsiSession('PARAPHRASE', inputText)} className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 flex flex-col items-center gap-2 border border-rose-100 dark:border-rose-800">
                                     <FileSearch size={24}/> Parafrase Teks
                                 </button>
                             </div>
                         </div>
                     </div>
                )}

                {category === 'GENERAL' && (
                    <div className="space-y-8 animate-fade-in-up">
                        {!isReadingMaterial ? (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Upload size={20}/> Input Materi</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Masukkan topik, teks materi, atau upload PDF yang ingin dipelajari.</p>
                                <div className="flex gap-2 mb-4">
                                    <input 
                                        type="text" 
                                        className="flex-1 p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                                        placeholder={pdfName ? `PDF Terpilih: ${pdfName}` : "Contoh: Perang Dunia II, Hukum Newton, atau paste teks..."}
                                        value={inputText}
                                        disabled={!!pdfName}
                                        onChange={e => {
                                            setInputText(e.target.value);
                                        }}
                                    />
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <button 
                                        className={`p-3 rounded-xl transition flex items-center gap-2 ${pdfName ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`} 
                                        title="Upload PDF"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <FileText size={20}/>
                                        <span className="hidden sm:inline font-bold text-sm">Upload PDF</span>
                                    </button>
                                </div>
                                {pdfName && (
                                    <div className="mb-4 text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-lg flex items-center justify-between animate-fade-in-up border border-emerald-100 dark:border-emerald-800">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={16}/> 
                                            <span>File siap: <b>{pdfName}</b></span>
                                        </div>
                                        <button onClick={() => {
                                            setPdfName(null);
                                            setGeneralInput && setGeneralInput(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }} className="text-slate-400 hover:text-rose-500" title="Hapus PDF"><Trash2 size={16}/></button>
                                    </div>
                                )}
                                
                                {/* PREVIEW PDF BEFORE PROCESSING */}
                                {pdfLoading ? (
                                    <div className="mb-6 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                            <Loader2 size={14} className="animate-spin"/> Memuat Preview PDF...
                                        </div>
                                        <SkeletonLoader height="h-[300px]" className="rounded-xl" />
                                    </div>
                                ) : generalInput?.type === 'pdf' && generalInput.content && (
                                     <div className="mb-6 animate-fade-in-up">
                                         <label className="text-xs font-bold text-slate-500 mb-2 block">Preview PDF:</label>
                                         <embed 
                                             src={`data:application/pdf;base64,${generalInput.content}`} 
                                             className="w-full h-[300px] rounded-xl border border-slate-200 dark:border-slate-700" 
                                             type="application/pdf" 
                                         />
                                     </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Panjang Materi (Ringkasan)</label>
                                        <select value={materialLength} onChange={(e) => setMaterialLength(e.target.value as MaterialLength)} className="w-full p-3 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium">
                                            <option value="SHORT">Ringkas / Poin Penting</option>
                                            <option value="MEDIUM">Standar (Rekomedasi)</option>
                                            <option value="LONG">Mendalam / Detail</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Tingkat Kesulitan Soal</label>
                                        <select value={questionDiff} onChange={(e) => setQuestionDiff(e.target.value as QuestionDifficulty)} className="w-full p-3 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium">
                                            <option value="EASY">Mudah (Recall)</option>
                                            <option value="MEDIUM">Sedang (Konseptual)</option>
                                            <option value="HARD">Sulit / HOTS</option>
                                        </select>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleInputSubmit}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition"
                                >
                                    Proses & Baca Materi
                                </button>
                            </div>
                        ) : (
                            <div className="animate-fade-in-up">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6">
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><BookOpen size={20}/> Materi Belajar</h3>
                                        <button onClick={onResetMaterial} className="text-sm text-rose-500 hover:underline">Ganti Materi</button>
                                    </div>
                                    {/* PDF PREVIEW IF AVAILABLE */}
                                    {generalInput?.type === 'pdf' && generalInput.content && (
                                        <div className="mb-6">
                                            <embed 
                                                src={`data:application/pdf;base64,${generalInput.content}`} 
                                                className="w-full h-[500px] rounded-xl border border-slate-200 dark:border-slate-700" 
                                                type="application/pdf" 
                                            />
                                        </div>
                                    )}
                                    <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 leading-relaxed max-h-[400px] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <SimpleMarkdown text={generalInput?.extractedText || generalInput?.content || ''} />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Sudah selesai membaca? Pilih Metode Belajar:</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {GENERAL_METHODS.map(m => {
                                            const iconMap: Record<string, any> = { Brain, Repeat, MessageCircle, Share2, Search, GraduationCap, BookOpen, PenTool };
                                            const Icon = iconMap[m.icon] || Brain;
                                            return (
                                                <button 
                                                    key={m.id} 
                                                    onClick={() => onStartGeneralSession(m.id)}
                                                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition text-left flex flex-col h-full"
                                                >
                                                    <div className="mb-3 text-indigo-600 dark:text-indigo-400"><Icon size={24}/></div>
                                                    <h4 className="font-bold text-sm mb-1 text-slate-900 dark:text-white">{m.name}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{m.desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {category === 'UTBK' && (
                    <>
                        <button onClick={() => onStartSession(StudyMode.SIMULATION)} className="w-full bg-slate-900 dark:bg-indigo-900 text-white p-6 rounded-2xl mb-8 flex justify-between items-center group shadow-lg shadow-indigo-200 dark:shadow-none">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2"><Clock size={24} className="text-rose-400"/> Simulasi UTBK SNBT Full</h3>
                                <p className="text-slate-400 text-sm mt-1">155 Soal. Durasi 195 Menit. Format Resmi 2025.</p>
                            </div>
                            <ChevronRight className="group-hover:translate-x-2 transition-transform"/>
                        </button>
                        {renderSubtests(UTBK_SUBTESTS)}
                    </>
                )}
                
                {['TPA', 'PSIKOTEST'].includes(category) && (
                    <>
                         <button onClick={() => onStartSession(StudyMode.SIMULATION)} className="w-full bg-slate-900 dark:bg-indigo-900 text-white p-6 rounded-2xl mb-8 flex justify-between items-center group">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2"><Brain size={24} className="text-indigo-400"/> Simulasi {category} Full</h3>
                                <p className="text-slate-400 text-sm mt-1">{category === 'TPA' ? '65 Soal (TPA & TBI). Durasi 60-100 Menit.' : 'Simulasi Lengkap dengan Timer'}</p>
                            </div>
                            <ChevronRight className="group-hover:translate-x-2 transition-transform"/>
                        </button>
                        {renderSubtests(category === 'TPA' ? TPA_SUBTESTS : PSIKOTEST_SUBTESTS)}
                    </>
                )}
                
                {category === 'INTERVIEW' && renderSubtests(INTERVIEW_TOPICS)}

                {category === 'SKD' && (
                     !skdStream ? (
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <button onClick={() => onSkdStreamSelect('KEDINASAN')} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition text-center group">
                                <Landmark size={48} className="mx-auto mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition"/>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sekolah Kedinasan</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">STAN, STIS, IPDN, dll</p>
                            </button>
                            <button onClick={() => onSkdStreamSelect('CPNS')} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition text-center group">
                                <Building2 size={48} className="mx-auto mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition"/>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">CPNS Umum</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Kementerian & Lembaga</p>
                            </button>
                        </div>
                     ) : (
                         <>
                            <div className="flex items-center gap-2 mb-4 text-sm text-slate-600 dark:text-slate-300"><button onClick={() => onSkdStreamSelect(null as any)} className="underline">Ubah Jalur</button> <ChevronRight size={14}/> <b>{skdStream}</b></div>
                            <button onClick={() => onStartSession(StudyMode.SIMULATION)} className="w-full bg-slate-900 dark:bg-indigo-900 text-white p-6 rounded-2xl mb-8 flex justify-between items-center shadow-lg shadow-indigo-200 dark:shadow-none">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2"><Clock size={24} className="text-rose-400"/> Simulasi SKD CAT (110 Soal)</h3>
                                    <p className="text-slate-400 text-sm mt-1">TWK, TIU, TKP. Durasi 100 Menit. Scoring Resmi.</p>
                                </div>
                                <ChevronRight className="group-hover:translate-x-2 transition-transform"/>
                            </button>
                            {renderSubtests(SKD_SUBTESTS)}
                         </>
                     )
                )}

                {category !== 'GENERAL' && category !== 'INTERVIEW' && category !== 'SKRIPSI' && (
                    <div className="mt-8 animate-fade-in-up delay-100">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Mode Belajar Lainnya</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button onClick={() => onStartSession(StudyMode.DRILL)} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:shadow-md transition text-left">
                                <Zap className="text-amber-500 mb-2"/>
                                <div className="font-bold text-sm text-slate-800 dark:text-white">Learn & Drill</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Materi + 1 Soal</div>
                            </button>
                            <button onClick={() => onStartSession(StudyMode.ACTIVE_RECALL)} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:shadow-md transition text-left">
                                <Brain className="text-emerald-500 mb-2"/>
                                <div className="font-bold text-sm text-slate-800 dark:text-white">Active Recall</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Isian Singkat</div>
                            </button>
                            {weakTopicsCount > 0 && (
                                <button onClick={() => onStartSession(StudyMode.WEAKNESS)} className="p-4 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-xl hover:border-rose-500 hover:shadow-md transition text-left">
                                    <Target className="text-rose-500 mb-2"/>
                                    <div className="font-bold text-sm text-slate-800 dark:text-white">Weakness Attack</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{weakTopicsCount} Topik Lemah</div>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'LOGIN' | 'HOME' | 'DASHBOARD' | 'SESSION' | 'RESULTS' | 'HISTORY' | 'REVIEW' | 'COLORBLIND'>('LOGIN');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  
  // Data State
  const [generalInput, setGeneralInput] = useState<GeneralMaterialInput | null>(null);
  const [isReadingMaterial, setIsReadingMaterial] = useState(false); 

  const [selectedSubtest, setSelectedSubtest] = useState<string>('');
  const [sessionMode, setSessionMode] = useState<StudyMode | null>(null);
  const [skdStream, setSkdStream] = useState<SkdStreamType | null>(null);
  const [weakTopics, setWeakTopics] = useState<Set<string>>(new Set());
  
  // General Mode State
  const [generalMethod, setGeneralMethod] = useState<GeneralStudyMethod | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [mindMapData, setMindMapData] = useState<MindMapNode | null>(null);

  // Skripsi State
  const [skripsiFeature, setSkripsiFeature] = useState<SkripsiFeature | null>(null);
  const [skripsiResult, setSkripsiResult] = useState<string>('');
  
  // Session Content
  const [questions, setQuestions] = useState<Question[]>([]);
  const [drillContent, setDrillContent] = useState<DrillMaterial | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  
  // User & History State
  const [username, setUsername] = useState<string>('');
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);
  const [reviewItem, setReviewItem] = useState<TestHistoryItem | null>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
      const savedUser = localStorage.getItem('fajmuls_username');
      if (savedUser) {
          handleLogin(savedUser);
      } else {
          setCurrentView('LOGIN');
      }

      // Check system preference for dark mode
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setIsDarkMode(true);
      }
  }, []);

  // Apply Dark Mode Class
  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [isDarkMode]);

  const handleLogin = async (name: string) => {
      const sanitized = name.trim();
      if (!sanitized) return;

      setUsername(sanitized);
      localStorage.setItem('fajmuls_username', sanitized);
      setCurrentView('HOME');

      const localSaved = localStorage.getItem(`fajmuls_history_${sanitized}`);
      let localHistory: TestHistoryItem[] = [];
      if (localSaved) {
          try { localHistory = JSON.parse(localSaved); } catch (e) { console.error("History parse fail"); }
      }
      setTestHistory(localHistory);
  };

  const handleLogout = () => {
      localStorage.removeItem('fajmuls_username');
      setUsername('');
      setTestHistory([]);
      setCurrentView('LOGIN');
  };

  const saveToHistory = async (item: TestHistoryItem) => {
      const updated = [item, ...testHistory];
      setTestHistory(updated);
      localStorage.setItem(`fajmuls_history_${username}`, JSON.stringify(updated));
  };

  // --- MANUAL EXPORT / IMPORT LOGIC ---

  const exportHistory = () => {
      if (testHistory.length === 0) {
          alert("Belum ada riwayat untuk disimpan.");
          return;
      }
      const dataStr = JSON.stringify(testHistory, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Fajmuls_History_${username}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const importHistory = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const importedData = JSON.parse(content) as TestHistoryItem[];
              
              if (!Array.isArray(importedData)) throw new Error("Format salah");

              const currentIds = new Set(testHistory.map(h => h.id));
              const newItems = importedData.filter(h => !currentIds.has(h.id));
              
              const merged = [...testHistory, ...newItems].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
              setTestHistory(merged);
              localStorage.setItem(`fajmuls_history_${username}`, JSON.stringify(merged));
              alert(`Berhasil memuat ${newItems.length} riwayat baru dari file.`);
          } catch (err) {
              alert("Gagal membaca file. Pastikan file JSON valid hasil export aplikasi ini.");
          }
      };
      reader.readAsText(file);
  };

  // --- HANDLERS ---

  const handleCategorySelect = (cat: CategoryType) => {
    setSelectedCategory(cat);
    if (cat === 'BUTAWRNA') {
        setCurrentView('COLORBLIND');
    } else {
        setCurrentView('DASHBOARD');
        setGeneralInput(null);
        setIsReadingMaterial(false);
        setSelectedSubtest('');
        setSkdStream(null);
        setGeneralMethod(null);
        setSkripsiFeature(null);
        setSkripsiResult('');
    }
  };

  const handleGeneralInputSubmit = async (input: GeneralMaterialInput) => {
      setLoading(true);
      try {
          // Extract text for reading
          const extractedText = await Gemini.extractTextFromMaterial(input);
          setGeneralInput({ ...input, extractedText });
          setIsReadingMaterial(true); 
      } catch (e) {
          alert("Gagal memproses materi. Coba lagi.");
      } finally {
          setLoading(false);
      }
  };

  const startSkripsiSession = async (feature: SkripsiFeature, input: string) => {
      if (!input.trim()) { alert("Mohon isi judul atau topik."); return; }
      setLoading(true);
      setSkripsiFeature(feature);
      try {
          const res = await Gemini.generateSkripsiContent(input, feature);
          setSkripsiResult(res);
          setCurrentView('SESSION');
      } catch (e) {
          alert("Gagal generate konten skripsi.");
      } finally {
          setLoading(false);
      }
  }

  const startGeneralSession = async (method: GeneralStudyMethod) => {
      if (!generalInput) { alert("Materi hilang. Silakan input ulang."); return; }
      setLoading(true);
      setGeneralMethod(method);
      setSessionMode(StudyMode.DRILL); 

      try {
        if (method === 'ACTIVE_RECALL' || method === 'PBL' || method === 'PRACTICE' || method === 'TEACHING') {
             const qs = await Gemini.generateQuestions(StudyMode.DRILL, 'GENERAL', generalInput, 5, [], undefined, method);
             setQuestions(qs);
        } else if (method === 'SPACED_REPETITION') {
             const fcs = await Gemini.generateFlashcards(generalInput);
             setFlashcards(fcs);
        } else if (method === 'MIND_MAP') {
             const mm = await Gemini.generateMindMap(generalInput);
             setMindMapData(mm);
        }
        // SQ3R logic handled in component
        setCurrentView('SESSION');
      } catch (e) {
          alert("Gagal memuat materi AI.");
      } finally {
          setLoading(false);
      }
  };

  const startSession = async (mode: StudyMode, difficultyOverride?: string, countOverride?: number) => {
    if (!selectedCategory) return;
    
    // Subtest Checks for Exam Categories
    if (['UTBK', 'SKD', 'TPA', 'PSIKOTEST', 'INTERVIEW'].includes(selectedCategory) && !selectedSubtest && mode !== StudyMode.SIMULATION && mode !== StudyMode.WEAKNESS) {
        alert(`Harap pilih topik/subtes untuk ${selectedCategory}.`);
        return;
    }

    if (selectedCategory === 'SKD' && !skdStream) {
        alert("Harap pilih jalur (CPNS / Kedinasan).");
        return;
    }

    setLoading(true);
    setSessionMode(mode);
    setUserAnswers([]);
    setQuestions([]);
    setDrillContent(null);

    try {
      const context = selectedSubtest;

      if (mode === StudyMode.DRILL) {
        const data = await Gemini.generateDrillContent(selectedCategory, context, skdStream || undefined);
        setDrillContent(data);
        if (data && data.question) {
            setQuestions([data.question]);
        }
      } else if (mode === StudyMode.SIMULATION && selectedCategory === 'SKD' && skdStream) {
        const qs = await Gemini.generateSkdSimulation(skdStream);
        setQuestions(qs || []);
      } else if (mode === StudyMode.SIMULATION && selectedCategory === 'UTBK') {
        const qs = await Gemini.generateUtbkSimulation();
        setQuestions(qs || []);
      } else if (mode === StudyMode.SIMULATION && selectedCategory === 'TPA') {
        const qs = await Gemini.generateTpaTbiSimulation();
        setQuestions(qs || []);
      } else if (mode === StudyMode.SIMULATION && selectedCategory === 'PSIKOTEST') {
        const qs = await Gemini.generatePsikotestSimulation();
        setQuestions(qs || []);
      } else {
        let count = countOverride || 5;
        if (selectedCategory === 'PSIKOTEST' && mode === StudyMode.SIMULATION) count = 40; 
        if (selectedCategory === 'INTERVIEW') count = 3; 

        const qs = await Gemini.generateQuestions(
          mode, 
          selectedCategory, 
          context, 
          count,
          Array.from(weakTopics),
          skdStream || undefined,
          undefined, // General method
          difficultyOverride // Difficulty Override
        );
        setQuestions(qs || []);
      }
      setCurrentView('SESSION');
    } catch (e) {
      console.error(e);
      alert("Gagal memuat soal. Kemungkinan traffic AI sedang tinggi. Coba lagi beberapa saat.");
    } finally {
      setLoading(false);
    }
  };

  const handleSessionComplete = (answers: UserAnswer[], historyItemOverride?: TestHistoryItem) => {
    if (historyItemOverride) {
        // For ColorBlind or other custom tests
        saveToHistory(historyItemOverride);
        // FIX: Explicitly navigate back to HOME to avoid getting stuck
        setCurrentView('HOME');
        return;
    }

    setUserAnswers(answers);
    
    let finalScore = 0;
    let maxScore = 0;
    let details: any = undefined;

    // SCORING LOGIC
    if (selectedCategory === 'SKD' && sessionMode === StudyMode.SIMULATION) {
        let twk = 0, tiu = 0, tkp = 0;
        answers.forEach(a => {
            const q = questions.find(q => q.id === a.questionId);
            if (q) {
                if (q.metadata?.subtest?.includes('TWK')) twk += a.scoreEarned;
                if (q.metadata?.subtest?.includes('TIU')) tiu += a.scoreEarned;
                if (q.metadata?.subtest?.includes('TKP')) tkp += a.scoreEarned;
            }
        });
        finalScore = twk + tiu + tkp;
        maxScore = 550; 
        details = { twk, tiu, tkp, total: finalScore, passed: twk >= 65 && tiu >= 80 && tkp >= 166 };
    } else if (selectedCategory === 'UTBK' && sessionMode === StudyMode.SIMULATION) {
        const calculateIrt = (sub: string) => {
             const subQs = questions.filter(q => q.metadata?.subtest?.includes(sub));
             if (!subQs.length) return 0;
             const correct = answers.filter(a => a.isCorrect && questions.find(q => q.id === a.questionId)?.metadata?.subtest?.includes(sub)).length;
             return Math.round(200 + ((correct/subQs.length) * 600));
        };
        const pu=calculateIrt('Penalaran Umum'), ppu=calculateIrt('PPU'), pbm=calculateIrt('PBM'), pk=calculateIrt('Kuantitatif'), lbi=calculateIrt('Literasi B.Indo'), lbe=calculateIrt('Literasi B.Inggris'), pm=calculateIrt('Penalaran Matematika');
        const avg = Math.round((pu+ppu+pbm+pk+lbi+lbe+pm)/7);
        finalScore = avg; maxScore = 1000; details = { pu, ppu, pbm, pk, lbi, lbe, pm, average: avg };
    } else if (selectedCategory === 'TPA' && sessionMode === StudyMode.SIMULATION) {
        let tpaCorrect = 0, tbiCorrect = 0;
        let tpaTotal = 0, tbiTotal = 0;
        answers.forEach(a => {
            const q = questions.find(q => q.id === a.questionId);
            if(q) {
                if(q.metadata?.subtest?.includes('TBI') || q.metadata?.subtest?.includes('Inggris')) {
                    tbiTotal++;
                    if(a.isCorrect) tbiCorrect++;
                } else {
                    tpaTotal++;
                    if(a.isCorrect) tpaCorrect++;
                }
            }
        });
        const tpaScore = Math.round(200 + ((tpaCorrect / (tpaTotal || 1)) * 600));
        const tbiScore = Math.round((tbiCorrect / (tbiTotal || 1)) * 100);
        finalScore = tpaScore + tbiScore; // Just a composite for display
        maxScore = 900;
        details = { tpaScore, tbiScore, tpaCorrect, tbiCorrect };
    } else if (selectedCategory === 'INTERVIEW') {
        const validScores = answers.map(a => a.interviewFeedback?.score || 0);
        finalScore = Math.round(validScores.reduce((a,b) => a+b, 0) / (validScores.length || 1));
        maxScore = 100;
    } else if (selectedCategory === 'PSIKOTEST' && sessionMode === StudyMode.SIMULATION) {
        const correctCount = answers.filter(a => a.isCorrect).length;
        const totalQs = questions.length;
        const percentage = correctCount / totalQs;
        const iqEstimate = Math.round(70 + (percentage * 75)); 
        let classification = iqEstimate >= 130 ? 'Very Superior' : iqEstimate >= 120 ? 'Superior' : iqEstimate >= 110 ? 'High Average' : iqEstimate >= 90 ? 'Average' : 'Low Average';
        finalScore = iqEstimate;
        maxScore = 160; 
        details = { iqScore: iqEstimate, classification };
    } else if (selectedCategory === 'GENERAL') {
        // Average score from Flexible Grading (0-100 per question)
        const totalPoints = answers.reduce((acc, curr) => acc + (curr.scoreEarned || 0), 0);
        finalScore = Math.round(totalPoints / (answers.length || 1));
        maxScore = 100;
    } else {
        const correctCount = answers.filter(a => a.isCorrect).length;
        finalScore = Math.round((correctCount / questions.length) * 100);
        maxScore = 100;
    }

    saveToHistory({
        id: `h-${Date.now()}`,
        date: new Date().toISOString(),
        category: selectedCategory!,
        skdStream: skdStream || undefined,
        score: finalScore,
        maxScore,
        details: details,
        questions: questions,
        answers: answers
    });
    
    setCurrentView('RESULTS');
  };

  const openHistory = () => { setCurrentView('HISTORY'); }
  const openReview = (item: TestHistoryItem) => { setReviewItem(item); setCurrentView('REVIEW'); }

  // --- RENDERERS ---

  if (currentView === 'LOGIN') return <LoginScreen onLogin={handleLogin} />;
  
  if (currentView === 'HOME') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center relative transition-colors duration-300">
        {/* Auth (Left) */}
        <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg border-2 border-white dark:border-slate-700 shadow-sm">
                {username[0]?.toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{username}</div>
                <button onClick={handleLogout} className="text-xs text-rose-500 hover:underline flex items-center gap-1">
                    <LogOut size={10}/> Keluar
                </button>
            </div>
        </div>

        {/* Top Right Actions */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition">
                {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button onClick={openHistory} className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg transition shadow-sm border border-indigo-100 dark:border-indigo-800">
                <History size={18} className="mr-2" /> Riwayat
            </button>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Fajmuls Learning</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-center max-w-md">Sistem belajar cerdas berbasis data. Pilih jalur belajarmu.</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all group text-left flex flex-col items-start"
            >
              <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                {cat.id === 'GENERAL' ? <FileText className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" /> : 
                 cat.id === 'SKD' ? <Briefcase className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" /> :
                 cat.id === 'INTERVIEW' ? <MessageSquare className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" /> :
                 cat.id === 'BUTAWRNA' ? <Palette className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" /> :
                 cat.id === 'PSIKOTEST' ? <Brain className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" /> :
                 cat.id === 'SKRIPSI' ? <Book className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" /> :
                 <GraduationCap className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{cat.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{cat.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (currentView === 'COLORBLIND') return <ColorBlindTest onBack={() => setCurrentView('HOME')} onComplete={(item) => handleSessionComplete([], item)} />;

  if (currentView === 'DASHBOARD') {
    return (
      <Dashboard 
        category={selectedCategory!}
        onBack={() => setCurrentView('HOME')}
        onStartSession={startSession}
        onGeneralInputSubmit={handleGeneralInputSubmit}
        generalInput={generalInput}
        setGeneralInput={setGeneralInput} 
        isReadingMaterial={isReadingMaterial}
        onResetMaterial={() => { setIsReadingMaterial(false); setGeneralInput(null); }}
        onSubtestSelect={setSelectedSubtest}
        selectedSubtest={selectedSubtest}
        weakTopicsCount={weakTopics.size}
        loading={loading}
        skdStream={skdStream}
        onSkdStreamSelect={setSkdStream}
        onHistory={openHistory}
        onStartGeneralSession={startGeneralSession}
        onStartSkripsiSession={startSkripsiSession}
        username={username}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  if (currentView === 'SESSION') {
      if (selectedCategory === 'SKRIPSI') {
          return <SkripsiSession result={skripsiResult} feature={skripsiFeature!} onBack={() => setCurrentView('DASHBOARD')}/>;
      }
      if (selectedCategory === 'INTERVIEW') {
          return <InterviewSession questions={questions} onComplete={handleSessionComplete} />;
      }
      
      if (selectedCategory === 'GENERAL') {
          if (generalMethod === 'SPACED_REPETITION') {
              return <FlashcardSession flashcards={flashcards} onFinish={() => setCurrentView('DASHBOARD')} />;
          }
          if (generalMethod === 'MIND_MAP') {
              return (
                  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col transition-colors duration-300">
                      <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setCurrentView('DASHBOARD')} className="flex items-center text-slate-500 dark:text-slate-400"><ArrowLeft size={18}/> Kembali</button>
                        <h2 className="font-bold text-slate-800 dark:text-white">Mind Mapping</h2>
                      </div>
                      <MindMapViewer data={mindMapData} />
                  </div>
              );
          }
          if (generalMethod === 'FEYNMAN') {
              return <FeynmanSession topic={generalInput?.content || ''} onFinish={() => setCurrentView('DASHBOARD')} />;
          }
          if (generalMethod === 'SQ3R') {
              return <SQ3RSession topic={generalInput?.content || ''} onFinish={() => setCurrentView('DASHBOARD')} />;
          }
      }

    return (
      <SessionEngine
        mode={sessionMode!}
        questions={questions}
        drillContent={drillContent}
        onComplete={handleSessionComplete}
        isSkdSimulation={sessionMode === StudyMode.SIMULATION && selectedCategory === 'SKD'}
        isUtbkSimulation={sessionMode === StudyMode.SIMULATION && selectedCategory === 'UTBK'}
        category={selectedCategory!}
      />
    );
  }

  if (currentView === 'RESULTS') return <ResultsAnalysis answers={userAnswers} questions={questions} onHome={() => setCurrentView('HOME')} onRetry={() => startSession(sessionMode!)} category={selectedCategory!} />;
  if (currentView === 'HISTORY') return (
    <HistoryView 
        history={testHistory} 
        onBack={() => setCurrentView('HOME')} 
        onReview={openReview} 
        username={username}
        onExport={exportHistory}
        onImport={importHistory}
        isDarkMode={isDarkMode}
    />
  );
  if (currentView === 'REVIEW') return <ReviewView item={reviewItem!} onBack={() => setCurrentView('HISTORY')} />;

  return null;
};

export default App;