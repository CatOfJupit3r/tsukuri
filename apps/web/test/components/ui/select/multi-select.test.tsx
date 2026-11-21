import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MultiSelect } from '#~/components/ui/select/select';

const OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

describe('MultiSelect', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        public observe() {}
        public unobserve() {}
        public disconnect() {}
      },
    );
  });

  it('keeps the menu open after a pick so several options can be chosen in a row', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <MultiSelect
        options={OPTIONS}
        onValueChange={onValueChange}
        aria-label="Fruit"
        shouldRenderMenuInPlace
        blurInputOnSelect={false}
      />,
    );

    await user.click(screen.getByLabelText('Fruit'));
    await user.click(await screen.findByText('Apple'));

    expect(await screen.findByText('Banana')).toBeInTheDocument();
    await user.click(screen.getByText('Banana'));

    expect(onValueChange).toHaveBeenLastCalledWith(['apple', 'banana'], expect.anything(), expect.anything());
  });

  it('closes the menu after a pick when shouldCloseMenuOnSelect is true', async () => {
    const user = userEvent.setup();
    render(
      <MultiSelect
        options={OPTIONS}
        aria-label="Fruit"
        shouldCloseMenuOnSelect
        shouldRenderMenuInPlace
        blurInputOnSelect={false}
      />,
    );

    await user.click(screen.getByLabelText('Fruit'));
    await user.click(await screen.findByText('Apple'));

    expect(screen.queryByText('Banana')).not.toBeInTheDocument();
  });
});
