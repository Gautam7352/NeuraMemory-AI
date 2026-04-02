interface FilterBarProps {
  selectedKind: string;
  selectedSource: string;
  searchQuery: string;
  disabled: boolean;
  onKindChange: (kind: string) => void;
  onSourceChange: (source: string) => void;
  onSearchChange: (query: string) => void;
  onClear: () => void;
}

const selectClass =
  'bg-neutral-800 text-gray-200 text-sm rounded-lg border border-gray-600 px-3 py-2 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const FilterBar = ({
  selectedKind,
  selectedSource,
  searchQuery,
  disabled,
  onKindChange,
  onSourceChange,
  onSearchChange,
  onClear,
}: FilterBarProps) => {
  const hasActiveFilter =
    selectedKind !== '' || selectedSource !== '' || searchQuery !== '';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Kind filter */}
      <select
        aria-label="Filter by kind"
        value={selectedKind}
        disabled={disabled}
        onChange={(e) => onKindChange(e.target.value)}
        className={selectClass}
      >
        <option value="">All kinds</option>
        <option value="semantic">semantic</option>
        <option value="bubble">bubble</option>
      </select>

      {/* Source filter */}
      <select
        aria-label="Filter by source"
        value={selectedSource}
        disabled={disabled}
        onChange={(e) => onSourceChange(e.target.value)}
        className={selectClass}
      >
        <option value="">All sources</option>
        <option value="text">text</option>
        <option value="document">document</option>
        <option value="link">link</option>
      </select>

      {/* Text search */}
      <input
        type="text"
        aria-label="Search memories"
        placeholder="Search memories..."
        value={searchQuery}
        disabled={disabled}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-neutral-800 text-gray-200 text-sm rounded-lg border border-gray-600 px-3 py-2 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors placeholder-gray-500 min-w-[200px]"
      />

      {/* Clear filters button — only shown when at least one filter is active */}
      {hasActiveFilter && (
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

export default FilterBar;
