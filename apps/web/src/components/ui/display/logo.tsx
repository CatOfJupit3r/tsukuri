import { USER_THEME } from '#~/components/themes/constants';
import { useTheme } from '#~/components/themes/use-theme';
import { cn } from '#~/lib/utils';

export function Logo({ className }: { className?: string }) {
  const { userTheme } = useTheme();
  return (
    <img
      src={`/favicon/favicon${userTheme === USER_THEME.LIGHT ? '.dark' : ''}.svg`}
      className={cn('size-32', className)}
      alt="startname Logo"
    />
  );
}
