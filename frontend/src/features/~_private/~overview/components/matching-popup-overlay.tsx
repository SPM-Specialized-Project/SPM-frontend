import { MatchingPopup } from './popup';
import type { PastRegistration } from '@/components/data/~mock-register';
import type { UnifiedRegistration } from './result-types';

export function MatchingPopupOverlay({
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
