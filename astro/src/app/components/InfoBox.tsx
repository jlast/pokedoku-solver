interface InfoBoxProps {
  children: string;
}

export function InfoBox({ children }: InfoBoxProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-sky-100 px-4 py-3 text-sm">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500">
        <span className="text-sm leading-none font-bold text-white">i</span>
      </div>
      <span className="opacity-90">{children}</span>
    </div>
  );
}
