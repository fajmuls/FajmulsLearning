
import { GoogleGenAI, Type } from "@google/genai";
import { Question, DrillMaterial, GeneralMaterialInput, CategoryType, StudyMode, SkdStreamType, InterviewFeedback, GeneralStudyMethod, FlashcardData, MindMapNode, FeynmanFeedback, SkripsiFeature } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-3-flash-preview"; 

// --- CACHING MECHANISM ---
const requestCache = new Map<string, any>();

// --- Schemas ---

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    type: { type: Type.STRING, enum: ["multiple_choice", "short_answer", "long_text"] },
    content: { type: Type.STRING },
    options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        nullable: true 
    },
    correctAnswer: { type: Type.STRING, nullable: true },
    tkpPoints: { 
        type: Type.ARRAY, 
        description: "List of scores (1-5) for each option. Only for TKP.",
        nullable: true,
        items: {
            type: Type.OBJECT,
            properties: {
                option: { type: Type.STRING },
                points: { type: Type.INTEGER }
            },
            required: ["option", "points"]
        }
    },
    explanation: { type: Type.STRING },
    shortcut: { type: Type.STRING, nullable: true },
    metadata: {
      type: Type.OBJECT,
      properties: {
        difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard", "HOTS"] },
        idealTimeSeconds: { type: Type.INTEGER },
        topic: { type: Type.STRING },
        subtest: { type: Type.STRING },
        trapPattern: { type: Type.STRING, nullable: true }
      }
    }
  }
};

const drillSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    summary: { type: Type.STRING },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    question: questionSchema
  }
};

const interviewFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.INTEGER, description: "Score 0-100" },
        feedback: { type: Type.STRING, description: "Detailed feedback on the answer" },
        improvedAnswer: { type: Type.STRING, description: "A better version of the answer" },
        keyPointsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
        toneAnalysis: { type: Type.STRING, description: "e.g. Confident, Too Passive, Arrogant" }
    }
};

const flashcardListSchema = {
    type: Type.OBJECT,
    properties: {
        flashcards: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING }
                }
            }
        }
    }
};

const mindMapSchema = {
    type: Type.OBJECT,
    properties: {
        root: {
            type: Type.OBJECT,
            properties: {
                label: { type: Type.STRING },
                children: { 
                    type: Type.ARRAY,
                    items: {
                         type: Type.OBJECT,
                         description: "Recursive children nodes with label and children",
                         properties: {
                             label: { type: Type.STRING },
                             children: {
                                 type: Type.ARRAY,
                                 items: { type: Type.OBJECT, properties: { label: { type: Type.STRING } } }
                             }
                         }
                    } 
                }
            }
        }
    }
};

const feynmanFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        understandingScore: { type: Type.INTEGER },
        simplificationQuality: { type: Type.STRING, description: "Did they use simple language?" },
        missingConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
        correction: { type: Type.STRING }
    }
};

const flexibleEvaluationSchema = {
    type: Type.OBJECT,
    properties: {
        isCorrect: { type: Type.BOOLEAN },
        score: { type: Type.INTEGER, description: "0-100 representation of closeness" },
        feedback: { type: Type.STRING, description: "Why it is correct or incorrect" }
    }
};

// --- Helper Sanitizer ---
const sanitizeQuestion = (q: any, defaultSubtest: string = 'General'): Question => {
    return {
        id: q.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: q.type || 'multiple_choice',
        content: q.content || 'Question content missing',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        tkpPoints: q.tkpPoints || [],
        explanation: q.explanation || 'Tidak ada pembahasan detail.',
        shortcut: q.shortcut || '',
        metadata: {
            difficulty: q.metadata?.difficulty || 'Medium',
            idealTimeSeconds: q.metadata?.idealTimeSeconds || 60,
            topic: q.metadata?.topic || 'General',
            subtest: q.metadata?.subtest || defaultSubtest,
            trapPattern: q.metadata?.trapPattern || ''
        }
    };
};


