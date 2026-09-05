import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Users,
  Award,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Table as TableIcon
} from 'lucide-react';
import { GRADE_PREDICATE_RULES, getGradePredicate } from '../../utils/gradeCalculators';

export const AnalyticsView: React.FC = () => {
  const { activeCourse, periods, participants, assessments, attendance, activeCourseId } = useApp();

  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [distributionTab, setDistributionTab] = useState<'CHART' | 'TABLE'>('CHART');

  const courseParticipants = useMemo(() => {
    const periodIds = new Set(coursePeriods.map(p => p.id));
    return participants.filter(p => periodIds.has(p.periodId));
  }, [participants, coursePeriods]);

  const filteredParticipants = useMemo(() => {
    if (selectedPeriod === 'ALL') return courseParticipants;
    return courseParticipants.filter(p => p.periodId === selectedPeriod);
  }, [courseParticipants, selectedPeriod]);

  // Analytics Metrics (PRD Section 64)
  const metrics = useMemo(() => {
    const total = filteredParticipants.length;
    const studentIds = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
    const studentAssessments = assessments.filter(a => studentIds.has(`${a.periodId}_${a.studentId}`) && a.finalScore > 0);

    const scores = studentAssessments.map(a => a.finalScore);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '0';
    const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(2) : '0';
    const minScore = scores.length > 0 ? Math.min(...scores).toFixed(2) : '0';

    const publishedCount = studentAssessments.filter(a => a.isPublished).length;
    const unassessedCount = total - studentAssessments.length;

    const completionRate = total > 0 ? Math.round((filteredParticipants.filter(p => p.finalProjectConfirmed).length / total) * 100) : 0;
    
    // Distribution based on official Poliwako Grade Predicate Rules (Tanpa Angka Mutu)
    const distribution = GRADE_PREDICATE_RULES.map(rule => {
      const count = scores.filter(s => {
        const norm = s > 10 ? s : s * 10;
        return norm >= rule.minScore100 && norm <= rule.maxScore100;
      }).length;
      const pct = studentAssessments.length > 0 ? Math.round((count / studentAssessments.length) * 100) : 0;
      return {
        ...rule,
        count,
        pct
      };
    });

    const avgPred = scores.length > 0 ? getGradePredicate(Number(avgScore)) : null;
    const maxPred = scores.length > 0 ? getGradePredicate(Number(maxScore)) : null;
    const minPred = scores.length > 0 ? getGradePredicate(Number(minScore)) : null;

    return {
      total,
      avgScore,
      maxScore,
      minScore,
      publishedCount,
      unassessedCount,
      completionRate,
      distribution,
      avgPred,
      maxPred,
      minPred,
      assessedTotal: studentAssessments.length,
      subCpmkAchievements: (activeCourse?.subCpmks || []).map(cpmk => {
        if (studentAssessments.length === 0) {
          return { ...cpmk, avg: 0, hasData: false };
        }
        const linkedRubricIds = (activeCourse?.qualityRubrics || [])
          .filter(r => r.subCpmkId === cpmk.id)
          .map(r => r.id);
        const cpmkScores: number[] = [];
        studentAssessments.forEach(a => {
          const matching = (a.qualityScores || []).find(
            q => q.criterionId === cpmk.id || linkedRubricIds.includes(q.criterionId)
          );
          if (matching && typeof matching.score === 'number') {
            cpmkScores.push(matching.score);
          } else if (typeof a.subCpmkPracticeScore === 'number' && a.subCpmkPracticeScore > 0) {
            cpmkScores.push(a.subCpmkPracticeScore);
          } else if (typeof a.qualityScore === 'number' && a.qualityScore > 0) {
            cpmkScores.push(a.qualityScore);
          }
        });
        const avg = cpmkScores.length > 0
          ? Math.round((cpmkScores.reduce((acc, curr) => acc + curr, 0) / cpmkScores.length) * 10) / 10
          : (scores.length > 0 ? Math.round(Number(avgScore) * 10) / 10 : 0);
        return { ...cpmk, avg, hasData: cpmkScores.length > 0 || studentAssessments.length > 0 };
      })
    };
  }, [filteredParticipants, assessments, activeCourse]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Analitik & Evaluasi Mutu
            </span>
            <span className="text-xs text-slate-400">{activeCourse?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Statistik & Analisis Capaian Pembelajaran</h2>
          <p className="text-xs text-slate-500">
            Monitoring kurva performa, distribusi predikat nilai OBE (Poliwako), tingkat ketuntasan modul, dan capaian Sub-CPMK.
          </p>
        </div>

        {/* Filter Period */}
        <div className="flex items-center gap-2 text-xs w-full md:w-auto">
          <span className="text-slate-500 font-medium">Filter Periode:</span>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Semua Periode</option>
            {coursePeriods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rata-Rata Nilai</span>
          <div className="flex flex-wrap items-baseline gap-2 my-1">
            <span className="text-3xl font-black text-blue-600">{metrics.avgScore}</span>
            {metrics.avgPred && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${metrics.avgPred.bgClass} ${metrics.avgPred.colorClass} ${metrics.avgPred.borderClass}`}>
                {metrics.avgPred.letter} ({metrics.avgPred.predicate})
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">Dari 100 poin OBE</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nilai Tertinggi</span>
          <div className="flex flex-wrap items-baseline gap-2 my-1">
            <span className="text-3xl font-black text-emerald-600">{metrics.maxScore}</span>
            {metrics.maxPred && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${metrics.maxPred.bgClass} ${metrics.maxPred.colorClass} ${metrics.maxPred.borderClass}`}>
                {metrics.maxPred.letter}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">Skor puncak mahasiswa</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nilai Terendah</span>
          <div className="flex flex-wrap items-baseline gap-2 my-1">
            <span className="text-3xl font-black text-amber-600">{metrics.minScore}</span>
            {metrics.minPred && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${metrics.minPred.bgClass} ${metrics.minPred.colorClass} ${metrics.minPred.borderClass}`}>
                {metrics.minPred.letter}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">Batas bawah kelas</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completion Rate</span>
          <div className="text-3xl font-black text-indigo-600 my-1">{metrics.completionRate}%</div>
          <span className="text-[11px] text-slate-400">Ketuntasan Final Project</span>
        </div>
      </div>

      {/* Distribution & Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Grade Distribution Bar (PRD & Poliwako Predicate Standard) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600" />
                <span>Distribusi Predikat Nilai Akhir (OBE)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rujukan Resmi: Nilai Angka, Nilai Mutu, & Sebutan Mutu
              </p>
            </div>
            
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setDistributionTab('CHART')}
                className={`px-3 py-1 rounded-lg transition-all text-[11px] ${
                  distributionTab === 'CHART'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Grafik Distribusi
              </button>
              <button
                type="button"
                onClick={() => setDistributionTab('TABLE')}
                className={`px-3 py-1 rounded-lg transition-all text-[11px] flex items-center gap-1 ${
                  distributionTab === 'TABLE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Tabel Rujukan</span>
              </button>
            </div>
          </div>

          {distributionTab === 'CHART' ? (
            (() => {
              const activeDistribution = metrics.distribution.filter(item => item.count > 0);

              if (activeDistribution.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400">
                    <PieChart className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600">Belum ada nilai mahasiswa yang tercatat pada filter ini.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Predikat akan otomatis muncul setelah instruktur melakukan penilaian.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 pt-1 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
                  {activeDistribution.map(item => (
                    <div key={item.key} className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between text-xs font-semibold mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 text-center font-bold px-1.5 py-0.5 rounded-md text-[11px] border ${item.bgClass} ${item.colorClass} ${item.borderClass}`}>
                            {item.letter}
                          </span>
                          <span className={`font-bold ${item.colorClass}`}>{item.predicate}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({item.range10Label})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{item.count} Mhs</span>
                          <span className="text-[11px] text-slate-600 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {item.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`${item.barColor} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${item.pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Nilai Angka</th>
                    <th className="py-2.5 px-3">Nilai Mutu</th>
                    <th className="py-2.5 px-3">Sebutan Mutu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {GRADE_PREDICATE_RULES.map(rule => (
                    <tr key={rule.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium text-slate-700">
                        {rule.range10Label} <span className="text-slate-400 text-[10px]">({rule.range100Label})</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-block w-8 text-center font-bold px-1.5 py-0.5 rounded text-[11px] border ${rule.bgClass} ${rule.colorClass} ${rule.borderClass}`}>
                          {rule.letter}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {rule.predicate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl mt-3 text-[11px] text-blue-800">
                <strong>Catatan Standar Poliwako:</strong> Rujukan resmi menggunakan kolom <em>Nilai Angka</em>, <em>Nilai Mutu</em>, dan <em>Sebutan Mutu</em> (tanpa angka mutu).
              </div>
            </div>
          )}
        </div>

        {/* Sub-CPMK Achievement Matrix */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Capaian Standar Sub-CPMK Mata Kuliah</span>
          </h3>

          <div className="space-y-3 pt-2">
            {metrics.subCpmkAchievements.length > 0 ? (
              metrics.subCpmkAchievements.map(cpmk => (
                <div key={cpmk.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex justify-between text-xs font-bold text-slate-900 mb-1">
                    <span>{cpmk.code}</span>
                    <span className={`${cpmk.hasData ? 'text-emerald-600' : 'text-slate-400'} font-mono font-bold`}>
                      {cpmk.hasData ? `${cpmk.avg}% Capaian` : 'Belum Dinilai'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{cpmk.description}</p>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, cpmk.avg))}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 border border-dashed rounded-2xl">
                <p className="text-xs text-slate-500">Belum ada Sub-CPMK terkonfigurasi pada mata kuliah ini.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
