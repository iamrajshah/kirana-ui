import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LegalPage } from './LegalPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('LegalPage', () => {
  const renderPage = (document: 'privacy' | 'terms') =>
    render(
      <MemoryRouter>
        <LegalPage document={document} />
      </MemoryRouter>
    );

  it('renders public privacy and account-deletion guidance without authentication', () => {
    renderPage('privacy');

    expect(screen.getByRole('heading', { name: 'legal.privacyTitle' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'legal.deletionTitle' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'legal.supportAction' }).getAttribute('href')
    ).toBe('mailto:support@kirana.app');
  });

  it('renders public terms guidance', () => {
    renderPage('terms');

    expect(screen.getByRole('heading', { name: 'legal.termsTitle' })).toBeTruthy();
    expect(screen.getByText('legal.termsBody')).toBeTruthy();
  });
});