// --- Generators ---

export const extractTextFromMaterial = async (input: GeneralMaterialInput): Promise<string> => {
    let lengthPrompt = " Summarize fairly concisely.";
    if (input.lengthPreference === 'LONG') lengthPrompt = " Provide a very DETAILED, comprehensive explanation covering all aspects.";
    if (input.lengthPreference === 'SHORT') lengthPrompt = " Provide a brief, high-level summary (bullet points).";

    let prompt = `Extract/Generate text content from the provided material.${lengthPrompt} 
    CRITICAL: The output MUST BE in the SAME LANGUAGE as the original material/topic. Do not translate unless the user explicitly asked to translate in the topic title.
    Return it in a readable format (Markdown) so the user can study it.`;
    
    let base64Pdf = null;
    
    if (input.type === 'pdf') {
        base64Pdf = input.content;
    } else if (input.type === 'text') {
        prompt += `\n\nTEXT CONTENT: ${input.content}`;
    } else {
        prompt += `\n\nTOPIC: ${input.content}`;
        prompt = `Write a comprehensive study guide about the topic: "${input.content}".${lengthPrompt} 
        CRITICAL: Write in the SAME LANGUAGE as the topic title provided. If the topic is "Sejarah Indonesia", write in Indonesian. If "Photosynthesis", write in English.`;
    }

    const res = await callGemini<any>(prompt, null, base64Pdf, false); // No schema for text
    
    return res.text || "Gagal mengekstrak teks.";
};

export const getImprovementAdvice = async (weakTopics: string[]): Promise<string> => {
    if (!weakTopics.length) return "Tidak ada topik lemah yang terdeteksi. Kerja bagus!";
    
    const prompt = `
    The user struggled with these topics in a recent test: ${weakTopics.join(', ')}.
    Provide specific, actionable advice on how to improve in these areas.
    Suggest study techniques, mental models, or what to focus on.
    Keep it encouraging but practical.
    Language: Indonesian.
    Format: Markdown.
    `;

    const res = await callGemini<any>(prompt, null, null, false);
    return res.text || "Gagal memuat saran.";
};

export const evaluateFlexibleAnswer = async (question: string, correctAnswer: string, userAnswer: string): Promise<{isCorrect: boolean, score: number, feedback: string}> => {
    const prompt = `
    Task: Evaluate the user's answer for a study session.
    Question: "${question}"
    Real Answer/Key: "${correctAnswer}"
    User Answer: "${userAnswer}"
    
    Instructions:
    1. Determine if the User Answer is semantically correct (meaning matches the Real Answer).
    2. Typos are okay.
    3. Different phrasing is okay if the core concept is correct.
    4. Provide a Score (0-100).
    5. Provide brief feedback in the SAME LANGUAGE as the Question.
    `;

    return await callGemini(prompt, flexibleEvaluationSchema);
};

