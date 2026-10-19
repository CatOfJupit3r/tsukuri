import { useSelector } from '@tanstack/react-form';

import { Button } from '#~/components/ui/button/button';
import type { iButtonProps } from '#~/components/ui/button/button';
import { useFormContext } from '#~/components/ui/form/form-contexts';

interface iSubmitButtonProps extends Omit<iButtonProps, 'disabled'> {
  isDisabled?: boolean;
}

export function SubmitButton({ children, className, isDisabled, ...props }: iSubmitButtonProps) {
  const form = useFormContext();
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <Button type="submit" disabled={isSubmitting || !!isDisabled} className={className} {...props}>
      {children}
    </Button>
  );
}
