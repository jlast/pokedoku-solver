import type { ChangeEvent } from "react";

interface PokedexImportPanelProps {
  importJsonText: string;
  importStatus: string | null;
  showImportPanel: boolean;
  onTogglePanel: () => void;
  onImportTextChange: (value: string) => void;
  onImportClick: () => void;
  onUploadChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function PokedexImportPanel({
  importJsonText,
  importStatus,
  showImportPanel,
  onTogglePanel,
  onImportTextChange,
  onImportClick,
  onUploadChange,
}: PokedexImportPanelProps) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        onClick={onTogglePanel}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={showImportPanel}
      >
        <span className="text-sm font-semibold text-slate-800">Import Pokedoku Pokedex JSON</span>
        <span className="text-xs font-semibold text-slate-500">{showImportPanel ? "Hide" : "Show"}</span>
      </button>

      {showImportPanel ? (
        <>
          <p className="mb-0 mt-2 text-xs text-slate-600">
            To export your Pokedoku dex JSON, open {" "}
            <a
              href="https://api.pokedoku.com/api/user/dex?type=1"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-800 underline decoration-slate-400 underline-offset-2 hover:text-slate-900"
            >
              api.pokedoku.com/api/user/dex?type=1
            </a>
            , copy the full JSON response, then paste it below.
          </p>
          <textarea
            value={importJsonText}
            onChange={(event) => onImportTextChange(event.target.value)}
            placeholder='Paste JSON like {"type":"DAILY_MODE","prestige":0,"entries":[...]}'
            className="mt-2 h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 outline-none ring-slate-300 transition focus:ring"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onImportClick}
              className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Import Pokedex JSON
            </button>
            <label className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-300">
              Upload JSON File
              <input
                type="file"
                accept=".json,application/json"
                onChange={onUploadChange}
                className="sr-only"
              />
            </label>
            {importStatus ? <p className="m-0 text-xs text-slate-600">{importStatus}</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
