import { USER_THEME } from '#~/components/themes/constants';
import { useTheme } from '#~/components/themes/use-theme';
import { cn } from '#~/lib/utils';

interface iLogoProps {
  className?: string;
}

export function Logo({ className }: iLogoProps) {
  const { userTheme } = useTheme();
  return (
    <img
      src={`/favicon/favicon${userTheme === USER_THEME.LIGHT ? '.dark' : ''}.svg`}
      className={cn('size-32', className)}
      alt="startname Logo"
    />
  );
}
