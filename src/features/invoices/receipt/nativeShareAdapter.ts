import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const blobToBase64 = async (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read export file'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
};

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
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
  }
};

export const shareNativePdf = (blob: Blob, fileName: string, title: string) =>
  shareNativeFile(blob, fileName, title, 'kirana-receipts');
