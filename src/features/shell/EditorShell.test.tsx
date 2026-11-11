import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/AppProviders';
import { useUiStore } from '@/state/uiStore';
import { EditorShell } from './EditorShell';

const initial = useUiStore.getState();

function renderShell() {
  return render(
    <AppProviders>
      <MemoryRouter>
        <EditorShell />
      </MemoryRouter>
    </AppProviders>,
  );
}

describe('EditorShell', () => {
  beforeEach(() => {
    useUiStore.setState(initial, true);
  });

  it('renders the tool rail with select active', () => {
    renderShell();
    expect(screen.getByRole('navigation', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('activates the wall tool with the W key and returns to select on Escape', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.keyboard('w');
    expect(screen.getByRole('button', { name: 'Wall' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('active-tool')).toHaveTextContent('Wall');

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores shortcuts while typing in the project name', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('textbox', { name: 'Project name' }));
    await user.keyboard('w');
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to split view with the 2 key', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.keyboard('2');
    expect(screen.getByTestId('plan-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('viewer-3d-loading')).toBeInTheDocument();
  });
});
