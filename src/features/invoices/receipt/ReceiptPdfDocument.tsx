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
import type { ReceiptPaperWidth, ReceiptViewModel } from './types';
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
  Font.register({
    family: 'Receipt Latin',
    fonts: [{ src: fontSource(latinRegular) }, { src: fontSource(latinBold), fontWeight: 700 }],
  });
  Font.register({
    family: 'Receipt Devanagari',
    fonts: [
      { src: fontSource(devanagariRegular) },
      { src: fontSource(devanagariBold), fontWeight: 700 },
    ],
  });
  Font.register({
    family: 'Receipt Gujarati',
    fonts: [
      { src: fontSource(gujaratiRegular) },
      { src: fontSource(gujaratiBold), fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
};

const fontRuns = (value: string) => value.match(/[ऀ-ॿ]+|[઀-૿]+|[^ऀ-ॿ઀-૿]+/gu) ?? [];

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
  page: { padding: 34, color: '#17211d', fontSize: 9, lineHeight: 1.4, backgroundColor: '#ffffff' },
  brandBar: { height: 5, marginBottom: 20 },
  demo: {
    border: '1.5 solid #92400e',
    color: '#92400e',
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 14,
    padding: 7,
    textAlign: 'center',
  },
  cancellation: {
    border: '2 solid #b91c1c',
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 14,
    padding: 7,
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  storeBlock: { width: '57%', paddingRight: 18 },
  store: { fontSize: 19, fontWeight: 700, lineHeight: 1.2, marginBottom: 5 },
  title: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 8,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  right: {
    width: '39%',
    flexShrink: 0,
    padding: 12,
    border: '1 solid #dbe4df',
    borderRadius: 6,
    backgroundColor: '#f7faf8',
    textAlign: 'right',
  },
  metadata: { marginTop: 3, fontSize: 8.5 },
  party: {
    border: '1 solid #dbe4df',
    borderRadius: 6,
    marginBottom: 14,
    padding: 10,
    backgroundColor: '#fbfdfc',
  },
  sectionLabel: {
    color: '#527065',
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 0.7,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  row: {
    borderBottom: '1 solid #e4ebe7',
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 8,
  },
  head: {
    borderBottom: '1.5 solid #a9bbb3',
    backgroundColor: '#edf4f0',
    fontWeight: 700,
    paddingHorizontal: 7,
  },
  item: { flexGrow: 1, width: '35%', paddingRight: 6 },
  itemName: { fontWeight: 700 },
  sku: { color: '#60736b', fontSize: 7.5, marginTop: 2 },
  cell: { textAlign: 'right', width: '13%', paddingLeft: 4 },
  hsn: { width: '13%' },
  totals: {
    alignSelf: 'flex-end',
    marginTop: 16,
    width: '52%',
    padding: 10,
    border: '1 solid #dbe4df',
    borderRadius: 6,
  },
  totalRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  grandTotal: {
    borderTop: '1.5 solid #17211d',
    fontSize: 14,
    fontWeight: 700,
    marginTop: 4,
    paddingTop: 7,
  },
  savings: {
    backgroundColor: '#e9f8ef',
    color: '#087f5b',
    fontSize: 10.5,
    fontWeight: 700,
    marginTop: 6,
    padding: 7,
    borderRadius: 4,
  },
  payment: {
    backgroundColor: '#f7faf8',
    border: '1 solid #dbe4df',
    borderRadius: 6,
    marginTop: 14,
    padding: 11,
  },
  paymentStatus: { fontSize: 11.5, fontWeight: 700, marginBottom: 6 },
  paymentRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  paymentMuted: { color: '#60736b', fontSize: 7.5, marginTop: 5 },
  footer: { color: '#475569', marginTop: 20, textAlign: 'center' },
  logo: {
    height: 42,
    marginBottom: 6,
    maxWidth: 120,
    objectFit: 'contain',
    objectPosition: 'left',
  },
  thermalPage: { padding: 9, fontSize: 7.5 },
  thermalBrandBar: { marginBottom: 9 },
  thermalHeader: { flexDirection: 'column', marginBottom: 9 },
  thermalStoreBlock: { width: '100%', paddingRight: 0, marginBottom: 7 },
  thermalStore: { fontSize: 12, marginBottom: 2 },
  thermalMetadata: {
    width: '100%',
    padding: 6,
    textAlign: 'left',
  },
  thermalTitle: { fontSize: 10, marginBottom: 3, textAlign: 'left' },
  thermalParty: { marginBottom: 8, padding: 6 },
  thermalRow: { paddingVertical: 5 },
  thermalItem: { width: '46%' },
  thermalCell: { width: '18%', paddingLeft: 2 },
  thermalTotals: { width: '100%', marginTop: 8, padding: 6 },
  thermalPayment: { marginTop: 8, padding: 6 },
  thermalFooter: { marginTop: 10 },
});

const money = (value: string) => `₹${value}`;
const displayDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

export const ReceiptPdfDocument: React.FC<{
  receipt: ReceiptViewModel;
  paperWidth?: ReceiptPaperWidth;
}> = ({ receipt, paperWidth }) => {
  registerFonts();
  const gst = receipt.mode === 'GST_TAX_INVOICE';
  const thermal = paperWidth !== undefined;
  const pageSize =
    paperWidth === '58mm'
      ? { width: 164, height: 842 }
      : paperWidth === '80mm'
        ? { width: 227, height: 842 }
        : 'A4';
  const labels = { ...defaultReceiptLabels, ...receipt.labels };

  return (
    <Document title={`${receipt.title} ${receipt.invoiceNumber}`} author={receipt.supplier.name}>
      <Page
        size={pageSize}
        style={[
          styles.page,
          { fontFamily: 'Receipt Latin' },
          receipt.branding.template === 'MODERN'
            ? { borderTop: `6 solid ${receipt.branding.brandColor}` }
            : {},
          receipt.branding.template === 'COMPACT' ? { padding: 22 } : {},
          thermal ? styles.thermalPage : {},
        ]}
      >
        <View
          style={[
            styles.brandBar,
            { backgroundColor: receipt.branding.brandColor },
            thermal ? styles.thermalBrandBar : {},
          ]}
        />
        {receipt.demoMarker && <Text style={styles.demo}>{receipt.demoMarker}</Text>}
        {receipt.cancellationMarker && (
          <Text style={styles.cancellation}>{receipt.cancellationMarker}</Text>
        )}
        <View style={[styles.header, thermal ? styles.thermalHeader : {}]}>
          <View style={[styles.storeBlock, thermal ? styles.thermalStoreBlock : {}]}>
            {receipt.branding.logoUrl && (
              <Image src={receipt.branding.logoUrl} style={styles.logo} />
            )}
            <Text
              style={[
                styles.store,
                receipt.branding.template === 'MODERN'
                  ? { color: receipt.branding.brandColor }
                  : {},
                thermal ? styles.thermalStore : {},
              ]}
            >
              {receipt.supplier.name}
            </Text>
            {receipt.supplier.address && <Text>{receipt.supplier.address}</Text>}
            {receipt.supplier.phone && <Text>{receipt.supplier.phone}</Text>}
            {gst && receipt.supplier.gstin && (
              <Text>
                {labels.gstin}: {receipt.supplier.gstin}
              </Text>
            )}
          </View>
          <View style={[styles.right, thermal ? styles.thermalMetadata : {}]}>
            <Text style={[styles.title, thermal ? styles.thermalTitle : {}]}>{receipt.title}</Text>
            <Text style={styles.metadata}>
              {labels.invoice}: {receipt.invoiceNumber}
            </Text>
            <Text style={styles.metadata}>
              {labels.date}: {displayDate(receipt.issuedAt)}
            </Text>
            {receipt.isLegacy && <Text>{labels.legacy}</Text>}
          </View>
        </View>

        <View style={[styles.party, thermal ? styles.thermalParty : {}]}>
          <Text style={styles.sectionLabel}>{labels.customer}</Text>
          {receipt.customer.kind === 'walk-in' ? (
            <Text>{receipt.customer.label}</Text>
          ) : (
            <>
              <Text>{receipt.customer.name}</Text>
              {receipt.customer.address && <Text>{receipt.customer.address}</Text>}
              {receipt.customer.phone && <Text>{receipt.customer.phone}</Text>}
              {gst && receipt.customer.gstin && (
                <Text>
                  {labels.gstin}: {receipt.customer.gstin}
                </Text>
              )}
            </>
          )}
          {gst && receipt.placeOfSupply && (
            <Text>
              {labels.placeOfSupply}: {receipt.placeOfSupply.name ?? ''}
              {receipt.placeOfSupply.stateCode ? ` (${receipt.placeOfSupply.stateCode})` : ''}
            </Text>
          )}
        </View>

        <View style={[styles.row, styles.head, thermal ? styles.thermalRow : {}]}>
          <Text style={[styles.item, thermal ? styles.thermalItem : {}]}>{labels.item}</Text>
          {!thermal && gst && <Text style={[styles.cell, styles.hsn]}>{labels.hsn}</Text>}
          <Text style={[styles.cell, thermal ? styles.thermalCell : {}]}>{labels.qty}</Text>
          <Text style={[styles.cell, thermal ? styles.thermalCell : {}]}>{labels.rate}</Text>
          {!thermal && gst && <Text style={styles.cell}>{labels.tax}</Text>}
          <Text style={[styles.cell, thermal ? styles.thermalCell : {}]}>{labels.amount}</Text>
        </View>
        {receipt.items.map((item) => (
          <View style={[styles.row, thermal ? styles.thermalRow : {}]} key={item.key} wrap={false}>
            <View style={[styles.item, thermal ? styles.thermalItem : {}]}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.sku && <Text style={styles.sku}>{item.sku}</Text>}
            </View>
            {!thermal && gst && (
              <Text style={[styles.cell, styles.hsn]}>{item.hsnCode ?? '—'}</Text>
            )}
            <Text style={[styles.cell, thermal ? styles.thermalCell : {}]}>
              {item.quantity}
              {item.unitLabel || item.uqcCode ? ` ${item.unitLabel || item.uqcCode}` : ''}
            </Text>
            <Text style={[styles.cell, thermal ? styles.thermalCell : {}]}>
              {money(item.unitPrice)}
            </Text>
            {!thermal && gst && <Text style={styles.cell}>{item.gstRate ?? '0.00'}%</Text>}
            <Text style={[styles.cell, thermal ? styles.thermalCell : {}]}>
              {money(item.lineTotal)}
            </Text>
          </View>
        ))}

        <View style={[styles.totals, thermal ? styles.thermalTotals : {}]} wrap={false}>
          <View style={styles.totalRow}>
            <Text>{labels.subtotal}</Text>
            <Text>{money(receipt.totals.subtotal)}</Text>
          </View>
          {Number(receipt.totals.discount) > 0 && (
            <View style={styles.totalRow}>
              <Text>{labels.discount}</Text>
              <Text>−{money(receipt.totals.discount)}</Text>
            </View>
          )}
          {gst && (
            <View style={styles.totalRow}>
              <Text>{labels.gst}</Text>
              <Text>{money(receipt.totals.gst)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>{labels.total}</Text>
            <Text>{money(receipt.totals.total)}</Text>
          </View>
          {receipt.totals.mrpSavings && Number(receipt.totals.mrpSavings) > 0 && (
            <View style={[styles.totalRow, styles.savings]}>
              <Text>{labels.savings}</Text>
              <Text>{money(receipt.totals.mrpSavings)}</Text>
            </View>
          )}
        </View>

        <View style={[styles.payment, thermal ? styles.thermalPayment : {}]} wrap={false}>
          <Text style={styles.paymentStatus}>{receipt.payment.statusLabel}</Text>
          <View style={styles.paymentRow}>
            <Text>{labels.paid}</Text>
            <Text>{money(receipt.payment.paid)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text>{labels.remaining}</Text>
            <Text>{money(receipt.payment.remaining)}</Text>
          </View>
          {receipt.payment.modes.length > 0 && (
            <View style={styles.paymentRow}>
              <Text>{labels.paymentMode}</Text>
              <Text>{receipt.payment.modes.join(', ')}</Text>
            </View>
          )}
          <Text style={styles.paymentMuted}>
            {labels.paymentAsOf}: {displayDate(receipt.payment.asOf)}
          </Text>
        </View>

        {(receipt.footer || (gst && receipt.supplier.signatory)) && (
          <View style={[styles.footer, thermal ? styles.thermalFooter : {}]} fixed>
            {receipt.footer && <Text>{receipt.footer}</Text>}
            {gst && receipt.supplier.signatory && (
              <Text>
                {labels.authorizedSignatory}: {receipt.supplier.signatory}
              </Text>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
};
