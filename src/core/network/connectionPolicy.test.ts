import { describe, expect, it } from 'vitest';
import { isConstrainedConnection } from './connectionPolicy';

describe('isConstrainedConnection', () => {
  it.each([
    [{ saveData: true }, true],
    [{ effectiveType: 'slow-2g' }, true],
    [{ effectiveType: '2g' }, true],
    [{ effectiveType: '3g' }, false],
    [{ effectiveType: '4g' }, false],
    [undefined, false],
  ] as const)('classifies %j as constrained=%s', (connection, expected) => {
    expect(isConstrainedConnection(connection)).toBe(expected);
  });
});
