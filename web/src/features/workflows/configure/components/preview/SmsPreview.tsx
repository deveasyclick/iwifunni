import { formatTime, formatDate } from '../../../utils/preview';
import { getSmsSegmentInfo } from '../../../utils/sms';

interface SmsPreviewProps {
  readonly renderedBody: string | false;
  readonly senderId?: string;
  readonly compact?: boolean;
}

/** Chat bubble for the SMS preview content. */
function SmsBubble({ renderedBody }: Readonly<{ renderedBody: string }>) {
  return (
    <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted/20 px-3.5 py-2.5 text-sm leading-6 text-foreground shadow-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
      {renderedBody}
    </div>
  );
}

export const SmsPreview = ({
  renderedBody,
  senderId,
  compact: _compact = false,
}: SmsPreviewProps) => {
  if (!renderedBody) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
        Start editing to see a live SMS preview.
      </div>
    );
  }

  const timeStr = formatTime();
  const dateStr = formatDate();
  const info = getSmsSegmentInfo(renderedBody);
  const displaySender = senderId || 'SMS';

  return (
    <div className="mx-auto max-w-[375px]">
      <div className="overflow-hidden rounded-[36px] border-[3px] border-border/60 bg-gradient-to-b from-dark/95 to-dark shadow-xl">
        {/* Phone top notch */}
        <div className="relative flex justify-center pt-2.5">
          <div className="h-5 w-28 rounded-b-xl bg-black" />
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-1 pb-1 text-[10px] text-gray-400">
          <span>{timeStr}</span>
          <span className="font-semibold text-white/60">SMS</span>
        </div>

        {/* Chat header */}
        <div className="border-b border-white/5 px-4 py-2.5">
          <p className="text-xs font-semibold text-white/80">{displaySender}</p>
          <p className="text-[10px] text-gray-500">{dateStr}</p>
        </div>

        {/* Chat area */}
        <div className="flex flex-col gap-2 px-3 py-3 min-h-32">
          <SmsBubble renderedBody={renderedBody} />
        </div>

        {/* SMS metadata footer */}
        <div className="border-t border-white/5 px-4 py-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <div className="flex items-center gap-2">
              <span>{info.chars.toLocaleString()} chars</span>
              <span>|</span>
              <span>
                {info.segments} seg{info.segments !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="font-mono">{info.charset}</span>
          </div>
          {info.segments > 1 ? (
            <p className="mt-0.5 text-[9px] text-amber-400/70">
              Will be sent as {info.segments} message segments
            </p>
          ) : null}
          {info.segments >= 3 ? (
            <p className="mt-0.5 text-[9px] text-red-400/70">
              Long SMS — higher cost per segment
            </p>
          ) : null}
        </div>

        {/* Phone home bar */}
        <div className="flex justify-center pb-2.5">
          <div className="h-1 w-28 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
};
