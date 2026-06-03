'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { delayUnits } from '@/app/dashboard/components/workflows/constants';
import {
  parseDelayDuration,
  formatDelayDuration,
} from '@/app/dashboard/components/workflows/utils/duration';
import type { BuilderNodeDraft } from '@/app/dashboard/components/workflows/types/draft';
import type { DelayConfigProps } from '@/app/dashboard/components/workflows/types/ui';

export const DelayConfig = ({ draft, updateNodeDraft }: DelayConfigProps) => {
  const selectedDelayParts = parseDelayDuration(draft.duration);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3">
      <div>
        <label className="mb-2 block text-sm font-medium">Delay amount</label>
        <Input
          value={selectedDelayParts.amount}
          onChange={(event) =>
            updateNodeDraft(
              draft.id,
              (d): BuilderNodeDraft => ({
                ...d,
                duration: formatDelayDuration(
                  event.target.value,
                  selectedDelayParts.unit,
                ),
              }),
            )
          }
          inputMode="decimal"
          placeholder="5"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Unit</label>
        <Select
          value={selectedDelayParts.unit}
          onValueChange={(unit) =>
            updateNodeDraft(
              draft.id,
              (d): BuilderNodeDraft => ({
                ...d,
                duration: formatDelayDuration(
                  selectedDelayParts.amount,
                  unit as typeof selectedDelayParts.unit,
                ),
              }),
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {delayUnits.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
