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

  const mastercadLinkClass = compact
    ? 'inline-flex h-8 w-[clamp(72px,24vw,150px)] shrink-0 items-center justify-center transition-transform hover:scale-[1.02] sm:h-10 sm:w-[150px]'
    : 'inline-flex h-8 w-[clamp(82px,28vw,180px)] shrink-0 items-center justify-center transition-transform hover:scale-[1.02] sm:h-12 sm:w-[180px] lg:h-14 lg:w-[210px]';

  const mastercadImageClass = compact
    ? 'h-6 w-full object-contain sm:h-8'
    : 'h-7 w-full object-contain sm:h-10 lg:h-12';

  const githubLinkClass = isDark
    ? 'inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-white/90 shadow-sm backdrop-blur-md transition-colors hover:border-cyan-300/40 hover:bg-white/10 sm:gap-2 sm:px-3 sm:py-1.5'
    : 'inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300/70 bg-white/25 px-2 py-1 text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white/50 sm:gap-1.5 sm:px-2.5 sm:py-1';

  const githubIconClass = 'h-3.5 w-3.5 sm:h-4 sm:w-4';
  const githubNameClass = compact ? 'text-[10px] font-semibold sm:text-[11px]' : 'text-[10px] font-semibold sm:text-xs';
  const githubMetaClass = compact ? 'text-[8px] text-slate-400 sm:text-[9px]' : 'text-[8px] text-slate-400 sm:text-[10px]';
  const logoLayerClass = 'footer-logo-layer';

  return (
    <div className="relative z-30 flex w-full flex-col items-center justify-center gap-2.5">
      <span className={isDark ? 'text-xs font-normal text-slate-400' : 'text-[10px] text-slate-500'}>
        Product by
      </span>

      <div className="relative z-30 flex w-full flex-nowrap items-center justify-center gap-1 sm:gap-2.5">
        <a
          href="https://www.tiktok.com/@mastercad.id"
          target="_blank"
          rel="noopener noreferrer"
          className={`${mastercadLinkClass} ${logoLayerClass}`}
          title="MasterCAD di TikTok"
        >
          <img
            src={isDark ? '/mastercad-logo-light.png' : '/mastercad-logo.png'}
            alt="MasterCAD"
            className={mastercadImageClass}
          />
        </a>

        <a
          href="https://github.com/dev-byreza"
          target="_blank"
          rel="noopener noreferrer"
          className={githubLinkClass}
          title="GitHub dev-byreza"
        >
          <svg className={githubIconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
          </svg>
          <span className={githubNameClass}>dev-byreza</span>
          <span className={githubMetaClass}>GitHub</span>
        </a>

        <span
          className={`${compact
            ? 'inline-flex h-8 w-[clamp(58px,20vw,120px)] shrink-0 items-center justify-center sm:h-9 sm:w-[120px]'
            : 'inline-flex h-8 w-[clamp(62px,22vw,130px)] shrink-0 items-center justify-center sm:h-10 sm:w-[130px] lg:h-12 lg:w-[155px]'} ${logoLayerClass}`}
          title="RCAD Tutor"
        >
          <img
            src="/rcad-tutor-logo-light.png"
            alt="RCAD Tutor"
            className={compact ? 'h-5 w-full object-contain sm:h-7' : 'h-6 w-full object-contain sm:h-8 lg:h-10'}
            style={isDark ? undefined : { filter: 'brightness(0)' }}
          />
        </span>
      </div>
    </div>
  );
};
