import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading2,
  Heading3,
  ImagePlus,
  Indent,
  Italic,
  Link,
  List,
  ListOrdered,
  Outdent,
  Pilcrow,
  Redo2,
  SeparatorHorizontal,
  Sparkles,
  Underline,
  Undo2,
} from 'lucide-react';
import { sanitizeRichTextHtml, toRichTextHtml, richTextToPlainText } from '../../utils/richText';
import { AIAssistantPanel } from './AIAssistantPanel';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  aiContext?: string;
}

type ToolbarButtonProps = {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onMouseDown={event => event.preventDefault()}
    onClick={onClick}
    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
  >
    {children}
  </button>
);

/** A small Word-like editor intended for locally testing course materials. */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, aiContext }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = toRichTextHtml(value);
    if (editor.innerHTML !== nextValue) editor.innerHTML = nextValue;
  }, [value]);

  const emitChange = () => {
    if (!editorRef.current) return;
    onChange(sanitizeRichTextHtml(editorRef.current.innerHTML));
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const addLink = () => {
    const href = window.prompt('Masukkan URL tautan (https://...)');
    if (!href?.trim()) return;
    runCommand('createLink', href.trim());
  };

  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;
    if (!image.type.startsWith('image/')) {
      setImageError('Pilih file gambar (JPG, PNG, WEBP, atau GIF).');
      return;
    }
    // Data URL keeps this prototype fully local. A later Supabase version will
    // upload the file and replace this source with a Storage URL.
    if (image.size > 1.5 * 1024 * 1024) {
      setImageError('Untuk uji lokal, ukuran gambar maksimal 1,5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setImageError('');
      editorRef.current?.focus();
      document.execCommand('insertImage', false, dataUrl);
      const images = editorRef.current?.querySelectorAll('img') || [];
      images.forEach(item => {
        item.style.maxWidth = '100%';
        item.style.height = 'auto';
        item.style.borderRadius = '0.75rem';
      });
      emitChange();
    };
    reader.readAsDataURL(image);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <div className="mr-1 flex items-center border-r border-slate-200 pr-1">
          <ToolbarButton label="Bantu dengan AI" onClick={() => setIsAiOpen(true)}><Sparkles className="h-4 w-4 text-cyan-600" /></ToolbarButton>
        </div>
        <div className="flex items-center border-r border-slate-200 pr-1">
          <ToolbarButton label="Paragraf" onClick={() => runCommand('formatBlock', '<p>')}><Pilcrow className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Judul besar" onClick={() => runCommand('formatBlock', '<h2>')}><Heading2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Judul kecil" onClick={() => runCommand('formatBlock', '<h3>')}><Heading3 className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center border-r border-slate-200 pr-1">
          <ToolbarButton label="Tebal" onClick={() => runCommand('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Miring" onClick={() => runCommand('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Garis bawah" onClick={() => runCommand('underline')}><Underline className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Hapus format" onClick={() => runCommand('removeFormat')}><Eraser className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center border-r border-slate-200 pr-1">
          <ToolbarButton label="Daftar bullet" onClick={() => runCommand('insertUnorderedList')}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Daftar bernomor" onClick={() => runCommand('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Tambah indentasi" onClick={() => runCommand('indent')}><Indent className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Kurangi indentasi" onClick={() => runCommand('outdent')}><Outdent className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center border-r border-slate-200 pr-1">
          <ToolbarButton label="Rata kiri" onClick={() => runCommand('justifyLeft')}><AlignLeft className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Rata tengah" onClick={() => runCommand('justifyCenter')}><AlignCenter className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Rata kanan" onClick={() => runCommand('justifyRight')}><AlignRight className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center">
          <ToolbarButton label="Masukkan tautan" onClick={addLink}><Link className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Masukkan gambar" onClick={() => fileInputRef.current?.click()}><ImagePlus className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Garis pemisah" onClick={() => runCommand('insertHorizontalRule')}><SeparatorHorizontal className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Urungkan" onClick={() => runCommand('undo')}><Undo2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Ulangi" onClick={() => runCommand('redo')}><Redo2 className="h-4 w-4" /></ToolbarButton>
        </div>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImage} className="hidden" />
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder || 'Tulis materi praktik di sini...'}
        onInput={emitChange}
        onBlur={emitChange}
        className="rich-text-editor min-h-[320px] w-full overflow-y-auto p-4 text-sm leading-relaxed text-slate-800 outline-none"
      />
      {imageError && <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{imageError}</p>}
      <AIAssistantPanel
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        title="Bantu edit materi dengan AI"
        initialText={richTextToPlainText(value)}
        context={aiContext || 'Editor materi pembelajaran praktik di Portal Praktik Poliwako.'}
        onApply={text => onChange(toRichTextHtml(text))}
      />
    </div>
  );
};
