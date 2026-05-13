import type { ReactNode } from "react";

interface ContentSectionProps {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}

export function ContentSection({ children, className = "", narrow = true }: ContentSectionProps) {
  const width = narrow ? "max-w-[760px]" : "w-full";

  return <section className={`mx-auto mt-8 px-1 ${width} ${className}`.trim()}>{children}</section>;
}
