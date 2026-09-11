import React from 'react';

interface FooterBrandingProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  showDiscord?: boolean;
  showGithubAudience?: boolean;
}

export const FooterBranding: React.FC<FooterBrandingProps> = ({
  theme = 'dark',
  compact = false,
  showDiscord = false,
  showGithubAudience = false,
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2.5">
      <span className={isDark ? 'text-xs font-normal text-slate-400' : 'text-[10px] text-slate-400'}>
        Product by
      </span>

      <div className="flex w-full flex-wrap items-center justify-center gap-2.5">
        <a
          href="https://www.tiktok.com/@mastercad.id"
          target="_blank"
          rel="noopener noreferrer"
          className={compact
            ? 'inline-flex h-10 w-[150px] items-center justify-center transition-transform hover:scale-[1.02]'
            : 'inline-flex h-12 w-[180px] items-center justify-center transition-transform hover:scale-[1.02] sm:h-14 sm:w-[210px]'}
          title="MasterCAD di TikTok"
        >
          <img
            src={isDark ? '/mastercad-logo-light.png' : '/mastercad-logo.png'}
            alt="MasterCAD"
            className={compact ? 'h-8 w-full object-contain' : 'h-10 w-full object-contain sm:h-12'}
          />
        </a>

        <a
          href="https://github.com/dev-byreza"
          target="_blank"
          rel="noopener noreferrer"
          className={isDark
            ? 'inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-white shadow-sm transition-all hover:bg-slate-700/90'
            : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 shadow-sm transition-all hover:bg-slate-100'}
          title="GitHub"
        >
          <img
            src="https://github.com/dev-byreza.png"
            alt="dev-byreza"
            className={compact ? 'h-4 w-4 rounded-full object-cover ring-1 ring-slate-300' : 'h-5 w-5 rounded-full object-cover ring-1 ring-white/20'}
            onError={(event) => {
              event.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80';
            }}
          />
          <span className={compact ? 'text-[11px] font-semibold' : 'text-xs font-semibold'}>dev-byreza</span>
          {showGithubAudience ? (
            <>
              <span className="text-[11px] font-medium text-slate-400">32.9K</span>
              <svg className="ml-0.5 h-4 w-4 fill-current text-red-500" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </>
          ) : (
            <span className={compact ? 'text-[9px] text-slate-400' : 'text-[10px] text-slate-400'}>GitHub</span>
          )}
        </a>

        <span
          className={compact
            ? 'inline-flex h-9 w-[120px] items-center justify-center'
            : 'inline-flex h-10 w-[130px] items-center justify-center sm:h-12 sm:w-[155px]'}
          title="RCAD Tutor"
        >
          <img
            src="/rcad-tutor-logo-light.png"
            alt="RCAD Tutor"
            className={compact ? 'h-7 w-full object-contain' : 'h-8 w-full object-contain sm:h-10'}
            style={isDark ? undefined : { filter: 'brightness(0)' }}
          />
        </span>

        {showDiscord && (
          <a
            href="https://discord.gg"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-slate-300 transition-colors hover:text-white"
            title="Discord"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 1 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
};
