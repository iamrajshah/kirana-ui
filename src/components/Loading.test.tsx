import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { setupIonicReact } from '@ionic/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Loading } from './Loading';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const controller = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@ionic/core/components', async (actual) => ({
  ...(await actual<typeof import('@ionic/core/components')>()),
  loadingController: controller,
}));
afterEach(cleanup);
setupIonicReact({ mode: 'md' });
it('keeps conditional data loading inline instead of hiding the router behind a modal overlay', () => {
  const { container, rerender, unmount } = render(<Loading isOpen message="Loading customers" />);
  expect(screen.getByRole('status').textContent).toContain('Loading customers');
  expect(container.querySelector('ion-loading')).toBeNull();
  rerender(<Loading isOpen={false} />);
  expect(screen.queryByRole('status')).toBeNull();
  unmount();
});

it('waits for presentation before dismissing an unmounted blocking workflow', async () => {
  let presented!: () => void;
  const element = {
    present: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          presented = resolve;
        })
    ),
    dismiss: vi.fn(async () => true),
    remove: vi.fn(),
  };
  controller.create.mockResolvedValueOnce(element);
  const { unmount } = render(<Loading overlay isOpen message="Processing bill" />);
  await waitFor(() => expect(element.present).toHaveBeenCalledOnce());
  unmount();
  expect(element.dismiss).not.toHaveBeenCalled();
  presented();
  await waitFor(() => expect(element.dismiss).toHaveBeenCalledOnce());
  expect(element.remove).toHaveBeenCalledOnce();
});
it('never presents a loader created after its workflow was unmounted', async () => {
  let created!: (value: unknown) => void;
  controller.create.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        created = resolve;
      })
  );
  const element = {
    present: vi.fn(async () => undefined),
    dismiss: vi.fn(async () => false),
    remove: vi.fn(),
  };
  const { unmount } = render(<Loading overlay isOpen />);
  unmount();
  created(element);
  await waitFor(() => expect(element.remove).toHaveBeenCalled());
  expect(element.present).not.toHaveBeenCalled();
});