export const generateDrillContent = async (
  category: CategoryType,
  context: string | GeneralMaterialInput,
  skdStream?: SkdStreamType
): Promise<DrillMaterial> => {
  let prompt = "";
  let base64Pdf = null;
  const langInstruction = "CRITICAL: DETECT the language of the input material/context. The output (summary, questions, answers) MUST BE in the SAME LANGUAGE as the input.";

  if (category === 'GENERAL') {
    const input = context as GeneralMaterialInput;
    if (input.type === 'topic') {
      prompt = `Create a "Learn & Drill" module for the topic: "${input.content}".
      ${langInstruction}
      1. Provide a concise summary.
      2. Provide 3 key takeaways.
      3. Create 1 conceptual question to test understanding immediately.`;
    } else {
      prompt = `Analyze the provided material. 
      ${langInstruction}
      1. Summarize the key concept.
      2. Extract 3 key points.
      3. Create 1 question based strictly on this material.`;
      if (input.type === 'pdf') base64Pdf = input.content;
      else prompt += `\n\nMATERIAL:\n${input.content}`;
    }
  } else {
    // UTBK / SKD / TPA / ETC
    let nuance = "";
    if (category === 'SKD' && skdStream) {
        if (skdStream === 'KEDINASAN') {
            nuance = "Focus on HIGH DIFFICULTY (HOTS) logic and complex math typical of STIS/STAN entrance exams.";
        } else {
            nuance = "Focus on standard CPNS difficulty, emphasizing passing grade thresholds and recent year trends.";
        }
    } else if (category === 'UTBK') {
        nuance = "Focus on UTBK SNBT 2025 standard. Use cognitive reasoning and literacy analysis.";
    } else if (category === 'TPA') {
        nuance = "Focus on TPA Bappenas/Kedinasan Lanjutan. Logic, Verbal, Numerical, and English (TBI).";
    }

    prompt = `Create a high-yield "Learn & Drill" module for ${category} specifically for the subtest/topic: "${context}".
    ${nuance}
    The summary must be strategic (formulas, shortcuts, core concepts).
    The question must include metadata (difficulty, ideal time, trap patterns).`;
  }

  const result = await callGemini<DrillMaterial>(prompt, drillSchema, base64Pdf);
  
  // Sanitize the single question
  if (result.question) {
      result.question = sanitizeQuestion(result.question);
  }
  return result;
};

// Orchestrator to split large requests into parallel chunks (Shared logic)
const fetchSubtestBatch = async (
    context: string, 
    subtest: string, 
    totalNeeded: number, 
    nuance: string,
    batchSize: number = 5
) => {
    // Helper to generate a small batch
    const genBatch = async (count: number) => {
        const prompt = `Generate ${count} ${subtest} questions for ${context}. 
        ${nuance}
        Metadata subtest MUST be "${subtest}".`;
        
        const tkpInstruction = subtest === 'TKP' ? 
            `CRITICAL for TKP: Provide 'tkpPoints' list mapping EACH option to a score 1-5. 
             The 'correctAnswer' field should be the 5-point answer.` : '';

        const fullPrompt = `${prompt} ${tkpInstruction}`;
        
        try {
            return await callGemini<{questions: Question[]}>(fullPrompt, { 
                type: Type.OBJECT, 
                properties: { questions: { type: Type.ARRAY, items: questionSchema } } 
            });
        } catch (e) {
            console.error(`Batch generation failed for ${subtest}`, e);
            return { questions: [] }; // Return empty to allow other batches to succeed
        }
    };

    const promises = [];
    let remaining = totalNeeded;
    
    // Limit parallelism slightly to avoid rate limits if user is on free tier
    const MAX_PARALLEL = 3; 
    
    while (remaining > 0) {
        const count = Math.min(remaining, batchSize);
        promises.push(genBatch(count));
        remaining -= count;
    }

    // Process in chunks if needed, but Promise.all is usually fine for < 10 requests
    const results = await Promise.all(promises);
    return results.flatMap(r => r.questions || []).filter(q => !!q); // Filter nulls
};

export const generateSkdSimulation = async (stream: SkdStreamType): Promise<Question[]> => {
    const context = stream === 'KEDINASAN' ? 'SEKOLAH KEDINASAN (STAN/STIS)' : 'CPNS';
    // Reduced count slightly for faster "Preview" experience, or keep full for simulation
    // 30 TWK, 35 TIU, 45 TKP = 110. 
    try {
        const [twkQs, tiuQs, tkpQs] = await Promise.all([
            fetchSubtestBatch(context, 'TWK', 30, "Focus: Nationalism, Integrity. Difficulty: HOTS Case Studies.", 10),
            fetchSubtestBatch(context, 'TIU', 35, "Focus: Verbal, Numerical, Figural. Difficulty: Hard.", 10),
            fetchSubtestBatch(context, 'TKP', 45, "Focus: Public Service, Professionalism. Difficulty: 1-5 scoring.", 10)
        ]);

        const allQuestions = [...twkQs, ...tiuQs, ...tkpQs];

        if (allQuestions.length === 0) throw new Error("Gagal membuat simulasi SKD. Silakan coba lagi.");
        
        return processSimulationQuestions(allQuestions, ['TWK', 'TIU', 'TKP'], [twkQs.length, tiuQs.length, tkpQs.length]);

    } catch (e) {
        console.error("Simulation gen failed", e);
        throw e;
    }
};

