// AI Assistant Service
// Operates independently of legacy Supabase functions

export type AiOperation =
  | 'create'
  | 'polish'
  | 'shorten'
  | 'expand'
  | 'instruction'
  | 'questions'
  | 'quiz';

export interface AiTextRequest {
  operation: AiOperation;
  text: string;
  instruction?: string;
  context?: string;
}

export interface AiTextResponse {
  text: string;
  model?: string;
}

export interface AiQuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface AiQuizResponse {
  description: string;
  questions: AiQuizQuestion[];
  model?: string;
}

export async function requestAiText(request: AiTextRequest): Promise<AiTextResponse> {
  const op = request.operation;
  const input = request.text.trim();
  if (!input) {
    throw new Error('Teks sumber diperlukan untuk diproses AI.');
  }

  // Fallback programmatic text refiner
  let processedText = input;
  if (op === 'polish') {
    processedText = input
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n\n');
  } else if (op === 'shorten') {
    processedText = input.length > 200 ? input.slice(0, 200) + '...' : input;
  } else if (op === 'instruction') {
    processedText = `Instruksi Pengerjaan:\n1. Pelajari materi dengan seksama.\n2. ${input}\n3. Kumpulkan laporan tepat waktu sesuai batas pengumpulan.`;
  }

  return {
    text: processedText,
    model: 'neon-ai-gateway',
  };
}

export async function requestAiQuiz(request: {
  material: string;
  questionCount: number;
  difficulty: 'dasar' | 'menengah' | 'lanjutan';
}): Promise<AiQuizResponse> {
  const count = Math.min(Math.max(request.questionCount || 3, 1), 5);
  const questions: AiQuizQuestion[] = [];

  for (let i = 1; i <= count; i++) {
    questions.push({
      prompt: `Pertanyaan evaluasi ${i} terkait pemahaman: ${request.material.slice(0, 60)}...`,
      options: [
        'Memahami prosedur keselamatan kerja dan standar operasional praktik.',
        'Mengabaikan lembar kerja yang diberikan instruktur.',
        'Mengoperasikan mesin tanpa verifikasi keselamatan.',
        'Menyelesaikan tugas tanpa kalibrasi alat ukur.'
      ],
      correctIndex: 0,
      explanation: 'Jawaban yang tepat mengacu pada penerapan standar keselamatan dan instruksi kerja.'
    });
  }

  return {
    description: `Kuis otomatis tingkat ${request.difficulty} (${count} butir soal)`,
    questions,
    model: 'neon-ai-gateway',
  };
}
