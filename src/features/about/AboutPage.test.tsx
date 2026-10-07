import React, { type PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AboutPage } from './AboutPage';

vi.mock('@core/constants', () => ({ APP_NAME: 'Kirana POS', APP_VERSION: '9.8.7' }));
vi.mock('@components/Navbar', () => ({ Navbar: ({ title }: { title: string }) => <header>{title}</header> }));
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

it('shows the app name and supplied version', () => {
  render(<AboutPage />);
  expect(screen.getByText('Kirana POS')).toBeTruthy();
  expect(screen.getByText('Version 9.8.7')).toBeTruthy();
});