export const generateUtbkSimulation = async (): Promise<Question[]> => {
    const context = 'UTBK SNBT 2025';
    // TPS: PU(30), PPU(20), PBM(20), PK(20) = 90
    // Lit: LBI(30), LBE(20), PM(20) = 70
    // Total 160. Batch size 5 to be safe with large volume concurrency.
    
    try {
        const [pu, ppu, pbm, pk, lbi, lbe, pm] = await Promise.all([
            fetchSubtestBatch(context, 'Penalaran Umum', 30, "Inductive, Deductive, Quantitative reasoning.", 10),
            fetchSubtestBatch(context, 'PPU', 20, "General Knowledge & Understanding.", 10),
            fetchSubtestBatch(context, 'PBM', 20, "Reading Comprehension & Writing.", 10),
            fetchSubtestBatch(context, 'Pengetahuan Kuantitatif', 20, "Math foundation.", 10),
            fetchSubtestBatch(context, 'Literasi B.Indo', 30, "Text analysis, implicit meaning.", 10),
            fetchSubtestBatch(context, 'Literasi B.Inggris', 20, "English text analysis.", 10),
            fetchSubtestBatch(context, 'Penalaran Matematika', 20, "Math application in real life context.", 10)
        ]);

        const allQuestions = [...pu, ...ppu, ...pbm, ...pk, ...lbi, ...lbe, ...pm];
        
        if (allQuestions.length === 0) throw new Error("Gagal membuat simulasi UTBK.");

        return processSimulationQuestions(allQuestions, 
            ['Penalaran Umum', 'PPU', 'PBM', 'Pengetahuan Kuantitatif', 'Literasi B.Indo', 'Literasi B.Inggris', 'Penalaran Matematika'],
            [pu.length, ppu.length, pbm.length, pk.length, lbi.length, lbe.length, pm.length]
        );

    } catch (e) {
        console.error("UTBK Simulation gen failed", e);
        throw e;
    }
};

export const generateTpaTbiSimulation = async (): Promise<Question[]> => {
    const context = 'PKN STAN SELEKSI LANJUTAN (TPA & TBI)';
    // TPA: 45 Questions (15 Verbal, 15 Numeric, 15 Logic)
    // TBI: 20 Questions (Structure, Reading)
    try {
        const [verbal, num, logic, tbi] = await Promise.all([
            fetchSubtestBatch(context, 'TPA Verbal', 15, "Analogi, Silogisme, Antonim/Sinonim. Difficulty: Medium-Hard.", 15),
            fetchSubtestBatch(context, 'TPA Numerik', 15, "Deret Angka, Aritmatika, Perbandingan Kuantitatif. Speed based.", 15),
            fetchSubtestBatch(context, 'TPA Logika', 15, "Penalaran Analitis (posisi duduk), Penalaran Logis, Spasial (Kubus/Rotasi).", 15),
            fetchSubtestBatch(context, 'TBI (Bahasa Inggris)', 20, "Structure & Written Expression (Error Recognition), Reading Comprehension (Short texts). TOEFL Style.", 20)
        ]);

        const allQuestions = [...verbal, ...num, ...logic, ...tbi];
        
        if (allQuestions.length === 0) throw new Error("Gagal membuat simulasi TPA/TBI.");

        return processSimulationQuestions(allQuestions, 
            ['TPA Verbal', 'TPA Numerik', 'TPA Logika', 'TBI (Bahasa Inggris)'],
            [verbal.length, num.length, logic.length, tbi.length]
        );

    } catch (e) {
        console.error("TPA Simulation gen failed", e);
        throw e;
    }
};

