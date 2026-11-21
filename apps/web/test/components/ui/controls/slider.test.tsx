import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Slider } from '#~/components/ui/controls/slider';

describe('Slider', () => {
  it('steps the value with the arrow keys and reports it through onChange', async () => {
    const onChange = vi.fn();
    render(<Slider value={4} onChange={onChange} min={0} max={10} step={2} aria-label="Volume" />);

    screen.getByRole('slider', { name: 'Volume' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenLastCalledWith(6);
  });

  it('ignores the keyboard while disabled', async () => {
    const onChange = vi.fn();
    render(<Slider value={4} onChange={onChange} disabled aria-label="Volume" />);

    screen.getByRole('slider', { name: 'Volume' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).not.toHaveBeenCalled();
  });
});
