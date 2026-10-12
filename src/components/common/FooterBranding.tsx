import React from 'react';

interface FooterBrandingProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
}

export const FooterBranding: React.FC<FooterBrandingProps> = ({
  theme = 'dark',
  compact = false,
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="relative z-30 flex w-full items-center justify-center py-0.5">
      <div className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-center ${compact ? 'text-[11px]' : 'text-xs'}`}>
        <span className={`font-semibold tracking-wide ${isDark ? 'text-slate-300 dark:text-slate-200' : 'text-slate-700 dark:text-slate-200'}`}>
          Politeknik Sorowako
        </span>
        <span className={`${isDark ? 'text-slate-600 dark:text-slate-600' : 'text-slate-300 dark:text-slate-600'}`}>•</span>
        <span className={`font-medium ${isDark ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
          Portal Praktik &amp; Penilaian OBE
        </span>
      </div>
    </div>
  );
};
