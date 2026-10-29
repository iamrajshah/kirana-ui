import React from 'react';
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text as ReactPdfText,
  View,
  type TextProps,
} from '@react-pdf/renderer';
import latinRegular from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url';
import latinBold from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff?url';
import devanagariRegular from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff?url';
import devanagariBold from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff?url';
import gujaratiRegular from '@fontsource/noto-sans-gujarati/files/noto-sans-gujarati-gujarati-400-normal.woff?url';
import gujaratiBold from '@fontsource/noto-sans-gujarati/files/noto-sans-gujarati-gujarati-700-normal.woff?url';
import type { ReceiptViewModel } from './types';
import { defaultReceiptLabels } from './receiptLabels';

let fontsRegistered = false;

const fontSource = (source: string) => {
  if (import.meta.env.MODE !== 'test') return source;
  if (source.startsWith('/@fs/')) return source.slice('/@fs'.length);
  if (source.startsWith('/node_modules/')) return `${process.cwd()}${source}`;
  return source;
};

const registerFonts = () => {
  if (fontsRegistered) return;
  Font.register({ family: 'Receipt Latin', fonts: [{ src: fontSource(latinRegular) }, { src: fontSource(latinBold), fontWeight: 700 }] });
  Font.register({ family: 'Receipt Devanagari', fonts: [{ src: fontSource(devanagariRegular) }, { src: fontSource(devanagariBold), fontWeight: 700 }] });
  Font.register({ family: 'Receipt Gujarati', fonts: [{ src: fontSource(gujaratiRegular) }, { src: fontSource(gujaratiBold), fontWeight: 700 }] });
  fontsRegistered = true;
};

const fontRuns = (value: string) =>
  value.match(/[ऀ-ॿ]+|[઀-૿]+|[^ऀ-ॿ઀-૿]+/gu) ?? [];

const familyForRun = (value: string) => {
  if (/^[઀-૿]/u.test(value)) return 'Receipt Gujarati';
  if (/^[ऀ-ॿ]/u.test(value)) return 'Receipt Devanagari';
  return 'Receipt Latin';
};

const Text: React.FC<React.PropsWithChildren<TextProps>> = ({ children, ...props }) => {
  const value = React.Children.toArray(children).join('');
  return (
    <ReactPdfText {...props}>
      {fontRuns(value).map((run, index) => (
        <ReactPdfText style={{ fontFamily: familyForRun(run) }} key={`${index}-${run}`}>
          {run}
        </ReactPdfText>
      ))}
    </ReactPdfText>
  );
};

const styles = StyleSheet.create({
  page: { padding: 32, color: '#111827', fontSize: 9, lineHeight: 1.35 },
  cancellation: { border: '2 solid #b91c1c', color: '#b91c1c', fontSize: 13, fontWeight: 700, marginBottom: 14, padding: 7, textAlign: 'center' },
  header: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: 20, marginBottom: 14 },
  store: { fontSize: 17, fontWeight: 700, marginBottom: 3 },
  title: { fontSize: 15, fontWeight: 700, textAlign: 'right', textTransform: 'uppercase' },
  right: { textAlign: 'right' },
  party: { borderBottom: '1 solid #cbd5e1', borderTop: '1 solid #cbd5e1', marginBottom: 12, paddingVertical: 8 },
  row: { borderBottom: '1 solid #e2e8f0', display: 'flex', flexDirection: 'row', paddingVertical: 6 },
  head: { backgroundColor: '#f1f5f9', fontWeight: 700 },
  item: { flexGrow: 1, width: '35%' },
  cell: { textAlign: 'right', width: '13%' },
  hsn: { width: '13%' },
  totals: { alignSelf: 'flex-end', marginTop: 14, width: '48%' },
  totalRow: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grandTotal: { borderTop: '1.5 solid #111827', fontSize: 13, fontWeight: 700, marginTop: 3, paddingTop: 5 },
  savings: { backgroundColor: '#ecfdf5', color: '#047857', fontSize: 11, fontWeight: 700, marginTop: 4, padding: 5 },
  payment: { backgroundColor: '#f8fafc', border: '1 solid #cbd5e1', marginTop: 14, padding: 9 },
  paymentStatus: { fontSize: 12, fontWeight: 700, marginBottom: 3 },
  footer: { color: '#475569', marginTop: 20, textAlign: 'center' },
  logo: { height: 42, marginBottom: 6, maxWidth: 120, objectFit: 'contain', objectPosition: 'left' },
});

const money = (value: string) => `INR ${value}`;
const displayDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

