import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ReceiptPdfDocument } from './ReceiptPdfDocument';
import type { ReceiptPaperWidth, ReceiptViewModel } from './types';

export const renderReceiptPdf = (receipt: ReceiptViewModel, paperWidth?: ReceiptPaperWidth) =>
  pdf(<ReceiptPdfDocument receipt={receipt} paperWidth={paperWidth} />).toBlob();