export const generatePsikotestSimulation = async (): Promise<Question[]> => {
    const context = 'PSIKOTES KERJA / IQ TEST STANDARD';
    // 40 Questions total (10 Logika, 10 Verbal, 10 Numerik, 10 Spasial)
    try {
        const [logic, verbal, numeric, spatial] = await Promise.all([
            fetchSubtestBatch(context, 'Logika', 10, "Syllogism, Logical deduction, Abstract reasoning sequences.", 10),
            fetchSubtestBatch(context, 'Verbal', 10, "Analogies, Synonyms, Antonyms, Word classification.", 10),
            fetchSubtestBatch(context, 'Numerik', 10, "Number series, Arithmetic word problems, Mental math.", 10),
            fetchSubtestBatch(context, 'Spasial', 10, "Pattern matching, Figure rotation, Cube unfolding.", 10)
        ]);

        const allQuestions = [...logic, ...verbal, ...numeric, ...spatial];

        if (allQuestions.length === 0) throw new Error("Gagal membuat simulasi Psikotes.");

        return processSimulationQuestions(allQuestions,
            ['Logika', 'Verbal', 'Numerik', 'Spasial'],
            [logic.length, verbal.length, numeric.length, spatial.length]
        );
    } catch (e) {
        console.error("Psikotes Simulation gen failed", e);
        throw e;
    }
};

// Helper to assign IDs and fix metadata after batch generation
const processSimulationQuestions = (allQuestions: Question[], subtestNames: string[], counts: number[]) => {
    let currentIndex = 0;
    
    return allQuestions.map((q, i) => {
        // Safe check for Q
        if (!q) return sanitizeQuestion({}, 'Unknown');

        // Find which subtest chunk we are in
        let cumulative = 0;
        let subtest = subtestNames[subtestNames.length - 1]; // Default to last
        
        for (let j = 0; j < counts.length; j++) {
            cumulative += counts[j];
            if (i < cumulative) {
                subtest = subtestNames[j];
                break;
            }
        }

        // Fallback for TKP points if missing
        let finalTkpPoints = q.tkpPoints;
        if (subtest.includes('TKP') && (!finalTkpPoints || finalTkpPoints.length === 0) && q.options) {
            finalTkpPoints = [];
            const otherScores = [1, 2, 3, 4];
            q.options.forEach(opt => {
                let points = 1;
                if (opt === q.correctAnswer) points = 5;
                else {
                    points = otherScores.pop() || 1;
                }
                finalTkpPoints!.push({ option: opt, points });
            });
        }

        // Manually merge to ensure metadata exists even if q.metadata is undefined
        const sanitized = sanitizeQuestion(q, subtest);
        
        return {
            ...sanitized,
            id: `sim-${Date.now()}-${i}`,
            tkpPoints: finalTkpPoints,
            metadata: {
                ...sanitized.metadata,
                subtest: subtest // Enforce subtest
            }
        };
    });
};

