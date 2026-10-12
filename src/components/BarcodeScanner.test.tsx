import React, { type ButtonHTMLAttributes, type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarcodeScannerComponent } from './BarcodeScanner';

const scannerMocks = vi.hoisted(() => ({
  checkPermission: vi.fn(),
  prepare: vi.fn(),
  hideBackground: vi.fn(),
  showBackground: vi.fn(),
  startScan: vi.fn(),
  stopScan: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('ionicons/icons', () => ({ camera: 'camera' }));

vi.mock('@ionic/react', () => ({
  isPlatform: () => true,
  IonIcon: () => null,
  IonButton: ({
    children,
    onClick,
    disabled,
    type,
  }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

vi.mock('@capacitor-community/barcode-scanner', () => ({
  BarcodeScanner: scannerMocks,
}));

beforeEach(() => {
  vi.clearAllMocks();
  scannerMocks.prepare.mockResolvedValue(undefined);
  scannerMocks.hideBackground.mockResolvedValue(undefined);
  scannerMocks.showBackground.mockResolvedValue(undefined);
  scannerMocks.stopScan.mockResolvedValue(undefined);
  scannerMocks.startScan.mockResolvedValue({ hasContent: false });
});

afterEach(() => {
  document.body.classList.remove('scanner-active');
  cleanup();
});

describe('BarcodeScannerComponent', () => {
  it('keeps first-use scanning available and requests camera permission on tap', async () => {
    scannerMocks.checkPermission
      .mockResolvedValueOnce({ granted: false, neverAsked: true })
      .mockResolvedValueOnce({ granted: true, asked: true });

    render(<BarcodeScannerComponent onScan={vi.fn()} />);

    const scanButton = await screen.findByRole('button', { name: 'products.scanBarcode' });
    expect((scanButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(scanButton);

    await waitFor(() =>
      expect(scannerMocks.checkPermission).toHaveBeenLastCalledWith({ force: true })
    );
  });

  it('stops an active native scan when the component unmounts', async () => {
    scannerMocks.checkPermission.mockResolvedValue({ granted: true });
    scannerMocks.startScan.mockReturnValue(new Promise(() => undefined));

    const view = render(<BarcodeScannerComponent onScan={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'products.scanBarcode' }));

    await waitFor(() => expect(scannerMocks.startScan).toHaveBeenCalledTimes(1));
    expect(document.body.classList.contains('scanner-active')).toBe(true);

    view.unmount();

    await waitFor(() => expect(scannerMocks.showBackground).toHaveBeenCalled());
    expect(scannerMocks.stopScan).toHaveBeenCalled();
    expect(document.body.classList.contains('scanner-active')).toBe(false);
  });
});
