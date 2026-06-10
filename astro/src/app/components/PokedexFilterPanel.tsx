import { ActionButton } from './shared/ActionButton';

interface PokedexFilterPanelProps {
  showMissingOnly: boolean;
  onToggleMyPokedexFilter: () => void;
  isSavingFilterPreference: boolean;
  showSpoilerToggle?: boolean;
  spoilerModeEnabled?: boolean;
  onToggleSpoilerMode?: () => void;
  isSavingSpoilerPreference?: boolean;
  showSaveActions?: boolean;
  onMarkOwned?: () => void;
  onUndoMarkOwned?: () => void;
  disableMarkOwned?: boolean;
  disableUndoMarkOwned?: boolean;
  isMarkingOwned?: boolean;
  isUndoingMarkOwned?: boolean;
}

function ToggleRow({
  label,
  checked,
  onClick,
  disabled,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-[190px_auto] items-center justify-center gap-3">
      <div className="text-left">
        <p className="m-0 text-sm font-medium text-[var(--text-h)]">{label}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onClick}
        disabled={disabled}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
          checked ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--border)] bg-slate-300'
        } ${disabled ? 'opacity-70' : ''}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-[var(--bg)] shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export function PokedexFilterPanel({
  showMissingOnly,
  onToggleMyPokedexFilter,
  isSavingFilterPreference,
  showSpoilerToggle = false,
  spoilerModeEnabled = false,
  onToggleSpoilerMode,
  isSavingSpoilerPreference = false,
  showSaveActions = false,
  onMarkOwned,
  onUndoMarkOwned,
  disableMarkOwned = false,
  disableUndoMarkOwned = false,
  isMarkingOwned = false,
  isUndoingMarkOwned = false,
}: PokedexFilterPanelProps) {
  return (
    <section className="mb-3 w-full max-w-[500px] rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-3 text-left">
      <div className="flex flex-col items-center gap-3 text-center">
        <div>
          <p className="m-0 text-sm font-semibold text-[var(--text-h)]">My Pokedex &amp; Answer Filters</p>
          <p className="m-0 text-xs text-[var(--text)]">Control which answers you see and when you see them.</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ToggleRow
            label="Suggest new Pokémon"
            checked={showMissingOnly}
            onClick={onToggleMyPokedexFilter}
            disabled={isSavingFilterPreference}
          />
          {showSpoilerToggle && onToggleSpoilerMode ? (
            <ToggleRow
              label="Avoid spoilers"
              checked={spoilerModeEnabled}
              onClick={onToggleSpoilerMode}
              disabled={isSavingSpoilerPreference}
            />
          ) : null}
        </div>
      </div>
      {showSaveActions && showMissingOnly ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <ActionButton onClick={onMarkOwned} variant="success" disabled={disableMarkOwned}>
            {isMarkingOwned ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Saving in My Pokedex...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Save picks in My Pokedex
              </>
            )}
          </ActionButton>
          <ActionButton onClick={onUndoMarkOwned} variant="secondary" disabled={disableUndoMarkOwned}>
            {isUndoingMarkOwned ? 'Undoing...' : 'Undo'}
          </ActionButton>
        </div>
      ) : null}
    </section>
  );
}
