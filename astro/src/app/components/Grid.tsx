import type { ChangeEvent, CSSProperties } from 'react';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import {
  FILTER_CATEGORIES,
  FILTER_KEY_TO_CONSTRAINT_CATEGORY,
  findConstraintOption,
  type Constraint,
} from '../../../../lib/shared/filters';
import { trackEvent } from '../../../../lib/browser/analytics';
import { CategoryBadgeLink } from './shared/CategoryBadgeLink';
import { constraintToParsedCategory, getConstraintColor, getPokemonKey, getPokemonKeyId } from '../lib/pokemonGrid';

interface GridProps {
  cells: (Pokemon | null)[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  possiblePokemon: Pokemon[][][];
  fallbackOwnedCells?: (Pokemon | null)[][];
  ownedPokemonKeyIds?: Set<number>;
  shinyPokemonKeyIds?: Set<number>;
  suggestedPokemonKeys?: (string | null)[][];
  swapOptionCounts?: number[][];
  selectedCell: [number, number] | null;
  editable?: boolean;
  showSuggestedMeta?: boolean;
  onCellClick: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
  onSwapClick?: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
  onConstraintChange: (index: number, isRow: boolean, option: { value: string; category: string } | null) => void;
}

function ConstraintSelect({
  constraint,
  index,
  isRow,
  onChange,
}: {
  constraint: Constraint | null;
  index: number;
  isRow: boolean;
  onChange: GridProps['onConstraintChange'];
}) {
  const selectedValue = constraint ? `${constraint.category}:${constraint.value}` : '';

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const option = findConstraintOption(event.target.value);
    onChange(index, isRow, option);

    if (option) {
      trackEvent(isRow ? 'change_row_constraint' : 'change_col_constraint', {
        position: `${isRow ? 'row' : 'col'}_${index}`,
        category: option.category,
        value: option.value,
      });
    }
  }

