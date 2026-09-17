import { supabase, isSupabaseConfigured } from './supabaseClient';

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

/**
 * AI is intentionally called through a Supabase Edge Function. The provider
 * key never enters the browser bundle, while the current Supabase session is
 * forwarded automatically by supabase-js.
 */
export async function requestAiText(request: AiTextRequest): Promise<AiTextResponse> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('AI belum terhubung. Hubungkan Supabase dan deploy Edge Function ai-assistant terlebih dahulu.');
  }

  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: request,
  });

  if (error) {
    let detail = error.message || 'Permintaan AI gagal diproses.';
    try {
      const context = (error as any).context;
      const payload = context && typeof context.json === 'function' ? await context.json() : null;
      if (payload?.error) detail = payload.error;
    } catch {
      // Keep the original Functions error when the response is not JSON.
    }
    throw new Error(detail);
  }

  if (!data?.text || typeof data.text !== 'string') {
    throw new Error('AI tidak mengembalikan teks. Coba ulangi dengan instruksi yang lebih spesifik.');
  }

  return data as AiTextResponse;
}

export async function requestAiQuiz(request: {
  material: string;
  questionCount: number;
  difficulty: 'dasar' | 'menengah' | 'lanjutan';
}): Promise<AiQuizResponse> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('AI belum terhubung. Hubungkan Supabase dan deploy Edge Function ai-assistant terlebih dahulu.');
  }

  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { operation: 'quiz', ...request },
  });

  if (error) throw new Error(error.message || 'Pembuatan quiz dengan AI gagal diproses.');
  if (!data?.quiz || !Array.isArray(data.quiz.questions)) {
    throw new Error('AI tidak mengembalikan struktur quiz yang valid.');
  }
  return data as AiQuizResponse;
}
