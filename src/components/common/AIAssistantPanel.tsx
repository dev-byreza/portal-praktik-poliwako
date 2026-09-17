import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { AiOperation, requestAiText } from '../../services/aiService';
import { ModalPortal } from './ModalPortal';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  context?: string;
  title?: string;
  onApply?: (text: string) => void;
}

const operationOptions: Array<{ value: AiOperation; label: string; hint: string }> = [
  { value: 'polish', label: 'Perbaiki bahasa', hint: 'Rapikan ejaan, alur, dan kejelasan tanpa mengubah maksud.' },
  { value: 'create', label: 'Buat dari nol', hint: 'Buat teks baru berdasarkan topik atau instruksi yang Anda tulis.' },
  { value: 'shorten', label: 'Ringkas', hint: 'Padatkan teks agar lebih cepat dipahami.' },
  { value: 'expand', label: 'Kembangkan', hint: 'Tambahkan penjelasan, contoh, dan konteks yang relevan.' },
  { value: 'instruction', label: 'Jadikan instruksi praktik', hint: 'Ubah menjadi langkah kerja yang jelas untuk mahasiswa.' },
  { value: 'questions', label: 'Buat pertanyaan', hint: 'Buat pertanyaan evaluasi dari materi atau topik.' },
];

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  initialText = '',
  context,
  title = 'Asisten AI Materi',
  onApply,
}) => {
  const [operation, setOperation] = useState<AiOperation>('polish');
  const [sourceText, setSourceText] = useState(initialText);
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSourceText(initialText);
    setResult('');
    setError('');
    setCopied(false);
  }, [initialText, isOpen]);

  const selectedOperation = useMemo(
    () => operationOptions.find(item => item.value === operation) || operationOptions[0],
    [operation],
  );

  const handleGenerate = async () => {
    if (operation !== 'create' && !sourceText.trim()) {
      setError('Masukkan teks yang ingin dibantu terlebih dahulu.');
      return;
    }
    if (operation === 'create' && !instruction.trim() && !sourceText.trim()) {
      setError('Tulis topik atau instruksi agar AI dapat membuat teks.');
      return;
    }

    setIsLoading(true);
    setError('');
    setCopied(false);
    try {
      const response = await requestAiText({
        operation,
        text: sourceText.trim(),
        instruction: instruction.trim() || undefined,
        context,
      });
      setResult(response.text);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'AI belum dapat memproses permintaan ini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard?.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleApply = () => {
    if (!result || !onApply) return;
    onApply(result);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] flex items-end justify-end bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6">
        <section className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-4 text-white sm:px-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/20">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-black">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">Buat dan poles teks materi, tugas, pengumuman, atau instruksi praktik.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup asisten AI" className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Yang ingin dibantu</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {operationOptions.map(item => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setOperation(item.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors ${operation === item.value ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{selectedOperation.hint}</p>

                <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Teks sumber
                  <textarea
                    value={sourceText}
                    onChange={event => setSourceText(event.target.value)}
                    rows={9}
                    maxLength={12000}
                    placeholder={operation === 'create' ? 'Tulis topik atau gambaran singkat materi…' : 'Tempel atau tulis teks yang ingin diedit…'}
                    className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm font-normal leading-relaxed text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  />
                </label>
                <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Arahan tambahan <span className="font-normal normal-case tracking-normal text-slate-400">(opsional)</span>
                  <textarea
                    value={instruction}
                    onChange={event => setInstruction(event.target.value)}
                    rows={3}
                    maxLength={1200}
                    placeholder="Contoh: gunakan bahasa formal, target mahasiswa semester 2, maksimal 150 kata."
                    className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-normal leading-relaxed text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </label>
                <button type="button" onClick={() => void handleGenerate()} disabled={isLoading} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isLoading ? 'AI sedang menyusun…' : 'Buat hasil dengan AI'}
                </button>
              </div>

              <div className="flex min-h-[18rem] flex-col rounded-2xl border border-cyan-200 bg-cyan-50/40 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-800">Hasil AI</p>
                    <p className="mt-1 text-[11px] text-cyan-700/70">Periksa hasil sebelum menerapkannya ke editor.</p>
                  </div>
                  {result && <button type="button" onClick={() => setResult('')} className="rounded-lg p-1.5 text-cyan-700 hover:bg-cyan-100" title="Bersihkan hasil"><RefreshCw className="h-4 w-4" /></button>}
                </div>
                <textarea
                  value={result}
                  onChange={event => setResult(event.target.value)}
                  placeholder="Hasil bantuan AI akan muncul di sini…"
                  className="mt-3 min-h-[13rem] w-full flex-1 resize-y rounded-xl border border-cyan-200 bg-white px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
                />
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => void handleCopy()} disabled={!result} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}
                    {copied ? 'Tersalin' : 'Salin'}
                  </button>
                  {onApply && <button type="button" onClick={handleApply} disabled={!result} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"><Check className="h-4 w-4" /> Terapkan ke editor</button>}
                </div>
              </div>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700">{error}</p>}
          </div>
        </section>
      </div>
    </ModalPortal>
  );
};
