import type { PastRegistration } from '@/components/data/~mock-register';

import { FilterPopup, type FilterState } from './filter-popup';
import { MatchingPopup } from './popup';
import type { UnifiedRegistration } from './result-types';

export function AssignPopupOverlay({
  selectedRegistration,
  availablePeople,
  label,
  onClose,
  onMatch,
}: {
  selectedRegistration: UnifiedRegistration | null;
  availablePeople: PastRegistration[];
  label: string;
  onClose: () => void;
  onMatch: (personId: string) => void;
}) {
  if (!selectedRegistration) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()}>
        <MatchingPopup onClose={onClose} onMatch={onMatch} availablePeople={availablePeople} tabLabel={label} />
      </div>
    </div>
  );
}

export function FilterPopupOverlay({
  open,
  initialState,
  onClose,
  onApply,
}: {
  open: boolean;
  initialState?: FilterState;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()}>
        <FilterPopup onClose={onClose} onApply={onApply} initialState={initialState} />
      </div>
    </div>
  );
}
