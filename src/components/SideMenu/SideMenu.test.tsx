import React, { type PropsWithChildren } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SideMenu } from './SideMenu';

const push = vi.fn();

vi.mock('react-router', () => ({ useHistory: () => ({ push }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/hooks', () => ({ useAppSelector: () => ({ roles: ['CASHIER'] }) }));
vi.mock('@core/auth/authSlice', () => ({ selectCurrentUser: vi.fn() }));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonMenu: Container,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonContent: Container,
    IonList: Container,
    IonMenuToggle: Container,
    IonLabel: Container,
    IonIcon: () => null,
    IonItem: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
  };
});

describe('SideMenu', () => {
  it('lets an authenticated cashier open About', () => {
    render(<SideMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(push).toHaveBeenCalledWith('/about');
  });
});
