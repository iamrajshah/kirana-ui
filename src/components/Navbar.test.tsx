import React, { type PropsWithChildren } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

vi.mock('../core/hooks', () => ({ useAppSelector: () => null, useAppDispatch: () => vi.fn() }));
vi.mock('@core/auth/authSlice', () => ({ selectCurrentUser: vi.fn(), logout: vi.fn() }));
vi.mock('react-router', () => ({ useHistory: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonHeader: Container, IonToolbar: Container, IonTitle: Container,
    IonButtons: Container, IonButton: Container, IonIcon: Container,
    IonPopover: Container, IonList: Container, IonItem: Container,
    IonLabel: Container,
    IonMenuButton: () => <button aria-label="menu" />,
    IonBackButton: ({ defaultHref }: { defaultHref: string }) => <a href={defaultHref}>back</a>,
  };
});

afterEach(cleanup);

describe('Navbar navigation', () => {
  it('provides a list fallback for a directly opened detail page', () => {
    render(<Navbar title="Purchase details" backHref="/purchases" />);
    expect(screen.getByRole('link', { name: 'back' }).getAttribute('href')).toBe('/purchases');
    expect(screen.queryByRole('button', { name: 'menu' })).toBeNull();
  });

  it('keeps the menu button on workspace pages', () => {
    render(<Navbar title="Purchases" />);
    expect(screen.getByRole('button', { name: 'menu' })).toBeTruthy();
  });
});
