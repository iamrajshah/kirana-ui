import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { blobToBase64 } from './nativeFileData';

export const shareNativeFile = async (
  blob: Blob,
  fileName: string,
  title: string,
  folder = 'kirana-exports'
) => {
  const path = `${folder}/${Date.now()}-${fileName}`;
  try {
    const written = await Filesystem.writeFile({
      path,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({ title, url: written.uri, dialogTitle: title });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      /^Share cancel(?:l)?ed$/i.test(error.message)
    ) {
      throw new DOMException('Share cancelled', 'AbortError');
    }
    throw error;
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
  }
};

export const shareNativePdf = (blob: Blob, fileName: string, title: string) =>
  shareNativeFile(blob, fileName, title, 'kirana-receipts');
