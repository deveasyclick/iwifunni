import { Info } from 'lucide-react';
import { getSmsSegmentInfo } from '../utils/sms';

type Props = {
  readonly body: string;
};

/**
 * Live SMS character counter showing char count, segment count, charset
 * (GSM-7 / UCS-2), and a progress bar that changes colour as segments grow.
 */
function barColor(segments: number): string {
  if (segments >= 3) return 'bg-destructive';
  if (segments === 2) return 'bg-amber-500';
  return 'bg-primary';
}

function maxSegmentChars(
  segments: number,
  perSegment: number,
  charset: string,
): number {
  if (segments <= 1) return perSegment;
  return charset === 'GSM-7' ? 153 : 67;
}

export function SmsCharacterCounter({ body }: Props) {
  const info = getSmsSegmentInfo(body);

  const barWidth = Math.min(
    (info.chars /
      maxSegmentChars(info.segments, info.perSegment, info.charset)) *
      100,
    100,
  );

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{info.chars.toLocaleString()} chars</span>
        <span className="text-border">|</span>
        <span>
          {info.segments} segment{info.segments !== 1 && 's'}
        </span>
        <span className="text-border">|</span>
        <span className="font-mono text-[10px]">{info.charset}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-1.5 w-20 rounded-full bg-muted-foreground/20 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor(info.segments)}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {info.segments >= 3 ? (
          <Info className="h-3 w-3 text-destructive shrink-0" />
        ) : null}
      </div>
    </div>
  );
}
