import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

const base = "inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  destructiveGhost:
    "rounded-lg border-2 border-red-300 bg-white px-4 py-2 text-red-700 hover:border-red-400 hover:bg-rose-50 hover:text-red-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
  secondary:
    "rounded-[10px] border-2 border-slate-200 bg-white px-[18px] py-2.5 text-[0.9rem] text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
} as const;

type Variant = keyof typeof variants;

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

interface ActionLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  children: ReactNode;
}

export function ActionButton({ variant = "secondary", className = "", children, ...props }: ActionButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function ActionLink({ variant = "secondary", className = "", children, ...props }: ActionLinkProps) {
  return (
    <a className={`${base} ${variants[variant]} ${className}`.trim()} {...props}>
      {children}
    </a>
  );
}