export const generateQuestions = async (
  mode: StudyMode,
  category: CategoryType,
  context: string | GeneralMaterialInput,
  count: number = 5,
  weakTopics: string[] = [],
  skdStream?: SkdStreamType,
  generalMethod?: GeneralStudyMethod,
  difficultyOverride?: string // Added parameter
): Promise<Question[]> => {
  let prompt = "";
  let base64Pdf = null;
  const langInstruction = "CRITICAL: DETECT the language of the input material/context. The generated questions/answers MUST BE in the SAME LANGUAGE as the input.";

  // Base Schema
  let schema: any = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: questionSchema } } };

  // --- GENERAL METHOD HANDLING ---
  if (category === 'GENERAL' && generalMethod) {
      const input = context as GeneralMaterialInput;
      const contentStr = input.type === 'topic' ? `Topic: ${input.content}` : `Material Content`;
      if(input.type === 'pdf') base64Pdf = input.content;

      // Add difficulty context
      const diff = input.difficultyPreference || 'MEDIUM';
      const difficultyPrompt = `DIFFICULTY LEVEL: ${diff}. ${diff === 'HARD' ? 'Use complex analysis/HOTS.' : diff === 'EASY' ? 'Use straightforward recall.' : ''}`;

      if (generalMethod === 'ACTIVE_RECALL') {
          prompt = `Create ${count} Active Recall questions (Short Answer format) based on this: ${contentStr}. 
          ${langInstruction} ${difficultyPrompt}
          Questions must be specific and require recall of key facts/concepts.`;
      } else if (generalMethod === 'PBL') {
          prompt = `Create ${count} Problem-Based Learning scenarios (Case Study).
          ${langInstruction} ${difficultyPrompt}
          Format: 'long_text' or 'multiple_choice'.
          Based on: ${contentStr}. 
          Each question should be a realistic scenario requiring application of the concept.`;
      } else {
          // Default Practice
          prompt = `Create ${count} practice questions based on: ${contentStr}. ${langInstruction} ${difficultyPrompt}`;
      }
      
      if(input.type === 'text') prompt += `\n\nCONTENT: ${input.content}`;
  } else {
    // ... Existing SKD/UTBK Logic ...
      let difficultyContext = "";
      // Allow overriding difficulty if provided (mostly for Custom Practice)
      if (difficultyOverride) {
          difficultyContext = `CONTEXT: ${category} - ${skdStream || ''}. DIFFICULTY: ${difficultyOverride}.`;
          if (difficultyOverride === 'HOTS') difficultyContext += " QUESTIONS MUST BE High Order Thinking Skills (Analyze, Evaluate, Create).";
      } else if (category === 'SKD' && skdStream) {
          if (skdStream === 'KEDINASAN') {
              difficultyContext = `CONTEXT: SKD SEKOLAH KEDINASAN. DIFFICULTY: HARD/HOTS.`;
          } else {
              difficultyContext = `CONTEXT: SKD CPNS. DIFFICULTY: STANDARD TO HOTS.`;
          }
      } else if (category === 'UTBK') {
          difficultyContext = `CONTEXT: UTBK SNBT 2025. DIFFICULTY: ADAPTIVE (HOTS).`;
      } else if (category === 'TPA') {
          difficultyContext = `CONTEXT: TPA (Tes Potensi Akademik) & TBI (Bahasa Inggris) for Advanced Selection (Lanjutan 1). High Logic Requirement.`;
      } else if (category === 'PSIKOTEST') {
          difficultyContext = `CONTEXT: GENERAL IQ TEST (Psikotes). Focus on Logic sequences, Abstract Reasoning, Mental Arithmetic. Time pressured.`;
      } else if (category === 'INTERVIEW') {
          difficultyContext = `CONTEXT: JOB/SCHOOL ADMISSION INTERVIEW. Generate open-ended behavioral questions.`;
          // MODIFY SCHEMA FOR INTERVIEW: Remove options requirement
          schema = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: {
              type: Type.OBJECT,
              properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["long_text"] },
                  content: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  metadata: { type: Type.OBJECT, properties: { topic: {type: Type.STRING} } }
              },
              required: ["content", "type"]
          } } } };
      } else {
          difficultyContext = "Standard difficulty.";
      }

      if (category === 'INTERVIEW') {
        prompt = `Generate ${count} Interview Questions for: ${context}. 
        Questions should be behavioral, situational, or personal (HR style).
        IMPORTANT: Do not provide multiple choice options. These are open-ended questions.
        Metadata subtest: "Interview".`;
      } else {
        const commonInstruction = `
            Generate ${count} questions.
            ${difficultyContext}
            MANDATORY: Provide a DETAILED 'explanation' for the answer. Explain WHY the correct answer is right and WHY the wrong answers are wrong.
            MANDATORY METADATA:
            - idealTimeSeconds: Realistic time.
            - trapPattern: Describe the distractor logic.
            - shortcut: A fast way to solve it.
        `;

        if (mode === StudyMode.WEAKNESS) {
            prompt = `WEAKNESS ATTACK MODE. User weak in: ${weakTopics.join(', ')}. ${difficultyContext}`;
        } else if (mode === StudyMode.ACTIVE_RECALL) {
            prompt = `ACTIVE RECALL. Type: "short_answer". ${difficultyContext}`;
        } else {
            // Standard
            prompt = `TRY OUT / PRACTICE.
            Context: ${category} - ${JSON.stringify(context)}.
            ${commonInstruction}`;
        }
      }
  }

  const res = await callGemini<{questions: Question[]}>(prompt, schema, base64Pdf);
  const rawQuestions = res.questions || [];
  
  // Sanitize
  return rawQuestions.filter(q => !!q).map(q => {
      const sanitized = sanitizeQuestion(q);
      if (category === 'INTERVIEW') {
          sanitized.type = 'long_text';
          sanitized.options = [];
      }
      return sanitized;
  });
};

