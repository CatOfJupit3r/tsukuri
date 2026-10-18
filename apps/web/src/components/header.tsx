import { Link } from '@tanstack/react-router';

import { Logo } from '#~/components/ui/display/logo';
import { webSlots } from '#~/lib/web-slots';

import { ModeToggle } from './mode-toggle';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold transition-opacity hover:opacity-80">
            <Logo className="size-6 text-primary" />
            <span className="hidden sm:inline-block">startername</span>
          </Link>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 transform gap-6 md:flex">
          {webSlots.HEADER_NAVIGATION.map((NavigationItem) => (
            <NavigationItem key={NavigationItem.name} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle />
          {webSlots.HEADER_ACTIONS.map((Action) => (
            <Action key={Action.name} />
          ))}
        </div>
      </div>
    </header>
  );
}
