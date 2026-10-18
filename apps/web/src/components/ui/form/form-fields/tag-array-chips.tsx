import { LuX } from 'react-icons/lu';

interface iTagArrayChipsProps {
  disabled?: boolean;
  onRemove: (value: string) => unknown;
  values: string[];
}

export function TagArrayChips({ disabled, onRemove, values }: iTagArrayChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <div key={value} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <span className="text-xs font-medium text-foreground">{value}</span>
          <button
            type="button"
            onClick={() => onRemove(value)}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label={`Remove ${value}`}
          >
            <LuX className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