  return (
    <select
      className={`w-full cursor-pointer rounded-md border-2 border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-center text-[10px] text-[var(--text-h)] focus:border-[var(--accent)] focus:outline-none md:text-xs ${isRow ? 'h-full' : ''}`}
      value={selectedValue}
      onChange={handleChange}
      style={{ borderColor: getConstraintColor(constraint) }}
    >
      <option value="">…</option>
      {FILTER_CATEGORIES.map((category) => (
        <optgroup key={category.key} label={category.label}>
          {category.options.map((option) => (
            <option
              key={`${category.key}-${option.name}`}
              value={`${FILTER_KEY_TO_CONSTRAINT_CATEGORY[category.key]}:${option.name}`}
            >
              {option.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function ConstraintDisplay({ constraint, isRow = false }: { constraint: Constraint | null; isRow?: boolean }) {
  const parsed = constraintToParsedCategory(constraint);

  return (
    <div
      className={`flex w-full items-center justify-center rounded-md bg-[var(--bg)] px-2 py-1.5 text-center text-[10px] font-medium text-[var(--text-h)] md:text-xs ${isRow ? 'h-full' : ''}`}
      style={{ borderColor: getConstraintColor(constraint) }}
    >
      {parsed ? <CategoryBadgeLink parsed={parsed} href={null} stacked /> : <span>{constraint?.value || '-'}</span>}
    </div>
  );
}

function OwnedPokemonDisplay({
  pokemon,
  isShiny,
  opacityClass = 'opacity-35',
}: {
  pokemon: Pokemon;
  isShiny: boolean;
  opacityClass?: string;
}) {
  return (
    <>
      <span className="absolute left-0 top-0 z-[2] inline-flex items-center gap-1 rounded-br-lg rounded-tl-sm border border-amber-300 bg-amber-200 px-[6px] py-px text-[8px] font-bold uppercase leading-[14px] text-amber-950 shadow-[0_1px_3px_rgba(15,23,42,0.14)] [html[data-theme='dark']_&]:border-amber-600 [html[data-theme='dark']_&]:bg-amber-900/20 [html[data-theme='dark']_&]:text-amber-100">
        <span aria-hidden="true" className="text-[9px] leading-none">✓</span>
        <span>{isShiny ? 'Shiny' : 'Owned'}</span>
      </span>
      {pokemon.sprite ? (
        <img
          src={pokemon.sprite}
          alt=""
          className={`absolute left-[22px] top-5 z-0 h-[95px] w-[95px] object-contain max-[768px]:left-2 max-[768px]:top-[14px] max-[768px]:h-[68px] max-[768px]:w-[68px] ${opacityClass}`}
        />
      ) : null}
      <div className="relative z-[1] m-1 inline-flex flex-col items-center gap-px rounded-md px-2 py-1 text-center">
        <span className="text-[9px] font-semibold leading-[1.05] text-[var(--text-h)]">{pokemon.name}</span>
      </div>
    </>
  );
}

function getCellStateClasses({
  isSelected,
  isFilled,
  isOwnedCell,
  fallbackOwned,
}: {
  isSelected: boolean;
  isFilled: boolean;
  isOwnedCell: boolean;
  fallbackOwned: Pokemon | null;
}): string {
  if (isSelected) {
    return isFilled
      ? 'bg-[var(--accent-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]'
      : 'bg-[var(--code-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]';
  }
  if (isOwnedCell) return 'bg-[var(--code-bg)] hover:bg-[var(--accent-bg)]';
  if (fallbackOwned) return "bg-[var(--code-bg)] [html[data-theme='dark']_&]:bg-[var(--code-bg-dark)]";
  if (isFilled) return 'bg-[var(--bg)] hover:bg-[var(--accent-bg)]';
  return 'bg-[var(--code-bg)] hover:bg-[var(--accent-bg)]';
}

function GridCell({
  rowIndex,
  colIndex,
  cell,
  possible,
  rowConstraint,
  colConstraint,
  fallbackOwned,
  isOwnedCell,
  isShinyCell,
  isSelected,
  showSuggestedMeta,
  suggestedPokemonKey,
  swapOptionCount,
  onCellClick,
  onSwapClick,
}: {
  rowIndex: number;
  colIndex: number;
  cell: Pokemon | null;
  possible: Pokemon[];
  rowConstraint: Constraint | null;
  colConstraint: Constraint | null;
  fallbackOwned: Pokemon | null;
  isOwnedCell: boolean;
  isShinyCell: boolean;
  isSelected: boolean;
  showSuggestedMeta: boolean;
  suggestedPokemonKey?: string | null;
  swapOptionCount: number;
  onCellClick: GridProps['onCellClick'];
  onSwapClick?: GridProps['onSwapClick'];
}) {
  const hasConstraint = Boolean(rowConstraint || colConstraint);
  const isSuggested = Boolean(showSuggestedMeta && cell && suggestedPokemonKey === getPokemonKey(cell));
  const suggestedLabel = cell
    ? cell.dexDifficulty === 'Nightmare'
      ? 'Nightmare'
      : cell.id !== cell.formId
        ? 'Alt Form'
        : ''
    : '';
  const isFilled = Boolean(cell);
  const cellStateClasses = getCellStateClasses({ isSelected, isFilled, isOwnedCell, fallbackOwned });

  return (
    <div
      className={`relative flex h-[154px] w-[140px] cursor-pointer flex-col items-center justify-end overflow-hidden rounded border-2 border-transparent transition-all max-[768px]:h-[110px] max-[768px]:w-[90px] ${cellStateClasses}`}
      onClick={(event) => {
        trackEvent('click_cell', {
          position: `${rowIndex}_${colIndex}`,
          has_constraint: hasConstraint ? 'true' : 'false',
          has_pokemon: cell ? 'true' : 'false',
        });
        onCellClick(rowIndex, colIndex, event.currentTarget);
      }}
      style={{
        borderColor: hasConstraint ? getConstraintColor(rowConstraint || colConstraint) : undefined,
      } as CSSProperties}
    >
      {cell ? (
        isOwnedCell ? (
          <OwnedPokemonDisplay pokemon={cell} isShiny={isShinyCell} />
        ) : (
          <>
            {showSuggestedMeta ? (
              <>
                {isSuggested && suggestedLabel ? (
                  <span
                    className={`absolute left-0 top-0 z-[2] rounded-br-lg rounded-tl-sm px-[5px] py-px text-[7px] font-bold uppercase leading-[14px] tracking-[0.02em] text-white ${cell.dexDifficulty === 'Nightmare' ? 'bg-[#9b59b6]' : 'bg-[#2574f5]'}`}
                  >
                    {suggestedLabel}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 z-[2] inline-flex h-12 w-[42px] cursor-pointer flex-col items-center justify-center gap-px rounded-[14px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] shadow-[0_2px_6px_rgba(15,23,42,0.18)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-1 max-[768px]:right-[3px] max-[768px]:top-[14px] max-[768px]:h-[34px] max-[768px]:w-[30px] max-[768px]:rounded-xl"
                  aria-label={`Swap ${cell.name} (${swapOptionCount} options)`}
                  onClick={(event) => {
                    event.stopPropagation();
                    const anchorElement = event.currentTarget.parentElement as HTMLDivElement | null;
                    (onSwapClick ?? onCellClick)(rowIndex, colIndex, anchorElement);
                  }}
                >
                  <span className="text-[18px] leading-none max-[768px]:text-[13px]">⇄</span>
                  <span className="text-sm font-bold leading-none max-[768px]:text-[11px]">{swapOptionCount}</span>
                </button>
              </>
            ) : null}
            {cell.sprite ? (
              <img
                src={cell.sprite}
                alt=""
                className="absolute left-[22px] top-5 z-0 h-[95px] w-[95px] object-contain max-[768px]:left-2 max-[768px]:top-[14px] max-[768px]:h-[68px] max-[768px]:w-[68px]"
              />
            ) : null}
            <div className={`relative z-[1] m-1 inline-flex flex-col items-center gap-px rounded-md px-2 py-1 text-center ${isSuggested ? 'm-0.5 px-1.5 py-[3px]' : ''}`}>
              <span className="text-[9px] font-semibold leading-[1.05] text-[var(--text-h)]">{cell.name}</span>
            </div>
          </>
        )
      ) : possible.length === 0 ? (
        fallbackOwned ? (
          <OwnedPokemonDisplay pokemon={fallbackOwned} isShiny={false} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <span className={`text-[18px] font-bold max-[768px]:text-[14px] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}>No options yet</span>
            <span className={`text-[0.58rem] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}>Tap to check other squares</span>
          </div>
        )
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-0.5">
          <span className="text-[26px] font-bold text-[var(--text-h)] max-[768px]:text-[20px]">{possible.length}</span>
          <span className={`text-[0.6rem] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'} opacity-80`}>Tap to explore</span>
        </div>
      )}
    </div>
  );
}

export function Grid({
  cells,
  rowConstraints,
  colConstraints,
  possiblePokemon,
  fallbackOwnedCells,
  ownedPokemonKeyIds,
  shinyPokemonKeyIds,
  suggestedPokemonKeys,
  swapOptionCounts,
  selectedCell,
  editable = true,
  showSuggestedMeta = false,
  onCellClick,
  onSwapClick,
  onConstraintChange,
}: GridProps) {
  function isUsedElsewhere(pokemon: Pokemon, rowIndex: number, colIndex: number): boolean {
    const keyId = getPokemonKeyId(pokemon);
    return cells.some((row, currentRowIndex) =>
      row.some(
        (currentCell, currentColIndex) =>
          currentCell &&
          (currentRowIndex !== rowIndex || currentColIndex !== colIndex) &&
          getPokemonKeyId(currentCell) === keyId,
      ),
    );
  }

  return (
    <div className="mb-3 flex flex-col items-center">
      <div className="mb-1 flex gap-1">
        <div className="flex w-[140px] flex-col items-center justify-center max-[768px]:w-[70px]" />
        {colConstraints.map((constraint, colIndex) => (
          <div key={colIndex} className="flex w-[143px] items-stretch max-[768px]:w-[90px]">
            {editable ? (
              <ConstraintSelect constraint={constraint} index={colIndex} isRow={false} onChange={onConstraintChange} />
            ) : (
              <ConstraintDisplay constraint={constraint} />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        <div className="flex flex-col gap-1">
          {rowConstraints.map((constraint, rowIndex) => (
            <div key={rowIndex} className="flex h-[157px] w-[140px] items-stretch max-[768px]:h-[112px] max-[768px]:w-[70px]">
              {editable ? (
                <ConstraintSelect constraint={constraint} index={rowIndex} isRow={true} onChange={onConstraintChange} />
              ) : (
                <ConstraintDisplay constraint={constraint} isRow />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 rounded border-[3px] border-[var(--border)] bg-[var(--border)] [html[data-theme='dark']_&]:border-slate-500 [html[data-theme='dark']_&]:bg-slate-800">
          {cells.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((cell, colIndex) => {
                const isSelected = selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex;
                const possible = possiblePokemon[rowIndex][colIndex];
                const fallbackCandidate = fallbackOwnedCells?.[rowIndex]?.[colIndex] ?? null;
                const fallbackOwned = fallbackCandidate && !isUsedElsewhere(fallbackCandidate, rowIndex, colIndex)
                  ? fallbackCandidate
                  : null;
                const isOwnedCell = cell
                  ? (ownedPokemonKeyIds?.has(getPokemonKeyId(cell)) ?? false) && !isUsedElsewhere(cell, rowIndex, colIndex)
                  : false;
                const isShinyCell = cell ? shinyPokemonKeyIds?.has(getPokemonKeyId(cell)) ?? false : false;
                const swapOptionCount = swapOptionCounts?.[rowIndex]?.[colIndex] ?? possible.length;

                return (
                  <GridCell
                    key={colIndex}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    cell={cell}
                    possible={possible}
                    rowConstraint={rowConstraints[rowIndex]}
                    colConstraint={colConstraints[colIndex]}
                    fallbackOwned={fallbackOwned}
                    isOwnedCell={isOwnedCell}
                    isShinyCell={isShinyCell}
                    isSelected={isSelected}
                    showSuggestedMeta={showSuggestedMeta}
                    suggestedPokemonKey={suggestedPokemonKeys?.[rowIndex]?.[colIndex]}
                    swapOptionCount={swapOptionCount}
                    onCellClick={onCellClick}
                    onSwapClick={onSwapClick}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
