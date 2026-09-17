import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { LearningMaterial, QuizQuestion } from '../../types';

interface InteractiveQuizProps {
  material: LearningMaterial;
  studentId?: string;
}

interface QuizResult {
  score: number;
  correct: number;
  total: number;
  submittedAt: string;
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({ material, studentId }) => {
  const quiz = material.quiz;
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showReview, setShowReview] = useState(false);

  const storageKey = useMemo(() => `poliwako_quiz_result:${studentId || 'anonymous'}:${material.id}`, [studentId, material.id]);

  useEffect(() => {
    if (!quiz) return;
    setQuestions(quiz.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions);
    setAnswers({});
    setShowReview(false);
    try {
      const saved = localStorage.getItem(storageKey);
      setResult(saved ? JSON.parse(saved) as QuizResult : null);
    } catch {
      setResult(null);
    }
  }, [quiz, storageKey]);

  if (!quiz || quiz.questions.length === 0) return null;

  const submitQuiz = () => {
    const correct = questions.reduce((total, question) => total + (answers[question.id] === question.correctOptionId ? 1 : 0), 0);
    const nextResult: QuizResult = {
      score: Math.round((correct / questions.length) * 100),
      correct,
      total: questions.length,
      submittedAt: new Date().toISOString()
    };
    setResult(nextResult);
    setShowReview(true);
    localStorage.setItem(storageKey, JSON.stringify(nextResult));
  };

  const resetQuiz = () => {
    setAnswers({});
    setResult(null);
    setShowReview(false);
    setQuestions(quiz.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions);
    localStorage.removeItem(storageKey);
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Kuis Interaktif</span>
            <h4 className="mt-1 text-sm font-bold text-slate-900">{material.title}</h4>
            {quiz.description && <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-600">{quiz.description}</p>}
          </div>
          {result && <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm"><Trophy className="h-4 w-4" /> Skor {result.score}</div>}
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-slate-500"><span>{answeredCount} dari {questions.length} dijawab</span><span>{Math.round((answeredCount / questions.length) * 100)}%</span></div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {questions.map((question, questionIndex) => {
          const selected = answers[question.id];
          const isCorrect = result && selected === question.correctOptionId;
          return (
            <div key={question.id} className={`rounded-xl border p-4 transition-colors ${result ? (isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/40') : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">{questionIndex + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-relaxed text-slate-900">{question.prompt}</p>
                  {question.imageUrl && <img src={question.imageUrl} alt={`Ilustrasi pertanyaan ${questionIndex + 1}`} className="mt-3 max-h-52 w-full rounded-xl border border-slate-200 bg-white object-contain" />}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {question.options.map((option, optionIndex) => {
                      const selectedOption = selected === option.id;
                      const correctOption = result && question.correctOptionId === option.id;
                      return (
                        <button key={option.id} type="button" disabled={Boolean(result)} onClick={() => setAnswers(prev => ({ ...prev, [question.id]: option.id }))} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition-all ${correctOption ? 'border-emerald-400 bg-emerald-100 text-emerald-900' : selectedOption && result ? 'border-rose-400 bg-rose-100 text-rose-900' : selectedOption ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/10' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                          {correctOption ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : selectedOption && result ? <XCircle className="h-4 w-4 shrink-0 text-rose-600" /> : selectedOption ? <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                          <span><span className="mr-1 text-slate-400">{String.fromCharCode(65 + optionIndex)}.</span>{option.text}</span>
                        </button>
                      );
                    })}
                  </div>
                  {result && question.explanation && <p className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] leading-relaxed text-indigo-900"><span className="font-bold">Pembahasan:</span> {question.explanation}</p>}
                </div>
              </div>
            </div>
          );
        })}

        {result ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div><p className="text-sm font-bold text-emerald-900">Kuis selesai — {result.correct}/{result.total} jawaban benar</p><p className="mt-1 text-[11px] text-emerald-800">Hasil tersimpan di browser perangkat ini.</p></div>
            <button type="button" onClick={resetQuiz} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-100"><RotateCcw className="h-3.5 w-3.5" /> Coba Lagi</button>
          </div>
        ) : (
          <button type="button" onClick={submitQuiz} disabled={answeredCount !== questions.length} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{answeredCount === questions.length ? 'Kirim Jawaban & Lihat Skor' : `Jawab semua pertanyaan (${answeredCount}/${questions.length})`}</button>
        )}
      </div>
    </section>
  );
};
