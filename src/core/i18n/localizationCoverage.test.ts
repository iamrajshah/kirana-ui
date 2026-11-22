import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import gu from './locales/gu.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import taxEn from '../../features/products/tax-locales/en.json';
import taxHi from '../../features/products/tax-locales/hi.json';
import taxMr from '../../features/products/tax-locales/mr.json';
import taxGu from '../../features/products/tax-locales/gu.json';

import foodEn from '../../features/food-licences/locales/en.json';
import foodHi from '../../features/food-licences/locales/hi.json';
import foodMr from '../../features/food-licences/locales/mr.json';
import foodGu from '../../features/food-licences/locales/gu.json';

import workspaceEn from '../workspace/locales/en.json';
import workspaceHi from '../workspace/locales/hi.json';
import workspaceMr from '../workspace/locales/mr.json';
import workspaceGu from '../workspace/locales/gu.json';

type LocaleTree = Record<string, unknown>;

const flattenKeys = (value: LocaleTree, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, child]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object'
      ? flattenKeys(child as LocaleTree, fullKey)
      : [fullKey];
  });

const englishKeys = new Set([
  ...flattenKeys(en),
  ...flattenKeys({ taxWorkspace: taxEn, foodLicences: foodEn, workspaceLease: workspaceEn }),
]);

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
    const source = ts.createSourceFile(
      file,
      contents,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const record = (node: ts.Node, value: string) => {
      if (!/[A-Za-z]/.test(value) || value === 'Rajesh Shah (@iamrajshah)') return;
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      findings.push(`${path.relative(process.cwd(), file)}:${line} ${value}`);
    };

    const recordLiteral = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node)) record(node, node.text);
      if (ts.isTemplateExpression(node)) {
        record(
          node,
          [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join('…')
        );
      }
    };

    const recordUserExpression = (node: ts.Expression) => {
      if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
        recordLiteral(node);
        return;
      }
      if (ts.isConditionalExpression(node)) {
        recordUserExpression(node.whenTrue);
        recordUserExpression(node.whenFalse);
        return;
      }
      if (ts.isParenthesizedExpression(node)) {
        recordUserExpression(node.expression);
        return;
      }
      if (
        ts.isBinaryExpression(node) &&
        [
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
          ts.SyntaxKind.PlusToken,
        ].includes(node.operatorToken.kind)
      ) {
        recordUserExpression(node.left);
        recordUserExpression(node.right);
      }
    };

    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) record(node, node.text.trim());

      if (
        ts.isJsxAttribute(node) &&
        ts.isIdentifier(node.name) &&
        [
          'placeholder',
          'title',
          'aria-label',
          'label',
          'header',
          'message',
          'loadingText',
        ].includes(node.name.text) &&
        node.initializer
      ) {
        if (ts.isStringLiteral(node.initializer)) record(node, node.initializer.text);
        if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          recordUserExpression(node.initializer.expression);
        }
      }

      if (
        ts.isJsxExpression(node) &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
        node.expression
      ) {
        recordUserExpression(node.expression);
      }

      if (
        ts.isPropertyAssignment(node) &&
        ['label', 'header', 'message', 'text'].includes(node.name.getText(source))
      ) {
        recordLiteral(node.initializer);
      }

      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(source);
        if (
          (name === 't' || name === 'i18n.t') &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0]) &&
          !englishKeys.has(node.arguments[0].text)
        ) {
          record(node.arguments[0], `Missing translation key: ${node.arguments[0].text}`);
        }
        if (
          (['setErrorMessage', 'setToastMessage', 'setError', 'setSuccess'].includes(name) ||
            name.startsWith('notificationService.')) &&
          node.arguments[0]
        ) {
          recordLiteral(node.arguments[0]);
        }
        if (name === 'apiErrorMessage' && node.arguments[1]) {
          recordLiteral(node.arguments[1]);
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
    [workspaceHi, workspaceMr, workspaceGu].forEach((locale) =>
      expect(flattenKeys(locale).sort()).toEqual(flattenKeys(workspaceEn).sort())
    );
    const expectedKeys = flattenKeys(en).sort();
    [hi, mr, gu].forEach((locale) => expect(flattenKeys(locale).sort()).toEqual(expectedKeys));
    [taxHi, taxMr, taxGu].forEach((locale) =>
      expect(flattenKeys(locale).sort()).toEqual(flattenKeys(taxEn).sort())
    );
  });

  it('does not introduce untranslated user-facing copy in TSX files', () => {
    expect(hardCodedCopy()).toEqual([]);
  });
});

describe('Food licence translations', () => {
  it.each([foodHi, foodMr, foodGu])('has all licence keys', (locale) => {
    expect(flattenKeys(locale).sort()).toEqual(flattenKeys(foodEn).sort());
  });
});
