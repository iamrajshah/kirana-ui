import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ReceiptPdfDocument } from './ReceiptPdfDocument';
import type { ReceiptViewModel } from './types';

export const renderReceiptPdf = (receipt: ReceiptViewModel) =>
  pdf(<ReceiptPdfDocument receipt={receipt} />).toBlob();

