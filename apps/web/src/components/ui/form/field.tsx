import { createFormHook } from '@tanstack/react-form';

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '#~/components/ui/form/field-primitives';
import { Form } from '#~/components/ui/form/form';
import { fieldContext, formContext } from '#~/components/ui/form/form-contexts';
import { FormErrorSummary } from '#~/components/ui/form/form-error-summary';
import { CheckboxField } from '#~/components/ui/form/form-fields/checkbox-field';
import { InfiniteMultiSelectField } from '#~/components/ui/form/form-fields/infinite-multi-select-field';
import { InfiniteSingleSelectField } from '#~/components/ui/form/form-fields/infinite-single-select-field';
import { NumberField } from '#~/components/ui/form/form-fields/number-field';
import { RangerField } from '#~/components/ui/form/form-fields/ranger-field';
import { SelectField } from '#~/components/ui/form/form-fields/select-field';
import { SubmitButton } from '#~/components/ui/form/form-fields/submit-button';
import { TagArrayField } from '#~/components/ui/form/form-fields/tag-array-field';
import { TextField } from '#~/components/ui/form/form-fields/text-field';
import { TextareaField } from '#~/components/ui/form/form-fields/textarea-field';

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    Field,
    FieldError,
    FieldSet,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldTitle,
    TextField,
    NumberField,
    TextareaField,
    CheckboxField,
    SelectField,
    RangerField,
    InfiniteSingleSelectField,
    InfiniteMultiSelectField,
    TagArrayField,
  },
  formComponents: {
    FieldLegend,
    FieldDescription,
    FieldSeparator,
    Form,
    FormErrorSummary,
    SubmitButton,
  },
});