export const evaluateInterviewAnswer = async (question: string, answer: string): Promise<InterviewFeedback> => {
    const prompt = `
    Role: Senior HR Recruiter & Psychologist.
    Task: Evaluate this written interview answer.
    
    Question: "${question}"
    Candidate Answer: "${answer}"
    
    Provide:
    1. Score (0-100) based on relevance, structure (STAR method), and professionalism.
    2. Specific Feedback.
    3. A Better/Improved Version of the answer.
    4. Key Points the candidate covered.
    5. Tone Analysis.
    `;
    
    return await callGemini<InterviewFeedback>(prompt, interviewFeedbackSchema);
}

// --- General Learning Method Generators ---

export const generateFlashcards = async (context: GeneralMaterialInput): Promise<FlashcardData[]> => {
    let prompt = `Generate 10 flashcards (Front/Back) based on the provided material. Focus on key terms, definitions, and core concepts. Match the language of the input material.`;
    let base64Pdf = null;
    if (context.type === 'pdf') base64Pdf = context.content;
    else if (context.type === 'text') prompt += `\n\nMATERIAL: ${context.content}`;
    else prompt += `\n\nTOPIC: ${context.content}`;

    const res = await callGemini<{flashcards: {front: string, back: string}[]}>(prompt, flashcardListSchema, base64Pdf);
    return (res.flashcards || []).map((f, i) => ({ id: `fc-${i}`, front: f.front, back: f.back }));
};

export const generateMindMap = async (context: GeneralMaterialInput): Promise<MindMapNode> => {
    let prompt = `Create a hierarchical mind map structure for the provided material. The root node should be the main topic. Limit depth to 3 levels. Match the language of the input material.`;
    let base64Pdf = null;
    if (context.type === 'pdf') base64Pdf = context.content;
    else if (context.type === 'text') prompt += `\n\nMATERIAL: ${context.content}`;
    else prompt += `\n\nTOPIC: ${context.content}`;

    const res = await callGemini<{root: MindMapNode}>(prompt, mindMapSchema, base64Pdf);
    return res.root;
};

export const evaluateFeynman = async (concept: string, explanation: string): Promise<FeynmanFeedback> => {
    const prompt = `
    Technique: Feynman Technique (Explain like I'm 5).
    Original Concept/Topic: "${concept}"
    User's Explanation: "${explanation}"
    
    Evaluate:
    1. Simplicity (Did they use jargon? is it easy to understand?)
    2. Accuracy (Is it correct?)
    3. Completeness (Did they miss key parts?)
    `;
    return await callGemini<FeynmanFeedback>(prompt, feynmanFeedbackSchema);
};

// --- Skripsi Generators ---

