import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Timer } from 'lucide-react';

export const PomodoroTimer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  // Request Notification Permission on Mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      triggerNotification();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const triggerNotification = () => {
    // Audio Alert
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play().catch(e => console.log("Audio play failed", e));

    // Browser Notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(mode === 'focus' ? "Fokus Selesai!" : "Istirahat Selesai!", {
        body: mode === 'focus' ? "Waktunya istirahat sejenak." : "Kembali fokus belajar!",
        icon: '/favicon.ico'
      });
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = () => {
    const newMode = mode === 'focus' ? 'break' : 'focus';
    setMode(newMode);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-xl z-50 flex items-center gap-2 transition-all"
      >
        <Timer size={24} />
        <span className="font-semibold hidden sm:inline">Pomodoro</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-fade-in-up">
      <div className={`p-4 ${mode === 'focus' ? 'bg-indigo-600' : 'bg-emerald-500'} text-white flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <Timer size={20} />
          <span className="font-bold">{mode === 'focus' ? 'Fokus' : 'Istirahat'}</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
          <X size={18} />
        </button>
      </div>
      
      <div className="p-6 flex flex-col items-center">
        <div className="text-5xl font-mono font-bold text-slate-800 dark:text-slate-100 mb-6 tracking-wider">
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex gap-4 mb-6">
          <button 
            onClick={toggleTimer}
            className="p-3 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
          >
            {isActive ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button 
            onClick={resetTimer}
            className="p-3 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        <button 
          onClick={switchMode}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline"
        >
          Ganti ke Mode {mode === 'focus' ? 'Istirahat' : 'Fokus'}
        </button>
      </div>
    </div>
  );
};
