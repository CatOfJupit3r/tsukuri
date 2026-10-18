import { Button } from '#~/components/ui/button/button';

interface iFormDraftRecoveryProps {
  isAvailable: boolean;
  onRestore: () => unknown;
  onDiscard: () => unknown;
}

export function FormDraftRecovery({ isAvailable, onRestore, onDiscard }: iFormDraftRecoveryProps) {
  if (!isAvailable) return null;

  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
      <span>Unsaved changes from this account are available on this device.</span>
      <Button type="button" size="sm" onClick={onRestore}>
        Restore draft
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
        Discard draft
      </Button>
    </div>
  );
}
