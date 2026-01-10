
export type CategoryType = 'UTBK' | 'SKD' | 'GENERAL' | 'TPA' | 'PSIKOTEST' | 'INTERVIEW' | 'BUTAWRNA' | 'SKRIPSI';
export type SkdStreamType = 'CPNS' | 'KEDINASAN';
export type SkripsiFeature = 'OUTLINE' | 'TITLE_IDEAS' | 'METHODOLOGY' | 'PARAPHRASE' | 'CORRECT_GRAMMAR';

export enum StudyMode {
  DRILL = 'Learn & Drill',
  ACTIVE_RECALL = 'Active Recall',
  SIMULATION = 'Test Simulation',
  WEAKNESS = 'Weakness Attack',
  EXAMPLE = 'Contoh Soal',
  PRACTICE = 'Latihan Kustom'
}

export type GeneralStudyMethod = 
  | 'ACTIVE_RECALL' 
  | 'SPACED_REPETITION' 
  | 'FEYNMAN' 
  | 'INTERLEAVING' 
  | 'DELIBERATE' 
  | 'SQ3R' 
  | 'POMODORO' 
  | 'MIND_MAP' 
  | 'PBL' 
  | 'TEACHING'
  | 'PRACTICE';

export type MaterialLength = 'SHORT' | 'MEDIUM' | 'LONG';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionMetadata {
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'HOTS';
  idealTimeSeconds: number;
  topic: string;
  subtest: string;
  trapPattern?: string;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'long_text';
  content: string;
  options?: string[];
  correctAnswer: string; 
  tkpPoints?: { option: string; points: number }[]; 
  explanation: string;
  shortcut?: string;
  metadata: QuestionMetadata;
}

export interface DrillMaterial {
  topic: string;
  summary: string;
  keyPoints: string[];
  question: Question;
}

export interface InterviewFeedback {
  score: number;
  feedback: string;
  improvedAnswer: string;
  keyPointsCovered: string[];
  toneAnalysis: string;
}

export interface FeynmanFeedback {
  understandingScore: number;
  simplificationQuality: string;
  missingConcepts: string[];
  correction: string;
}

export interface UserAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean; 
  scoreEarned: number; 
  timeTakenSeconds: number;
  isOverthinking: boolean;
  isGuessing: boolean;
  isDoubtful?: boolean; // Added for "Ragu-ragu" UI
  interviewFeedback?: InterviewFeedback;
  aiEvaluation?: string; // For general flexible grading
}

export interface SkdResultDetails {
  twk: number;
  tiu: number;
  tkp: number;
  total: number;
  passed: boolean;
}

export interface UtbkResultDetails {
  pu: number; 
  ppu: number; 
  pbm: number; 
  pk: number; 
  lbi: number; 
  lbe: number; 
  pm: number; 
  average: number; 
}

export interface TpaResultDetails {
  tpaScore: number;
  tbiScore: number;
  tpaCorrect: number;
  tbiCorrect: number;
}

export interface TestHistoryItem {
  id: string;
  date: string;
  category: CategoryType;
  skdStream?: SkdStreamType;
  score: number; 
  maxScore: number;
  details?: SkdResultDetails | UtbkResultDetails | TpaResultDetails | { iqScore: number, classification: string } | { type: string, passed: boolean }; 
  questions: Question[]; 
  answers: UserAnswer[]; 
  improvementAdvice?: string; // AI generated advice
}

export interface SessionAnalytics {
  totalQuestions: number;
  accuracy: number;
  averageTime: number;
  weakTopics: string[];
  overthinkingCount: number;
  guessingCount: number;
}

export interface GeneralMaterialInput {
  type: 'pdf' | 'text' | 'topic';
  content: string;
  title: string;
  extractedText?: string; 
  lengthPreference?: MaterialLength;
  difficultyPreference?: QuestionDifficulty;
}

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
}

export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

export interface IshiharaPlate {
    id: number;
    image: string;
    correctAnswer: string;
    type: 'Normal' | 'Red-Green' | 'Total';
    description: string;
}
