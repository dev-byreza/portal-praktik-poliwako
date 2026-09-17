import React, { useEffect, useState } from 'react';
import { ImagePlus, Plus, Trash2, CheckCircle2, GripVertical } from 'lucide-react';
import { QuizDefinition, QuizOption, QuizQuestion } from '../../types';

interface QuizBuilderProps {
  initialQuiz?: QuizDefinition;
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

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ initialQuiz, onSave, onCancel }) => {
  const [description, setDescription] = useState(initialQuiz?.description || 'Jawab pertanyaan berikut berdasarkan materi yang sudah dipelajari.');
  const [shuffleQuestions, setShuffleQuestions] = useState(Boolean(initialQuiz?.shuffleQuestions));
  const [passScore, setPassScore] = useState(String(initialQuiz?.passScore ?? 70));
  const [maxAttempts, setMaxAttempts] = useState(String(initialQuiz?.maxAttempts ?? 0));
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuiz?.questions?.length ? initialQuiz.questions : [makeQuestion()]);
  const [error, setError] = useState('');

  useEffect(() => {
    setDescription(initialQuiz?.description || 'Jawab pertanyaan berikut berdasarkan materi yang sudah dipelajari.');
    setShuffleQuestions(Boolean(initialQuiz?.shuffleQuestions));
    setPassScore(String(initialQuiz?.passScore ?? 70));
    setMaxAttempts(String(initialQuiz?.maxAttempts ?? 0));
    setQuestions(initialQuiz?.questions?.length ? initialQuiz.questions : [makeQuestion()]);
  }, [initialQuiz]);

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
      setError('Ukuran gambar maksimal 2 MB untuk penyimpanan lokal.');
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-xs font-bold text-indigo-900">Kuis interaktif lokal</p>
        <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">Gambar disimpan sebagai data lokal di browser. Cocok untuk prototipe sebelum kuis dipindahkan ke Supabase.</p>
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
