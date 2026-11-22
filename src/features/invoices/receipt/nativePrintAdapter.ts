import { registerPlugin } from '@capacitor/core';
import { blobToBase64 } from './nativeFileData';
const documents = registerPlugin<{
  printPdf(options: { base64: string; jobName: string }): Promise<{ completed: boolean }>;
}>('KiranaDocuments');
export const printNativePdf = async (blob: Blob) => {
  const result = await documents.printPdf({
    base64: await blobToBase64(blob),
    jobName: 'Kirana receipt',
  });
  return result.completed;
};