export const generateSkripsiContent = async (topic: string, feature: SkripsiFeature): Promise<string> => {
    let prompt = "";
    if (feature === 'TITLE_IDEAS') {
        prompt = `User Topic/Area of Interest: "${topic}"
        Task: Generate 5 unique, academic, and researchable thesis (Skripsi) titles.
        For each title, explain briefly why it is good and what methodology fits.
        Format: Markdown.`;
    } else if (feature === 'OUTLINE') {
        prompt = `Thesis Title/Topic: "${topic}"
        Task: Create a detailed Chapter 1-3 outline for a standard undergraduate thesis.
        Include:
        - Chapter 1: Background, Problem Formulation (Rumusan Masalah), Objectives.
        - Chapter 2: Relevant Theories (Suggested variables), Framework of Thinking.
        - Chapter 3: Methodology (Type, Population/Sample, Data Collection, Analysis).
        Format: Markdown, professional academic Indonesian.`;
    } else if (feature === 'METHODOLOGY') {
        prompt = `Thesis Topic: "${topic}"
        Task: Suggest the best Research Methodology.
        Compare Quantitative vs Qualitative approaches for this specific topic.
        Recommend specific data analysis tools (SPSS, SEM-PLS, NVivo, etc) that fit.
        Format: Markdown.`;
    } else if (feature === 'PARAPHRASE') {
        prompt = `Text to Paraphrase: "${topic}"
        Task: Rewrite the text to be more academic, reduce plagiarism score, and improve flow.
        Language: Indonesian (Formal/Baku).
        Format: Markdown.`;
    }

    const res = await callGemini<any>(prompt, null, null, false);
    return res.text || "Gagal membuat konten.";
};

// --- Helper ---

async function callGemini<T>(prompt: string, schema: any | null, pdfBase64?: string | null, jsonMode: boolean = true): Promise<T> {
  // 1. Check Cache
  const cacheKey = JSON.stringify({ prompt, schemaStr: schema ? JSON.stringify(schema) : 'null', hasPdf: !!pdfBase64 });
  if (requestCache.has(cacheKey)) {
      console.log("Serving from cache:", cacheKey.substring(0, 50));
      return requestCache.get(cacheKey) as T;
  }

  try {
    const parts: any[] = [{ text: prompt }];
    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      });
    }

    const config: any = {};
    if (jsonMode && schema) {
        config.responseMimeType = "application/json";
        config.responseSchema = schema;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: config
    });

    let text = response.text;
    if (!text) throw new Error("No response from AI");
    
    // 2. Process Response
    let result: T;
    
    if (jsonMode) {
        // Cleanup markdown if present
        text = text.trim();
        if (text.startsWith("```json")) {
            text = text.replace(/^```json/, "").replace(/```$/, "");
        } else if (text.startsWith("```")) {
            text = text.replace(/^```/, "").replace(/```$/, "");
        }
        text = text.trim();

        // Safety: try catch JSON parse specifically to give better error context
        try {
            result = JSON.parse(text) as T;
        } catch (parseError) {
            // Fallback extract json from text
            const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
                try {
                    result = JSON.parse(match[0]) as T;
                } catch (e) {
                    throw new Error("Format data AI tidak valid (JSON Truncated/Invalid).");
                }
            } else {
                console.error("JSON Parse Error. Text snippet:", text.substring(0, 500) + "...");
                throw new Error("Format data AI tidak valid (JSON Truncated/Invalid).");
            }
        }
    } else {
        // Plain Text Mode (Skripsi, Advice, etc)
        result = { text } as any; 
    }

    // 3. Save to Cache (Simple LRU logic can be added later, currently infinite for session)
    // Don't cache huge PDFs endlessly, but prompts are fine.
    if (!pdfBase64) {
        requestCache.set(cacheKey, result);
    }

    return result;

  } catch (e) {
    console.error("Gemini Error:", e);
    throw e;
  }
}
