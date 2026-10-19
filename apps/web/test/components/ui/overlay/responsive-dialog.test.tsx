import { render, screen } from '@testing-library/react';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from '#~/components/ui/overlay/responsive-dialog/responsive-dialog';
import { RESPONSIVE_DIALOG_MOBILE_QUERY } from '#~/components/ui/overlay/responsive-dialog/responsive-dialog.constants';

function mockViewport({ isMobile }: { isMobile: boolean }) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === RESPONSIVE_DIALOG_MOBILE_QUERY && isMobile,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function renderOpenDialog() {
  render(
    <ResponsiveDialog open>
      <ResponsiveDialogContent>
        <ResponsiveDialogTitle>Rename project</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>Pick a new name.</ResponsiveDialogDescription>
      </ResponsiveDialogContent>
    </ResponsiveDialog>,
  );
}

describe('ResponsiveDialog', () => {
  it('opens as a centered dialog on wide screens', async () => {
    mockViewport({ isMobile: false });
    renderOpenDialog();

    expect(await screen.findByText('Rename project')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="drawer-content"]')).toBeNull();
  });

  it('opens as a bottom drawer on small screens', async () => {
    mockViewport({ isMobile: true });
    renderOpenDialog();

    expect(await screen.findByText('Rename project')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="drawer-content"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
  });
});
