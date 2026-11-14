// Analytics & Learning Outcomes Dashboard
// Modern, Ultra-Clean Design & OBE Indicators for Poliwako CAD Practice

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Award,
  Filter,
  Table as TableIcon
} from 'lucide-react';
import { GRADE_PREDICATE_RULES } from '../../utils/gradeCalculators';
import { OBEAnalyticsSection } from './OBEAnalyticsSection';

export const AnalyticsView: React.FC = () => {
  const { activeCourse, periods, participants, assessments, activeCourseId } = useApp();

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

  // Sub-CPMK Achievements
  const subCpmkAchievements = useMemo(() => {
    const studentIds = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
    const studentAssessments = assessments.filter(a => studentIds.has(`${a.periodId}_${a.studentId}`) && Number.isFinite(a.finalScore) && a.finalScore > 0);
    const scores = studentAssessments.map(a => a.finalScore);
    const hasData = scores.length > 0;
    const avgScore = hasData ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0.0';

    return (activeCourse?.subCpmks || []).map(cpmk => {
      if (!hasData) {
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
        : Math.round(Number(avgScore) * 10) / 10;
      return { ...cpmk, avg, hasData: true };
    });
  }, [filteredParticipants, assessments, activeCourse]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dashboard Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitoring performa capaian pembelajaran praktik CAD &amp; statistik evaluasi OBE
          </p>
        </div>

        {/* Period Selector Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-1.5 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-900">Semua Gelombang</option>
              {coursePeriods.map(p => (
                <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. OBE ANALYTICS: 4 METRIC CARDS + DUAL SPLINE CURVE + DONUT RING */}
      <OBEAnalyticsSection
        showMetricCards={true}
        selectedPeriodFilter={selectedPeriod}
      />

      {/* 2. DETAIL ACCORDION: CAPAIAN SUB-CPMK & DISTRIBUSI PREDIKAT OBE POLIWAKO */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Capaian Standar Sub-CPMK Mata Kuliah</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pemetaan ketercapaian kompetensi berbasis Outcome-Based Education (OBE) Politeknik Sorowako
            </p>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDistributionTab('CHART')}
              className={`px-3 py-1 rounded-lg transition-all text-xs font-bold cursor-pointer ${
                distributionTab === 'CHART'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Matriks Sub-CPMK
            </button>
            <button
              type="button"
              onClick={() => setDistributionTab('TABLE')}
              className={`px-3 py-1 rounded-lg transition-all text-xs font-bold flex items-center gap-1 cursor-pointer ${
                distributionTab === 'TABLE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Rujukan Mutu</span>
            </button>
          </div>
        </div>

        {distributionTab === 'CHART' ? (
          <div className="space-y-5 pt-1">
            {subCpmkAchievements.length > 0 ? (
              <>
                {/* Modern Horizontal Stacked & Grouped Bar Overview (Reference UI Style) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left 7 cols: Horizontal Multi-Segment Bar Chart */}
                  <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span>Diagram Batang Horizontal Sub-CPMK</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono">Skala 0 – 100%</span>
                    </div>
                    <div className="space-y-2.5">
                      {subCpmkAchievements.map((cpmk, idx) => (
                        <div key={`hbar-${cpmk.id}`} className="flex items-center gap-3">
                          <span className="w-20 shrink-0 font-mono text-[11px] font-extrabold text-slate-600 dark:text-slate-300 truncate">
                            {cpmk.code}
                          </span>
                          <div className="flex-1 bg-slate-200/70 dark:bg-slate-700/60 h-3.5 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                            <div
                              className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-l-full transition-all duration-700"
                              style={{ width: `${Math.min(100, Math.max(0, cpmk.avg * 0.6))}%` }}
                            />
                            <div
                              className="bg-indigo-400 dark:bg-indigo-400/80 h-full transition-all duration-700"
                              style={{ width: `${Math.min(100, Math.max(0, cpmk.avg * 0.25))}%` }}
                            />
                            <div
                              className={`${idx % 2 === 0 ? 'bg-cyan-400' : 'bg-orange-400'} h-full rounded-r-full transition-all duration-700`}
                              style={{ width: `${Math.min(100, Math.max(0, cpmk.avg * 0.15))}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-mono text-xs font-black text-slate-800 dark:text-slate-200 shrink-0">
                            {cpmk.hasData ? `${cpmk.avg}%` : '0%'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right 5 cols: Vertical Grouped Column Bars */}
                  <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                      <span>Diagram Batang Capaian Sub-CPMK</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono">Aktual (%)</span>
                    </div>
                    <div className="relative h-32 flex items-end justify-around gap-2 pt-3 px-2 border-b border-slate-200/70 dark:border-slate-700/70">
                      {subCpmkAchievements.map(cpmk => (
                        <div key={`vbar-${cpmk.id}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <div className="w-full max-w-[34px] h-full flex items-end justify-center gap-1">
                            <div className="w-3.5 h-full bg-slate-200/70 dark:bg-slate-700/50 rounded-t-md flex items-end overflow-hidden">
                              <div
                                className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-700"
                                style={{ height: `${Math.min(100, Math.max(6, cpmk.avg))}%` }}
                                title={`${cpmk.code} Aktual: ${cpmk.avg}%`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-around gap-1 pt-1.5">
                      {subCpmkAchievements.map(cpmk => (
                        <span key={`vlbl-${cpmk.id}`} className="flex-1 text-center font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                          {cpmk.code.replace(/Sub-CPMK\s*/i, 'C')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed Sub-CPMK Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {subCpmkAchievements.map(cpmk => (
                    <div
                      key={cpmk.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex justify-between items-baseline text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{cpmk.code}</span>
                        <span className={`font-mono text-xs ${cpmk.hasData ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 font-semibold'}`}>
                          {cpmk.hasData ? `${cpmk.avg}% Capaian` : 'Belum Dinilai'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {cpmk.description}
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
                        <div
                          className="bg-gradient-to-r from-indigo-600 to-cyan-500 h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(100, Math.max(0, cpmk.avg))}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="col-span-2 py-8 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada Sub-CPMK terkonfigurasi pada mata kuliah ini.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Nilai Angka</th>
                  <th className="py-2.5 px-3">Nilai Mutu</th>
                  <th className="py-2.5 px-3">Sebutan Mutu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {GRADE_PREDICATE_RULES.map(rule => (
                  <tr key={rule.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {rule.range10Label} <span className="text-slate-400 text-[10px]">({rule.range100Label})</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block w-8 text-center font-bold px-1.5 py-0.5 rounded text-[11px] border ${rule.bgClass} ${rule.colorClass} ${rule.borderClass}`}>
                        {rule.letter}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {rule.predicate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