export const ReceiptPdfDocument: React.FC<{ receipt: ReceiptViewModel }> = ({ receipt }) => {
  registerFonts();
  const gst = receipt.mode === 'GST_TAX_INVOICE';
  const labels = { ...defaultReceiptLabels, ...receipt.labels };

  return (
    <Document title={`${receipt.title} ${receipt.invoiceNumber}`} author={receipt.supplier.name}>
      <Page size="A4" style={[
        styles.page,
        { fontFamily: 'Receipt Latin' },
        receipt.branding.template === 'MODERN' ? { borderTop: `6 solid ${receipt.branding.brandColor}` } : {},
        receipt.branding.template === 'COMPACT' ? { padding: 22 } : {},
      ]}>
        {receipt.cancellationMarker && <Text style={styles.cancellation}>{receipt.cancellationMarker}</Text>}
        <View style={styles.header}>
          <View>
            {receipt.branding.logoUrl && <Image src={receipt.branding.logoUrl} style={styles.logo} />}
            <Text style={[styles.store, receipt.branding.template === 'MODERN' ? { color: receipt.branding.brandColor } : {}]}>{receipt.supplier.name}</Text>
            {receipt.supplier.address && <Text>{receipt.supplier.address}</Text>}
            {receipt.supplier.phone && <Text>{receipt.supplier.phone}</Text>}
            {gst && receipt.supplier.gstin && <Text>{labels.gstin}: {receipt.supplier.gstin}</Text>}
          </View>
          <View style={styles.right}>
            <Text style={styles.title}>{receipt.title}</Text>
            <Text>{labels.invoice}: {receipt.invoiceNumber}</Text>
            <Text>{labels.date}: {displayDate(receipt.issuedAt)}</Text>
            {receipt.isLegacy && <Text>{labels.legacy}</Text>}
          </View>
        </View>

        <View style={styles.party}>
          <Text style={{ fontWeight: 700 }}>{labels.customer}</Text>
          {receipt.customer.kind === 'walk-in' ? (
            <Text>{receipt.customer.label}</Text>
          ) : (
            <>
              <Text>{receipt.customer.name}</Text>
              {receipt.customer.address && <Text>{receipt.customer.address}</Text>}
              {receipt.customer.phone && <Text>{receipt.customer.phone}</Text>}
              {gst && receipt.customer.gstin && <Text>{labels.gstin}: {receipt.customer.gstin}</Text>}
            </>
          )}
          {gst && receipt.placeOfSupply && <Text>{labels.placeOfSupply}: {receipt.placeOfSupply.name ?? ''}{receipt.placeOfSupply.stateCode ? ` (${receipt.placeOfSupply.stateCode})` : ''}</Text>}
        </View>

        <View style={[styles.row, styles.head]}>
          <Text style={styles.item}>{labels.item}</Text>
          {gst && <Text style={[styles.cell, styles.hsn]}>{labels.hsn}</Text>}
          <Text style={styles.cell}>{labels.qty}</Text>
          <Text style={styles.cell}>{labels.rate}</Text>
          {gst && <Text style={styles.cell}>{labels.tax}</Text>}
          <Text style={styles.cell}>{labels.amount}</Text>
        </View>
        {receipt.items.map((item) => (
          <View style={styles.row} key={item.key} wrap={false}>
            <View style={styles.item}><Text>{item.name}</Text>{item.sku && <Text>{item.sku}</Text>}</View>
            {gst && <Text style={[styles.cell, styles.hsn]}>{item.hsnCode ?? '—'}</Text>}
            <Text style={styles.cell}>{item.quantity}{item.unitLabel || item.uqcCode ? ` ${item.unitLabel || item.uqcCode}` : ''}</Text>
            <Text style={styles.cell}>{money(item.unitPrice)}</Text>
            {gst && <Text style={styles.cell}>{item.gstRate ?? '0.00'}%</Text>}
            <Text style={styles.cell}>{money(item.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}><Text>{labels.subtotal}</Text><Text>{money(receipt.totals.subtotal)}</Text></View>
          {Number(receipt.totals.discount) > 0 && <View style={styles.totalRow}><Text>{labels.discount}</Text><Text>−{money(receipt.totals.discount)}</Text></View>}
          {gst && <View style={styles.totalRow}><Text>{labels.gst}</Text><Text>{money(receipt.totals.gst)}</Text></View>}
          <View style={[styles.totalRow, styles.grandTotal]}><Text>{labels.total}</Text><Text>{money(receipt.totals.total)}</Text></View>
          {receipt.totals.mrpSavings && Number(receipt.totals.mrpSavings) > 0 && (
            <View style={[styles.totalRow, styles.savings]}>
              <Text>{labels.savings}</Text>
              <Text>{money(receipt.totals.mrpSavings)}</Text>
            </View>
          )}
        </View>

        <View style={styles.payment} wrap={false}>
          <Text style={styles.paymentStatus}>{receipt.payment.statusLabel}</Text>
          <Text>{labels.paid}: {money(receipt.payment.paid)}</Text>
          <Text>{labels.remaining}: {money(receipt.payment.remaining)}</Text>
          {receipt.payment.modes.length > 0 && <Text>{labels.paymentMode}: {receipt.payment.modes.join(', ')}</Text>}
          <Text>{labels.paymentAsOf}: {displayDate(receipt.payment.asOf)}</Text>
        </View>

        {(receipt.footer || (gst && receipt.supplier.signatory)) && (
          <View style={styles.footer} fixed>
            {receipt.footer && <Text>{receipt.footer}</Text>}
            {gst && receipt.supplier.signatory && <Text>{labels.authorizedSignatory}: {receipt.supplier.signatory}</Text>}
          </View>
        )}
      </Page>
    </Document>
  );
};
