import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  share: vi.fn(),
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: mocks.writeFile, deleteFile: mocks.deleteFile },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: mocks.share } }));

import { shareNativePdf } from './nativeShareAdapter';

describe('shareNativePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writeFile.mockResolvedValue({ uri: 'file://receipt.pdf' });
    mocks.deleteFile.mockResolvedValue(undefined);
    mocks.share.mockResolvedValue(undefined);
  });

  it('writes to cache, opens native share, and deletes the temporary file', async () => {
    await shareNativePdf(new Blob(['pdf']), 'INV-42.pdf', 'Receipt INV-42');

    expect(mocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      path: expect.stringMatching(/kirana-receipts\/\d+-INV-42\.pdf/),
      directory: 'CACHE',
      recursive: true,
    }));
    expect(mocks.share).toHaveBeenCalledWith(expect.objectContaining({ url: 'file://receipt.pdf' }));
    expect(mocks.deleteFile).toHaveBeenCalledOnce();
  });

  it('cleans up best-effort when the native share sheet is cancelled', async () => {
    mocks.share.mockRejectedValue(new DOMException('Cancelled', 'AbortError'));

    await expect(shareNativePdf(new Blob(['pdf']), 'INV-42.pdf', 'Receipt INV-42')).rejects.toMatchObject({ name: 'AbortError' });
    expect(mocks.deleteFile).toHaveBeenCalledOnce();
  });
});

