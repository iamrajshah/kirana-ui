export interface PurchaseBillOcrProgress {
  status: string;
  progress: number;
}

export interface PurchaseBillOcrResult {
  text: string;
  confidence: number;
}

export interface PurchaseBillOcrOptions {
  signal?: AbortSignal;
  onProgress?: (progress: PurchaseBillOcrProgress) => void;
}

export type PurchaseBillOcrAttempt =
  | { status: 'TEXT'; text: string; confidence: number }
  | { status: 'NO_TEXT' }
  | { status: 'UNAVAILABLE' }
  | { status: 'CANCELLED' };

const MAX_IMAGE_EDGE = 2200;

export const normalizeTesseractConfidence = (confidence: number | null | undefined): number =>
  Math.max(0, Math.min(100, confidence ?? 0)) / 100;

const abortError = () => new DOMException('OCR cancelled', 'AbortError');

const boundedImage = async (file: File, signal?: AbortSignal): Promise<File | Blob> => {
  if (!('createImageBitmap' in window)) return file;
  if (signal?.aborted) throw abortError();
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (signal?.aborted) throw abortError();
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Image preparation failed'))),
        'image/jpeg',
        0.9
      );
    });
  } finally {
    bitmap.close();
  }
};

export const recognizePurchaseBillImage = async (
  file: File,
  options: PurchaseBillOcrOptions = {}
): Promise<PurchaseBillOcrResult> => {
  if (options.signal?.aborted) throw abortError();
  const assetRoot = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/ocr`;
  const { createWorker, OEM } = await import('tesseract.js');
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let terminating = false;
  const terminate = async () => {
    if (!worker || terminating) return;
    terminating = true;
    try {
      await worker.terminate();
    } catch {
      // Cancellation can race worker start-up. The caller receives AbortError below.
    }
  };
  const onAbort = () => void terminate();
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const image = await boundedImage(file, options.signal);
    worker = await createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: `${assetRoot}/worker.min.js`,
      corePath: `${assetRoot}/core`,
      langPath: `${assetRoot}/lang`,
      gzip: true,
      logger: (message) =>
        options.onProgress?.({ status: message.status, progress: message.progress }),
    });
    if (options.signal?.aborted) throw abortError();
    const result = await worker.recognize(image);
    if (options.signal?.aborted) throw abortError();
    return {
      text: result.data.text.trim(),
      confidence: normalizeTesseractConfidence(result.data.confidence),
    };
  } catch (cause) {
    if (options.signal?.aborted) throw abortError();
    throw cause;
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    await terminate();
  }
};

export const attemptPurchaseBillImageOcr = async (
  file: File,
  options: PurchaseBillOcrOptions = {},
  recognize: typeof recognizePurchaseBillImage = recognizePurchaseBillImage
): Promise<PurchaseBillOcrAttempt> => {
  try {
    const result = await recognize(file, options);
    if (result.text.trim().length < 12) return { status: 'NO_TEXT' };
    return { status: 'TEXT', ...result };
  } catch (cause) {
    if (options.signal?.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) {
      return { status: 'CANCELLED' };
    }
    return { status: 'UNAVAILABLE' };
  }
};
