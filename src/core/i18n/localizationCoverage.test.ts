import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import gu from './locales/gu.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

type LocaleTree = Record<string, unknown>;

const flattenKeys = (value: LocaleTree, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, child]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object'
      ? flattenKeys(child as LocaleTree, fullKey)
      : [fullKey];
  });

const sourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    if (!entry.name.endsWith('.tsx') || /\.(test|spec)\.tsx$/.test(entry.name)) return [];
    return [entryPath];
  });

const hardCodedCopy = () => {
  const findings: string[] = [];

  sourceFiles(path.resolve(process.cwd(), 'src')).forEach((file) => {
    const contents = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const record = (node: ts.Node, value: string) => {
      if (!/[A-Za-z]/.test(value) || value === 'Rajesh Shah (@iamrajshah)') return;
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      findings.push(`${path.relative(process.cwd(), file)}:${line} ${value}`);
    };

    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) record(node, node.text.trim());

      if (
        ts.isJsxAttribute(node) &&
        ts.isIdentifier(node.name) &&
        ['placeholder', 'title', 'aria-label', 'label'].includes(node.name.text) &&
        node.initializer && ts.isStringLiteral(node.initializer)
      ) {
        record(node, node.initializer.text);
      }

      if (
        ts.isPropertyAssignment(node) &&
        ['label', 'header', 'message'].includes(node.name.getText(source)) &&
        ts.isStringLiteral(node.initializer)
      ) {
        record(node, node.initializer.text);
      }

      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(source);
        if (
          ['setErrorMessage', 'setToastMessage'].includes(name) &&
          node.arguments[0] && ts.isStringLiteral(node.arguments[0])
        ) {
          record(node, node.arguments[0].text);
        }
        if (name === 'apiErrorMessage' && node.arguments[1] && ts.isStringLiteral(node.arguments[1])) {
          record(node, node.arguments[1].text);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  });

  return findings;
};

describe('localization coverage', () => {
  it('keeps every supported locale aligned with English', () => {
    const englishKeys = flattenKeys(en).sort();
    [hi, mr, gu].forEach((locale) => expect(flattenKeys(locale).sort()).toEqual(englishKeys));
  });

  it('does not introduce untranslated user-facing copy in TSX files', () => {
    expect(hardCodedCopy()).toEqual([]);
  });
});
