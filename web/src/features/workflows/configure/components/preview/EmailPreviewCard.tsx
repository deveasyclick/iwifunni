import { getCardSizes } from '../../../utils/preview';

interface EmailPreviewCardProps {
  readonly compact?: boolean;
  readonly senderInitial: string;
  readonly displaySenderName: string;
  readonly displaySenderLine: string;
  readonly displaySubject: string;
  readonly timeStr: string;
  readonly dateStr: string;
  readonly renderedBody: string | false;
  readonly loading?: boolean;
}

function HeaderSection({
  senderInitial,
  displaySenderName,
  displaySenderLine,
  displaySubject,
  timeStr,
  dateStr,
  sizes,
}: Readonly<{
  senderInitial: string;
  displaySenderName: string;
  displaySenderLine: string;
  displaySubject: string;
  timeStr: string;
  dateStr: string;
  sizes: ReturnType<typeof getCardSizes>;
}>) {
  return (
    <div
      className={`border-b border-slate-200 bg-slate-50/80 ${sizes.headerPad}`}
    >
      <div className={`flex items-start ${sizes.gap}`}>
        <div
          className={`flex ${sizes.avatar} shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground`}
        >
          {senderInitial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`truncate font-semibold text-slate-900 ${sizes.nameSize}`}
            >
              {displaySenderName}
            </p>
            <span className={`shrink-0 text-slate-400 ${sizes.timeSize}`}>
              {timeStr}
            </span>
          </div>
          <p className={`truncate text-slate-500 ${sizes.emailSize}`}>
            {displaySenderLine}
          </p>
          <p className={`mt-2 font-medium text-slate-800 ${sizes.subjectSize}`}>
            {displaySubject}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
        <span>to me</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}

function BodyLoadingState({ bodyHeight }: Readonly<{ bodyHeight: string }>) {
  return (
    <div className={`flex items-center justify-center ${bodyHeight}`}>
      <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
        <span>Rendering preview…</span>
      </div>
    </div>
  );
}

function BodyRenderedState({
  renderedBody,
  bodyHeight,
}: Readonly<{
  renderedBody: string;
  bodyHeight: string;
}>) {
  return (
    <iframe
      srcDoc={renderedBody}
      title="Email preview"
      className={`w-full border-0 ${bodyHeight}`}
      sandbox="allow-same-origin"
    />
  );
}

function BodyEmptyState({ emptyPad }: Readonly<{ emptyPad: string }>) {
  return (
    <p className={`text-center text-slate-400 ${emptyPad}`}>
      Start editing to see a live preview.
    </p>
  );
}

function BodySection({
  loading,
  renderedBody,
  bodyHeight,
  emptyPad,
}: Readonly<{
  loading: boolean;
  renderedBody: string | false;
  bodyHeight: string;
  emptyPad: string;
}>) {
  if (loading) {
    return <BodyLoadingState bodyHeight={bodyHeight} />;
  }

  if (renderedBody) {
    return (
      <BodyRenderedState renderedBody={renderedBody} bodyHeight={bodyHeight} />
    );
  }

  return <BodyEmptyState emptyPad={emptyPad} />;
}

/** Shared email card for desktop and mobile views. */
export const EmailPreviewCard = ({
  compact = false,
  senderInitial,
  displaySenderName,
  displaySenderLine,
  displaySubject,
  timeStr,
  dateStr,
  renderedBody,
  loading = false,
}: EmailPreviewCardProps) => {
  const sizes = getCardSizes(compact);

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-white text-slate-900 shadow-sm">
      <HeaderSection
        senderInitial={senderInitial}
        displaySenderName={displaySenderName}
        displaySenderLine={displaySenderLine}
        displaySubject={displaySubject}
        timeStr={timeStr}
        dateStr={dateStr}
        sizes={sizes}
      />
      <div className="border-t border-slate-200">
        <div className="px-1 py-1">
          <BodySection
            loading={loading}
            renderedBody={renderedBody}
            bodyHeight={sizes.bodyHeight}
            emptyPad={sizes.emptyPad}
          />
        </div>
      </div>
    </div>
  );
};
