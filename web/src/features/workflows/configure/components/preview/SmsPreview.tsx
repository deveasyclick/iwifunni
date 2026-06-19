interface SmsPreviewProps {
  readonly renderedBody: string | false;
}

export const SmsPreview = ({ renderedBody }: SmsPreviewProps) => (
  <div className="rounded-[28px] border border-border/40 bg-dark p-4">
    <div className="ml-auto max-w-[85%] rounded-3xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-lg whitespace-pre-wrap">
      {renderedBody}
    </div>
  </div>
);
