import React, {useState} from 'react';
import {useApp} from '../../context/AppContext';
import {PracticeParticipant} from '../../types';
export function FinalProjectReview({participant}:{participant:PracticeParticipant}) {
  const {reviewFinalProject}=useApp();
  const [feedback,setFeedback]=useState(participant.finalProjectFeedback || '');
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const save=async(status:'ACCEPTED'|'REVISION_REQUIRED')=>{setBusy(true);setError('');try{await reviewFinalProject(participant.id,status,feedback);}catch(e){setError(e instanceof Error?e.message:'Pemeriksaan gagal disimpan.');}finally{setBusy(false);}};
  return <section className="border rounded-xl p-4 space-y-3"><h3 className="font-bold text-sm">Pemeriksaan final project</h3>{participant.finalProjectUrl ? <><a href={participant.finalProjectUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 text-sm break-all">Buka hasil pekerjaan mahasiswa</a><p className="text-sm">{participant.finalProjectReviewStatus === 'ACCEPTED' ? 'Diterima' : participant.finalProjectReviewStatus === 'REVISION_REQUIRED' ? 'Perlu revisi' : 'Menunggu pemeriksaan'}</p><label className="block text-sm">Catatan pemeriksaan<textarea value={feedback} onChange={e=>setFeedback(e.target.value)} className="w-full border rounded-lg p-2 mt-1"/></label><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>save('REVISION_REQUIRED')} className="min-h-11 px-4 border rounded-lg text-sm">Minta revisi</button><button disabled={busy} onClick={()=>save('ACCEPTED')} className="min-h-11 px-4 bg-emerald-700 text-white rounded-lg text-sm">Terima proyek</button></div>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}</> : <p className="text-sm text-slate-500">Mahasiswa belum mengirim tautan hasil pekerjaan.</p>}</section>;
}
