import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('web login layout contract', () => {
  it('keeps the desktop form compact while allowing the mobile form to fit its viewport', () => {
    const css = readFileSync('src/index.css', 'utf8');
    expect(css).toMatch(/\.login-page-content\s*\{[^}]*max-width:\s*28rem/s);
    expect(css).toMatch(/\.login-page-layout[\s\S]*overflow-x:\s*clip/);
  });
});
