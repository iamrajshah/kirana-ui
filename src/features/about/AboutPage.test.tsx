import React, { type PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AboutPage } from './AboutPage';

vi.mock('@core/constants', () => ({ APP_NAME: 'Kirana POS', APP_VERSION: '9.8.7' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { version?: string }) => {
      if (key === 'about.title') return 'About';
      if (key === 'about.version') return `Version ${options?.version}`;
      if (key === 'about.builtBy') return 'Built and maintained by';
      return key;
    },
  }),
}));
vi.mock('@components/Navbar', () => ({
  Navbar: ({ title }: { title: string }) => <header>{title}</header>,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonCard: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonCardContent: Container,
  };
});

it('shows the app name, supplied version, and maintainer', () => {
  render(<AboutPage />);
  expect(screen.getByText('Kirana POS')).toBeTruthy();
  expect(screen.getByText('Version 9.8.7')).toBeTruthy();
  expect(screen.getByText('Rajesh Shah (@iamrajshah)')).toBeTruthy();
});
