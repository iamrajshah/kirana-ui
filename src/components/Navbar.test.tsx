import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  logoutRequest: vi.fn(),
  unwrap: vi.fn(),
  state: {
    auth: {
      user: null as null | {
        id: string;
        name: string;
        email: string;
        roles: string[];
        tenant?: { name: string };
      },
      refreshToken: null as string | null,
    },
  },
}));

vi.mock('../core/hooks', () => ({
  useAppSelector: (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
  useAppDispatch: () => mocks.dispatch,
}));
vi.mock('@core/auth/authSlice', () => ({
  selectCurrentUser: (state: typeof mocks.state) => state.auth.user,
  logout: () => ({ type: 'auth/logout' }),
}));
vi.mock('@core/api/authApi', () => ({
  useLogoutMutation: () => [mocks.logoutRequest, { isLoading: false }],
}));
vi.mock('@core/services/notificationService', () => ({
  apiErrorMessage: () => 'logout failed',
}));
vi.mock('react-router', () => ({
  useHistory: () => ({ replace: mocks.replace, push: mocks.push }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Item = ({
    children,
    button: _button,
    detail: _detail,
    ...props
  }: PropsWithChildren &
    React.ButtonHTMLAttributes<HTMLButtonElement> & { button?: boolean; detail?: boolean }) => {
    void _button;
    void _detail;
    return <button {...props}>{children}</button>;
  };
  const Toast = ({ isOpen, message }: { isOpen: boolean; message: string }) =>
    isOpen ? <div>{message}</div> : null;
  const Popover = ({
    children,
    isOpen,
    onDidDismiss,
  }: PropsWithChildren & { isOpen: boolean; onDidDismiss: () => void }) => {
    const wasOpen = React.useRef(isOpen);
    React.useEffect(() => {
      if (wasOpen.current && !isOpen) onDidDismiss();
      wasOpen.current = isOpen;
    }, [isOpen, onDidDismiss]);
    return <div>{children}</div>;
  };
  return {
    IonHeader: Container, IonToolbar: Container, IonTitle: Container,
    IonButtons: Container, IonButton: Item, IonIcon: Container,
    IonPopover: Popover, IonList: Container, IonItem: Item,
    IonLabel: Container, IonToast: Toast,
    IonMenuButton: () => <button aria-label="menu" />,
    IonBackButton: ({ defaultHref }: { defaultHref: string }) => <a href={defaultHref}>back</a>,
  };
});

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.auth.user = null;
  mocks.state.auth.refreshToken = null;
  mocks.unwrap.mockResolvedValue({ success: true });
  mocks.logoutRequest.mockReturnValue({ unwrap: mocks.unwrap });
});

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

  it('navigates from the account menu only after the popover has dismissed', async () => {
    mocks.state.auth.user = {
      id: '7', name: 'Owner', email: 'owner@example.com', roles: ['OWNER'],
    };
    render(<Navbar title="Dashboard" />);

    fireEvent.click(screen.getByRole('button', { name: 'profile.accountMenu' }));
    fireEvent.click(screen.getByText('profile.title'));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/profile'));
  });

  it('revokes the current server session before clearing local authentication', async () => {
    mocks.state.auth.user = {
      id: '7', name: 'Owner', email: 'owner@example.com', roles: ['OWNER'],
    };
    mocks.state.auth.refreshToken = 'refresh-token';
    render(<Navbar title="Dashboard" />);

    fireEvent.click(screen.getByText('auth.logout'));

    await waitFor(() => {
      expect(mocks.logoutRequest).toHaveBeenCalledWith({
        scope: 'current', refresh_token: 'refresh-token',
      });
      expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
      expect(mocks.replace).toHaveBeenCalledWith('/login');
    });
  });

  it('keeps the local session when server logout fails', async () => {
    mocks.state.auth.user = {
      id: '7', name: 'Owner', email: 'owner@example.com', roles: ['OWNER'],
    };
    mocks.state.auth.refreshToken = 'refresh-token';
    mocks.unwrap.mockRejectedValueOnce(new Error('offline'));
    render(<Navbar title="Dashboard" />);

    fireEvent.click(screen.getByText('auth.logout'));

    await waitFor(() => expect(screen.getByText('logout failed')).toBeTruthy());
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
