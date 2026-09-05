// Status Badges according to PRD Section 67

import React from 'react';

export type StatusType =
  | 'UPCOMING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'LEARNING_COMPLETE'
  | 'PROJECT_SUBMITTED'
  | 'ASSESSED'
  | 'PUBLISHED'
  | 'ELIGIBLE'
  | 'INELIGIBLE'
  | 'REMEDIAL'
  | 'LULUS'
  | 'BELUM_LULUS'
  | 'DRAFT';

interface BadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold'
  }[size];

  switch (status) {
    case 'ACTIVE':
    case 'Aktif':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          {label || 'Aktif'}
        </span>
      );

    case 'UPCOMING':
    case 'Akan Datang':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          {label || 'Akan Datang'}
        </span>
      );

    case 'COMPLETED':
    case 'Selesai':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          {label || 'Selesai'}
        </span>
      );

    case 'NOT_STARTED':
    case 'Belum Mulai':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}>
          {label || 'Belum Mulai'}
        </span>
      );

    case 'IN_PROGRESS':
    case 'Sedang Berjalan':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {label || 'Sedang Berjalan'}
        </span>
      );

    case 'LEARNING_COMPLETE':
    case 'Pembelajaran Selesai':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
          {label || 'Pembelajaran Selesai (100%)'}
        </span>
      );

    case 'PROJECT_SUBMITTED':
    case 'Project Dikumpulkan':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          {label || 'Project Dikumpulkan'}
        </span>
      );

    case 'ASSESSED':
    case 'Sudah Dinilai':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-blue-50 text-blue-800 border border-blue-300 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          {label || 'Sudah Dinilai (Draft)'}
        </span>
      );

    case 'PUBLISHED':
    case 'Dipublikasikan':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          {label || 'Dipublikasikan'}
        </span>
      );

    case 'INELIGIBLE':
    case 'Kehadiran Tidak Memenuhi':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-300 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          {label || 'Kehadiran <75% (Tugas Tambahan)'}
        </span>
      );

    case 'LULUS':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 ${sizeClasses}`}>
          ✓ {label || 'Lulus'}
        </span>
      );

    case 'BELUM_LULUS':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-rose-100 text-rose-800 border border-rose-300 ${sizeClasses}`}>
          ✕ {label || 'Belum Lulus'}
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          {label || status}
        </span>
      );
  }
};
