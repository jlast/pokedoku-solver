import { useEffect, useState, type ChangeEvent } from "react";

type ImportMethodTab = "upload" | "paste";

interface PokedexImportPanelProps {
  importJsonText: string;
  importStatus: string | null;
  showImportPanel: boolean;
  onTogglePanel: () => void;
  onImportTextChange: (value: string) => void;
  onImportClick: () => void;
  onUploadChange: (event: ChangeEvent<HTMLInputElement>) => void;
  embedded?: boolean;
  compact?: boolean;
}

export function PokedexImportPanel({
  importJsonText,
  importStatus,
  showImportPanel,
  onTogglePanel,
  onImportTextChange,
  onImportClick,
  onUploadChange,
  embedded = false,
  compact = false,
}: PokedexImportPanelProps) {
  const [activeTab, setActiveTab] = useState<ImportMethodTab>("paste");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const syncActiveTab = (matchesMobile: boolean) => {
      setActiveTab(matchesMobile ? "upload" : "paste");
    };

    syncActiveTab(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncActiveTab(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const exportUrl = "https://api.pokedoku.com/api/user/dex?type=1";
  const contentSpacingClass = compact ? "mt-2" : "mt-3";
  const tabMinWidthClass = compact ? "min-w-[100px]" : "min-w-[112px]";
  const uploadButtonClass = compact ? "h-9 px-3.5 text-[13px]" : "h-10 px-4 text-sm";
  const importButtonClass = compact ? "h-9 px-3.5 text-[13px]" : "h-10 px-4 text-sm";

  const panelContent = showImportPanel ? (
        <>
          <div className={`${contentSpacingClass} inline-flex rounded-xl bg-[var(--bg)] p-1`} role="tablist" aria-label="Choose import method">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "upload"}
              className={`inline-flex ${tabMinWidthClass} cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-[13px] font-semibold transition ${activeTab === "upload" ? "bg-[var(--code-bg)] text-[var(--text-h)] shadow-sm" : "text-[var(--text)] hover:text-[var(--text-h)]"}`}
              onClick={() => setActiveTab("upload")}
            >
              Upload file
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "paste"}
              className={`inline-flex ${tabMinWidthClass} cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-[13px] font-semibold transition ${activeTab === "paste" ? "bg-[var(--code-bg)] text-[var(--text-h)] shadow-sm" : "text-[var(--text)] hover:text-[var(--text-h)]"}`}
              onClick={() => setActiveTab("paste")}
            >
              Paste data
            </button>
          </div>

          {activeTab === "upload" ? (
            <>
              <p className={`mb-0 ${contentSpacingClass} text-xs text-[var(--text)]`}>
                Open
                {" "}
                <a
                  href={exportUrl}
                  download="pokedoku-dex.json"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--text-h)] underline decoration-slate-400 underline-offset-2 hover:text-[var(--text-h)]"
                >
                  api.pokedoku.com/api/user/dex?type=1
                </a>
                {" "}
                to download your Pokedoku progress file, then upload it here.
              </p>
              <div className={`${contentSpacingClass} flex flex-wrap items-center gap-2`}>
                <label className={`inline-flex cursor-pointer items-center rounded-lg bg-slate-900 font-semibold text-white transition hover:bg-slate-800 ${uploadButtonClass}`}>
                  Upload progress file
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={onUploadChange}
                    className="sr-only"
                  />
                </label>
                <p className="m-0 text-xs text-[var(--text)]">Choose the file you just downloaded from Pokedoku.</p>
              </div>
            </>
          ) : (
            <>
              <p className={`mb-0 ${contentSpacingClass} text-xs text-[var(--text)]`}>
                Open
                {" "}
                <a
                  href={exportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--text-h)] underline decoration-slate-400 underline-offset-2 hover:text-[var(--text-h)]"
                >
                  api.pokedoku.com/api/user/dex?type=1
                </a>
                , copy everything on the page, then paste it below.
              </p>
              <textarea
                value={importJsonText}
                onChange={(event) => onImportTextChange(event.target.value)}
                placeholder="Paste your Pokedoku progress here"
                className={`mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--text-h)] outline-none ring-slate-300 transition focus:ring ${compact ? "h-24" : "h-28"}`}
              />
            </>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {activeTab === "paste" ? (
              <button
                type="button"
                onClick={onImportClick}
                className={`rounded-lg bg-slate-900 font-semibold text-white transition hover:bg-slate-800 ${importButtonClass}`}
              >
                Import progress
              </button>
            ) : null}
            {importStatus ? <p className="m-0 text-xs text-[var(--text)]">{importStatus}</p> : null}
          </div>
        </>
      ) : null;

  if (embedded) {
    return panelContent;
  }

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-4">
      <button
        type="button"
        onClick={onTogglePanel}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={showImportPanel}
      >
        <span className="text-sm font-semibold text-[var(--text-h)]">Import Pokedoku progress</span>
        <span className="text-xs font-semibold text-[var(--text)]">{showImportPanel ? "Hide" : "Show"}</span>
      </button>

      {panelContent}
    </div>
  );
}
