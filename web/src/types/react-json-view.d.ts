declare module 'react-json-view' {
  import type { ComponentType } from 'react';

  interface ReactJsonViewProps {
    src: Record<string, unknown>;
    name?: string | false;
    theme?: string;
    collapsed?: boolean | number;
    displayDataTypes?: boolean;
    displayObjectSize?: boolean;
    enableClipboard?: boolean;
    style?: React.CSSProperties;
    iconStyle?: 'square' | 'triangle';
    indentWidth?: number;
    onEdit?: (update: { updated_src: Record<string, unknown> }) => void;
    onAdd?: (update: { updated_src: Record<string, unknown> }) => void;
    onDelete?: (update: { updated_src: Record<string, unknown> }) => void;
  }

  const ReactJson: ComponentType<ReactJsonViewProps>;
  export default ReactJson;
}
