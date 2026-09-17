import React, { useEffect, useState } from 'react';
import { ImagePlus, Plus, Trash2, CheckCircle2, GripVertical, Sparkles, Loader2 } from 'lucide-react';
import { QuizDefinition, QuizOption, QuizQuestion } from '../../types';
import { requestAiQuiz } from '../../services/aiService';

interface QuizBuilderProps {
  initialQuiz?: QuizDefinition;
  initialMaterial?: string;
  onSave: (quiz: QuizDefinition) => void;
  onCancel: () => void;
}

const makeId = (prefix: string) => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

const makeQuestion = (): QuizQuestion => {
  const options: QuizOption[] = [1, 2, 3, 4].map(index => ({ id: makeId('option'), text: `Pilihan ${String.fromCharCode(64 + index)}` }));
  return { id: makeId('question'), prompt: '', options, correctOptionId: options[0].id, explanation: '' };
};

const readImageFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ initialQuiz, initialMaterial = '', onSave, onCancel }) => {
  const [description, setDescription] = useState(initialQuiz?.description || 'Jawab pertanyaan berikut berdasarkan materi yang sudah dipelajari.');
  const [shuffleQuestions, setShuffleQuestions] = useState(Boolean(initialQuiz?.shuffleQuestions));
  const [passScore, setPassScore] = useState(String(initialQuiz?.passScore ?? 70));
  const [maxAttempts, setMaxAttempts] = useState(String(initialQuiz?.maxAttempts ?? 0));
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuiz?.questions?.length ? initialQuiz.questions : [makeQuestion()]);
  const [error, setError] = useState('');
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [aiMaterial, setAiMaterial] = useState(initialMaterial);
  const [aiQuestionCount, setAiQuestionCount] = useState('5');
  const [aiDifficulty, setAiDifficulty] = useState<'dasar' | 'menengah' | 'lanjutan'>('menengah');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    setDescription(initialQuiz?.description || 'Jawab pertanyaan berikut berdasarkan materi yang sudah dipelajari.');
    setShuffleQuestions(Boolean(initialQuiz?.shuffleQuestions));
    setPassScore(String(initialQuiz?.passScore ?? 70));
    setMaxAttempts(String(initialQuiz?.maxAttempts ?? 0));
    setQuestions(initialQuiz?.questions?.length ? initialQuiz.questions : [makeQuestion()]);
    setAiMaterial(initialMaterial);
  }, [initialMaterial, initialQuiz]);

  const updateQuestion = (questionId: string, patch: Partial<QuizQuestion>) => {
    setQuestions(prev => prev.map(question => question.id === questionId ? { ...question, ...patch } : question));
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
    setQuestions(prev => prev.map(question => question.id !== questionId ? question : {
      ...question,
      options: question.options.map(option => option.id === optionId ? { ...option, text } : option)
    }));
  };

  const addOption = (questionId: string) => {
    setQuestions(prev => prev.map(question => question.id !== questionId ? question : {
      ...question,
      options: [...question.options, { id: makeId('option'), text: '' }]
    }));
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(prev => prev.map(question => {
      if (question.id !== questionId || question.options.length <= 2) return question;
      const options = question.options.filter(option => option.id !== optionId);
      return {
        ...question,
        options,
        correctOptionId: question.correctOptionId === optionId ? options[0].id : question.correctOptionId
      };
    }));
  };

  const handleImage = async (questionId: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File gambar harus berupa JPG, PNG, WEBP, atau format gambar lain yang didukung browser.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 2 MB untuk dikirim ke server.');
      return;
    }
    const imageUrl = await readImageFile(file);
    updateQuestion(questionId, { imageUrl });
    setError('');
  };

  const handleSave = () => {
    const normalizedPassScore = Number(passScore);
    const normalizedMaxAttempts = Number(maxAttempts);
    const invalid = questions.find(question => (
      !question.prompt.trim()
      || question.options.length < 2
      || question.options.some(option => !option.text.trim())
      || !question.options.some(option => option.id === question.correctOptionId)
    ));
    if (questions.length === 0 || invalid || !Number.isFinite(normalizedPassScore) || normalizedPassScore < 0 || normalizedPassScore > 100 || !Number.isInteger(normalizedMaxAttempts) || normalizedMaxAttempts < 0) {
      setError('Lengkapi pertanyaan, semua pilihan jawaban, dan tandai satu jawaban benar.');
      return;
    }
    onSave({
      description: description.trim(),
      shuffleQuestions,
      passScore: normalizedPassScore,
      maxAttempts: normalizedMaxAttempts,
      questions: questions.map(question => ({
        ...question,
        prompt: question.prompt.trim(),
        explanation: question.explanation?.trim() || undefined,
        options: question.options.map(option => ({ ...option, text: option.text.trim() }))
      }))
    });
  };

  const handleGenerateWithAi = async () => {
    if (!aiMaterial.trim()) {
      setError('Masukkan materi atau ringkasan materi terlebih dahulu agar AI dapat membuat quiz.');
      return;
    }
    setIsAiLoading(true);
    setError('');
    try {
      const generated = await requestAiQuiz({
        material: aiMaterial.trim(),
        questionCount: Number(aiQuestionCount) || 5,
        difficulty: aiDifficulty,
      });
      setDescription(generated.description || description);
      setQuestions(generated.questions.map(question => {
        const options = question.options.map(text => ({ id: makeId('option'), text }));
        return {
          id: makeId('question'),
          prompt: question.prompt,
          options,
          correctOptionId: options[question.correctIndex]?.id || options[0]?.id,
          explanation: question.explanation || '',
        };
      }));
      setIsAiGeneratorOpen(false);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Quiz belum dapat dibuat oleh AI.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-bold text-emerald-900">Kuis terhubung ke Supabase</p>
        <p className="mt-1 text-[11px] leading-relaxed text-emerald-800">Quiz, gambar soal, jawaban, dan hasil percobaan akan disimpan di server agar dapat diakses lintas perangkat.</p>
      </div>

      <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold text-cyan-950"><Sparkles className="h-4 w-4 text-cyan-600" /> Buat quiz dari materi dengan AI</p>
            <p className="mt-1 text-[11px] leading-relaxed text-cyan-800">Tempel materi, lalu AI mengisi pertanyaan, opsi jawaban, kunci, dan pembahasan. Semua hasil tetap bisa diedit.</p>
          </div>
          <button type="button" onClick={() => setIsAiGeneratorOpen(open => !open)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500"><Sparkles className="h-4 w-4" /> {isAiGeneratorOpen ? 'Tutup AI' : 'Buat dengan AI'}</button>
        </div>
        {isAiGeneratorOpen && <div className="mt-4 border-t border-cyan-200 pt-4">
          <textarea value={aiMaterial} onChange={event => setAiMaterial(event.target.value)} rows={6} maxLength={20000} placeholder="Tempel materi pembelajaran di sini…" className="w-full resize-y rounded-xl border border-cyan-200 bg-white px-3.5 py-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15" />
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-[11px] font-semibold text-slate-700">Jumlah soal<select value={aiQuestionCount} onChange={event => setAiQuestionCount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"><option value="3">3 soal</option><option value="5">5 soal</option><option value="7">7 soal</option><option value="10">10 soal</option></select></label>
            <label className="text-[11px] font-semibold text-slate-700">Tingkat kesulitan<select value={aiDifficulty} onChange={event => setAiDifficulty(event.target.value as typeof aiDifficulty)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"><option value="dasar">Dasar</option><option value="menengah">Menengah</option><option value="lanjutan">Lanjutan</option></select></label>
            <button type="button" onClick={() => void handleGenerateWithAi()} disabled={isAiLoading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">{isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{isAiLoading ? 'Menyusun…' : 'Generate quiz'}</button>
          </div>
        </div>}
      </div>

      <textarea
        rows={2}
        value={description}
        onChange={event => setDescription(event.target.value)}
        placeholder="Petunjuk pengerjaan kuis"
        className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-semibold text-slate-700">
          Nilai minimal lulus (%)
          <input type="number" min={0} max={100} value={passScore} onChange={event => setPassScore(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </label>
        <label className="text-[11px] font-semibold text-slate-700">
          Batas percobaan (0 = bebas)
          <input type="number" min={0} step={1} value={maxAttempts} onChange={event => setMaxAttempts(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" checked={shuffleQuestions} onChange={event => setShuffleQuestions(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Acak urutan pertanyaan untuk mahasiswa
      </label>

      <div className="space-y-4">
        {questions.map((question, questionIndex) => (
          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900"><GripVertical className="h-4 w-4 text-slate-400" /> Pertanyaan {questionIndex + 1}</div>
              <button type="button" onClick={() => setQuestions(prev => prev.filter(item => item.id !== question.id))} disabled={questions.length === 1} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
            </div>
            <textarea
              rows={2}
              value={question.prompt}
              onChange={event => updateQuestion(question.id, { prompt: event.target.value })}
              placeholder="Tulis pertanyaan dari materi..."
              className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            {question.imageUrl && <img src={question.imageUrl} alt="Ilustrasi pertanyaan" className="mt-3 max-h-40 w-full rounded-xl border border-slate-200 object-contain bg-slate-50" />}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-2 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50">
              <ImagePlus className="h-4 w-4" /> {question.imageUrl ? 'Ganti gambar' : 'Tambahkan gambar'}
              <input type="file" accept="image/*" className="hidden" onChange={event => { void handleImage(question.id, event.target.files?.[0]); event.currentTarget.value = ''; }} />
            </label>

            <div className="mt-4 space-y-2">
              {question.options.map((option, optionIndex) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuestion(question.id, { correctOptionId: option.id })} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${question.correctOptionId === option.id ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-emerald-400'}`} title="Tandai sebagai jawaban benar">{question.correctOptionId === option.id ? <CheckCircle2 className="h-4 w-4" /> : String.fromCharCode(65 + optionIndex)}</button>
                  <input value={option.text} onChange={event => updateOption(question.id, option.id, event.target.value)} placeholder={`Pilihan ${String.fromCharCode(65 + optionIndex)}`} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  <button type="button" onClick={() => removeOption(question.id, option.id)} disabled={question.options.length <= 2} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30" title="Hapus pilihan"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => addOption(question.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"><Plus className="h-3.5 w-3.5" /> Tambah pilihan</button>
            </div>

            <input value={question.explanation || ''} onChange={event => updateQuestion(question.id, { explanation: event.target.value })} placeholder="Pembahasan setelah dijawab (opsional)" className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setQuestions(prev => [...prev, makeQuestion()])} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 py-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><Plus className="h-4 w-4" /> Tambah Pertanyaan</button>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</p>}
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">Batal</button>
        <button type="button" onClick={handleSave} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500">Simpan Kuis</button>
      </div>
    </div>
  );
};
