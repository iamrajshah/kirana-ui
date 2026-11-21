import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('never registers an inline modal as a second Ionic routed page', () => {
  const violations: string[] = [];
  const inspect = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (file.endsWith('.tsx') && !file.includes('.test.')) {
        const source = ts.createSourceFile(
          file,
          readFileSync(file, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX
        );
        const visit = (node: ts.Node, inModal: boolean) => {
          const tag = ts.isJsxElement(node) ? node.openingElement.tagName.getText(source) : '';
          if (inModal && tag === 'IonPage') {
            const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            violations.push(`${file}:${line}`);
          }
          ts.forEachChild(node, (child) => visit(child, inModal || tag === 'IonModal'));
        };
        visit(source, false);
      }
    }
  };
  inspect(path.resolve('src'));
  // IonPage inherits the surrounding router stack even inside an overlay.
  // Use the modal delegate/plain layout container; actual registration is also
  // exercised by PaymentsPage.test and the native post-payment journey.
  expect(violations).toEqual([]);
});
