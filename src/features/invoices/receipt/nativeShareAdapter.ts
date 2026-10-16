import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const blobToBase64 = async (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read receipt PDF'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
};

export const shareNativePdf = async (blob: Blob, fileName: string, title: string) => {
  const path = `kirana-receipts/${Date.now()}-${fileName}`;
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
