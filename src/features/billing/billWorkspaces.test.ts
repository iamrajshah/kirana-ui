import { beforeEach, expect, it } from 'vitest';
import { loadWorkspaces, newBillWorkspace, saveWorkspaces, workspaceKey } from './billWorkspaces';
beforeEach(() => localStorage.clear());
it('isolates both tenant and staff and keeps each bill intent independent', () => {
  const a = newBillWorkspace();
  const b = newBillWorkspace();
  a.items = [
    {
      variant_id: '1',
      product_name: 'Tea',
      quantity: 2,
      unit_price: 50,
      sku: 'TEA',
      discount_amount: 0,
      discount_type: 'amount',
    },
  ];
  const key = workspaceKey('shop-a', 'owner');
  expect(saveWorkspaces(key, { active: b.id, bills: [a, b] })).toBe(true);
  expect(loadWorkspaces(key).bills[0].items[0].quantity).toBe(2);
  expect(loadWorkspaces(key).bills[1].items).toEqual([]);
  expect(a.requestKey).not.toBe(b.requestKey);
  expect(loadWorkspaces(workspaceKey('shop-b', 'owner')).bills[0].items).toEqual([]);
  expect(loadWorkspaces(workspaceKey('shop-a', 'cashier')).bills[0].items).toEqual([]);
});
it('rejects corrupted, expired, duplicate and excessive workspaces', () => {
  const key = workspaceKey('a', 'b');
  const bill = newBillWorkspace();
  for (const state of [
    null,
    { version: 1, savedAt: 0, active: bill.id, bills: [bill] },
    { version: 1, savedAt: Date.now(), active: bill.id, bills: [bill, bill] },
    {
      version: 1,
      savedAt: Date.now(),
      active: bill.id,
      bills: [bill, ...Array.from({ length: 3 }, newBillWorkspace)],
    },
  ]) {
    localStorage.setItem(key, JSON.stringify(state));
    expect(loadWorkspaces(key).bills).toHaveLength(1);
    expect(loadWorkspaces(key).active).not.toBe(bill.id);
  }
});
