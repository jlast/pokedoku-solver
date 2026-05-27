export const actionBaseClassName = 'inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const actionVariantClassNames = {
  destructiveGhost:
    'rounded-lg border-2 border-red-300 bg-[var(--bg)] px-4 py-2 text-red-700 hover:border-red-400 hover:bg-rose-50 hover:text-red-800 disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--code-bg)] disabled:text-slate-400',
  secondary:
    'rounded-[10px] border-2 border-[var(--border)] bg-[var(--bg)] px-[18px] py-2.5 text-[0.9rem] text-[var(--text)] hover:border-[var(--border)] hover:bg-[var(--code-bg)] disabled:cursor-not-allowed disabled:opacity-50',
  success:
    'rounded-[10px] border-2 border-emerald-700 bg-emerald-700 px-[18px] py-2.5 text-[0.9rem] text-white hover:border-emerald-600 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--code-bg)] disabled:text-[var(--text)]',
} as const;

export type ActionVariant = keyof typeof actionVariantClassNames;
