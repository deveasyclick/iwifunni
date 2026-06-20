import type { Variable } from '@maily-to/core/extensions';

type Props = Readonly<{
  variable: Variable;
  /** When true, marks the chip as non-editable in the rich-text editor. */
  contentEditable?: boolean;
}>;

/**
 * Shared inline chip for rendering `{{variable.name}}` inside rich-text
 * editors (Maily / TipTap). Used by both the email and SMS body editors.
 */
export function VariableChip({ variable, contentEditable = false }: Props) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border border-border/50 ' +
        'bg-muted/30 px-1.5 py-0.5 text-xs font-mono leading-none ' +
        'text-foreground/90 select-none'
      }
      {...(contentEditable ? { contentEditable: false } : {})}
    >
      {'{{'}
      {variable.name}
      {'}}'}
    </span>
  );
}
