import { Monitor, Smartphone } from 'lucide-react';

interface ViewToggleProps {
  readonly mobileView: boolean;
  readonly onChange: (mobile: boolean) => void;
}

/** Desktop / Mobile preview toggle for email. */
export const ViewToggle = ({ mobileView, onChange }: ViewToggleProps) => (
  <div className="flex overflow-hidden rounded-md border border-border/50">
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
        !mobileView
          ? 'bg-primary text-primary-foreground'
          : 'bg-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Monitor className="h-3.5 w-3.5" />
      Desktop
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
        mobileView
          ? 'bg-primary text-primary-foreground'
          : 'bg-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Smartphone className="h-3.5 w-3.5" />
      Mobile
    </button>
  </div>
);
