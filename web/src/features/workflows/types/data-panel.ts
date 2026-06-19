/**
 * A single variable definition returned by the backend schema endpoint.
 */
export interface VariableDefinition {
  path: string;
  label: string;
  type: string;
  description: string;
}

/**
 * A named group of related variable definitions.
 */
export interface VariableGroup {
  id: string;
  label: string;
  variables: VariableDefinition[];
}

/**
 * Preview subscriber context used for rendering sample variable values.
 */
export interface PreviewSubscriber {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Props for the DataPanel component.
 */
export interface DataPanelProps {
  workflowId: string;
  payload: string;
  onPayloadChange: (payload: string) => void;
  previewSubscriber?: PreviewSubscriber | null;
  subscriberLoading?: boolean;
  subscriberError?: string | null;
  onSelectSubscriber?: (subscriber: PreviewSubscriber) => void;
  onResetSubscriber?: () => void;
}

/**
 * Return type of the usePayloadEditor hook.
 */
export interface UsePayloadEditorReturn {
  payloadLocal: string;
  payloadError: string | null;
  handlePayloadChange: (value: string) => void;
}

/**
 * Return type of the useSubscriberSearchInput hook.
 */
export interface UseSubscriberSearchInputReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedQuery: string;
  searchResults: Array<{
    id: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
  }>;
  isSearching: boolean;
  clearSearch: () => void;
}

/**
 * Return type of the useEmailPreview hook.
 */
export interface UseEmailPreviewReturn {
  html: string | null;
  loading: boolean;
}

/**
 * Return type of the useDataPanel hook.
 */
export interface UseDataPanelReturn {
  groups: VariableGroup[];
  allVariables: VariableDefinition[];
  previewSubscriber: PreviewSubscriber | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredGroups: VariableGroup[];
  selectPreviewSubscriber: (subscriber: PreviewSubscriber) => void;
  resetToDefault: () => void;
  isSearchingSubscribers: boolean;
}
