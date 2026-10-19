export interface iFormAutosaveApi<TFormData> {
  state: {
    values: TFormData;
  };
  reset?: (values?: TFormData) => unknown;
}

export interface iFormAutosaveMetadata {
  idempotencyKey: string;
  requestSequence: number;
}

export interface iFormAutosaveLocalDraftOptions<TFormData> {
  key: string;
  fields: readonly (keyof TFormData)[];
  maxAgeMs?: number;
  ownerId?: string;
}

export interface iUseFormAutosaveOptions<TFormData, TChangedData = Partial<TFormData>> {
  form: iFormAutosaveApi<TFormData>;
  onSave: (changedData: TChangedData, metadata: iFormAutosaveMetadata) => unknown;
  debounce?: number;
  selectFields?: (data: TFormData) => TChangedData;
  transformData?: (changedData: Partial<TFormData>) => TChangedData;
  onlyChanged?: boolean;
  localDraft?: iFormAutosaveLocalDraftOptions<TFormData>;
  isConflictError?: (error: unknown) => boolean;
  createIdempotencyKey?: () => string;
}

export interface iFailedSave<TFormData, TChangedData> {
  baselineData: Partial<TFormData>;
  changedData: TChangedData;
  metadata: iFormAutosaveMetadata;
}

export interface iFormAutosaveSaveCandidate<TFormData, TChangedData> {
  baselineData: Partial<TFormData>;
  changedData: TChangedData;
}
