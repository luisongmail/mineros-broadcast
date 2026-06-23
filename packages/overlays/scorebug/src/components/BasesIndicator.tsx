import { colors } from '@mineros/design-system';

import type { ScorebugGame } from '../types';

export interface BasesIndicatorProps {
  bases: ScorebugGame['bases'];
}

function BaseDiamond({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="h-3 w-3 rotate-45 border border-white/45"
      style={{ backgroundColor: active ? colors.minerosGold : 'transparent' }}
    />
  );
}

export function BasesIndicator({ bases }: BasesIndicatorProps) {
  return (
    <div aria-label="Bases" className="grid grid-cols-3 grid-rows-2 gap-1">
      <span className="col-start-2 row-start-1 flex justify-center">
        <BaseDiamond active={bases.second} />
      </span>
      <span className="col-start-1 row-start-2 flex justify-center">
        <BaseDiamond active={bases.third} />
      </span>
      <span className="col-start-3 row-start-2 flex justify-center">
        <BaseDiamond active={bases.first} />
      </span>
    </div>
  );
}
