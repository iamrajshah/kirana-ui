import React from 'react';
import { Document, Page, View, Svg, Rect, Path, pdf } from '@react-pdf/renderer';
import { registerReceiptFonts } from '../invoices/receipt/pdfFonts';
import { PdfText as Text } from '../invoices/receipt/PdfText';
import type { BarcodeLabelProps } from './ProductBarcodeLabelModal';
import { encodeEan13 } from './ean13';
import {
  BARCODE_LABELS_PER_PAGE,
  EXTENDED_LABELS_PER_PAGE,
  QR_LABELS_PER_PAGE,
  paginateBarcodeCopies,
} from './barcodePrintLayout';

const mm = (value: number) => (value * 72) / 25.4;

export const renderBarcodeLabelPdf = async (
  label: BarcodeLabelProps,
  copies: number
): Promise<Blob> => {
  const bits = encodeEan13(label.barcode);
  if (!bits || !Number.isInteger(copies) || copies < 1 || copies > 1000) {
    throw new Error('Invalid barcode label print job');
  }
  registerReceiptFonts();
  const qr = label.format === 'qr';
  const extended = label.format === 'extended';
  const height = mm(qr ? 65 : extended ? 50 : 35);
  const pageSize = qr
    ? QR_LABELS_PER_PAGE
    : extended
      ? EXTENDED_LABELS_PER_PAGE
      : BARCODE_LABELS_PER_PAGE;
  const pages = paginateBarcodeCopies(copies, pageSize);
  const line = { fontSize: 4.5, lineHeight: 1, maxLines: 1 as const };
  return pdf(
    <Document title={label.productName}>
      {pages.map((page, index) => (
        <Page
          key={index}
          size="A4"
          style={{ padding: mm(10), backgroundColor: '#fff', color: '#000' }}
        >
          <View
            style={{
              width: mm(184),
              alignSelf: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: mm(3),
            }}
          >
            {page.map((copy) => (
              <View
                key={copy}
                wrap={false}
                style={{
                  width: mm(58),
                  height,
                  border: '0.3pt solid #777',
                  padding: 3,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {label.demoMarker && (
                  <Text style={{ fontSize: 3.5, lineHeight: 1 }}>{label.demoMarker}</Text>
                )}
                <Text style={{ fontSize: 5.5, lineHeight: 1, maxLines: 1 }}>
                  {label.options.showShopName ? label.shopName : label.storePackedItemLabel}
                </Text>
                <Text style={{ fontSize: 7, lineHeight: 1, maxLines: 2, fontWeight: 700 }}>
                  {label.productName}
                </Text>
                {label.variantLabel && <Text style={line}>{label.variantLabel}</Text>}
                {label.options.showPrice && (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={{ fontSize: 8, lineHeight: 1, fontWeight: 700 }}>
                      {label.sellingPriceLabel}
                    </Text>
                    {label.showMrp && (
                      <Text style={line}>{`${label.mrpLabel} ${label.mrpPriceLabel}`}</Text>
                    )}
                  </View>
                )}
                {label.details.map((detail, detailIndex) => (
                  <Text key={detailIndex} style={line}>
                    {detail}
                  </Text>
                ))}
                <View style={{ marginTop: 'auto', alignItems: 'center', flexShrink: 0 }}>
                  <Svg width={mm(50)} height={38} viewBox="0 0 113 50">
                    <Rect width={113} height={50} fill="#fff" />
                    {bits
                      .split('')
                      .map((bit, bitIndex) =>
                        bit === '1' ? (
                          <Rect
                            key={bitIndex}
                            x={bitIndex + 11}
                            y={1}
                            width={1}
                            height={44}
                            fill="#000"
                          />
                        ) : null
                      )}
                  </Svg>
                  {label.options.showBarcodeNumber && (
                    <Text style={{ fontSize: 5, lineHeight: 1 }}>{label.barcode}</Text>
                  )}
                  {qr && label.qr && (
                    <Svg
                      width={mm(22)}
                      height={mm(22)}
                      viewBox={`0 0 ${label.qr.size} ${label.qr.size}`}
                    >
                      <Rect width={label.qr.size} height={label.qr.size} fill="#fff" />
                      <Path d={label.qr.path} fill="#000" />
                    </Svg>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  ).toBlob();
};
