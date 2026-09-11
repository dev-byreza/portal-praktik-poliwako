import React, {useState} from 'react';
import {useApp} from '../../context/AppContext';
export const StudentFinalProjectCard: React.FC<{isUnlocked: boolean; driveUrl?: string; description?: string}> = ({isUnlocked,driveUrl,description}) => {
  const {studentSession, participants, confirmFinalProject, isLiveBackend} = useApp();
  const participant=participants.find(p=>p.studentId===studentSession?.studentId && p.periodId===studentSession?.periodId);
  const [url,setUrl]=useState(participant?.finalProjectUrl || ''); const [checked,setChecked]=useState(false);
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const status=participant?.finalProjectReviewStatus;
  if (!isUnlocked) return <section className="p-5 bg-slate-50 border rounded-xl"><h2 className="font-bold">Final project belum terbuka</h2><p className="text-sm mt-2">Tandai seluruh materi selesai dipelajari untuk membuka pengumpulan.</p></section>;
  const submit=async(e: React.FormEvent)=>{e.preventDefault();if(!checked||busy)return;setBusy(true);setError('');try{await confirmFinalProject(url);setChecked(false);}catch(e){setError(e instanceof Error?e.message:'Pengumpulan gagal.');}finally{setBusy(false);}};
  return <section className="space-y-4 p-4 sm:p-6 border rounded-2xl">
    <h2 className="text-xl font-bold">Final project praktik</h2>{description && <p className="text-sm whitespace-pre-line text-slate-600">{description}</p>}<p className="text-sm text-slate-600">Kirim tautan hasil pekerjaan Anda. Instruktur akan memeriksa kelengkapan berkas sebelum menyatakan proyek diterima.</p>
    {driveUrl && !driveUrl.includes('/folders/poliwako-') ? <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-blue-700 font-semibold">Buka folder pengumpulan instruktur</a> : <p className="text-sm text-amber-800">Folder bersama belum disiapkan. Hubungi instruktur untuk ketentuan pengumpulan.</p>}
    {!isLiveBackend && <p className="text-sm text-amber-800">Mode lokal: tautan belum dikirim ke instruktur.</p>}
    {participant?.finalProjectConfirmed && <div className="p-4 rounded-xl bg-blue-50 text-sm"><strong>{status==='ACCEPTED'?'Diterima instruktur':status==='REVISION_REQUIRED'?'Perlu revisi':'Menunggu pemeriksaan instruktur'}</strong>{participant.finalProjectUrl && <a href={participant.finalProjectUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 break-all text-blue-700">Lihat berkas yang dikirim</a>}{participant.finalProjectFeedback && <p className="mt-2 whitespace-pre-line">{participant.finalProjectFeedback}</p>}</div>}
    {status !== 'ACCEPTED' && <form onSubmit={submit} className="space-y-3"><label className="block text-sm font-semibold">Tautan Google Drive hasil pekerjaan<input required type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://drive.google.com/..." className="mt-2 block w-full min-h-11 border rounded-lg px-3 font-normal"/></label><label className="flex gap-3 text-sm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} className="mt-1"/>Saya sudah memastikan instruktur dapat membuka tautan dan berkasnya lengkap.</label><button disabled={!checked||busy} className="min-h-11 w-full sm:w-auto px-5 bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50">{busy?'Menyimpan…':participant?.finalProjectConfirmed?'Kirim ulang proyek':'Kirim proyek'}</button>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}</form>}
  </section>;
};
