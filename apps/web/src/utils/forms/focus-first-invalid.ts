const INVALID_FIELD_SELECTOR =
  '[aria-invalid="true"]:not([disabled]), [data-invalid="true"] input:not([disabled]), [data-invalid="true"] textarea:not([disabled]), [data-invalid="true"] button:not([disabled])';

export function focusFirstInvalidField(container: ParentNode) {
  const field = container.querySelector<HTMLElement>(INVALID_FIELD_SELECTOR);
  field?.focus();
  return field;
}
