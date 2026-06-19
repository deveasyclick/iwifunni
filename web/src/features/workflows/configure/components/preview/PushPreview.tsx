interface PushPreviewProps {
  readonly previewSubject: string;
  readonly renderedBody: string | false;
}

export const PushPreview = ({
  previewSubject,
  renderedBody,
}: PushPreviewProps) => (
  <div className="rounded-3xl border border-border/40 bg-dark p-4">
    <div className="rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-lg">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Iwifunni notification
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">
        {previewSubject}
      </p>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {renderedBody}
      </div>
    </div>
  </div>
);
