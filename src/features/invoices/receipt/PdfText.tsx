import React from 'react';
import { Text as ReactPdfText, type TextProps } from '@react-pdf/renderer';

const fontRuns = (value: string) => value.match(/[ऀ-ॿ]+|[઀-૿]+|[^ऀ-ॿ઀-૿]+/gu) ?? [];

const familyForRun = (value: string) => {
  if (/^[઀-૿]/u.test(value)) return 'Receipt Gujarati';
  if (/^[ऀ-ॿ]/u.test(value)) return 'Receipt Devanagari';
  return 'Receipt Latin';
};

export const PdfText: React.FC<React.PropsWithChildren<TextProps>> = ({ children, ...props }) => {
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
