import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SearchableSelect } from './SearchableSelect';
afterEach(cleanup);
it('filters, selects by keyboard and does not submit its enclosing form', () => {
  const onChange = vi.fn();
  const submit = vi.fn();
  render(
    <form onSubmit={submit}>
      <SearchableSelect
        label="Category"
        value=""
        onChange={onChange}
        options={[
          { value: '1', label: 'Tea' },
          { value: '2', label: 'Milk' },
          { value: '3', label: 'Sugar' },
        ]}
      />
    </form>
  );
  const field = screen.getByRole('combobox');
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value: 'mi' } });
  expect(screen.getAllByRole('option')).toHaveLength(1);
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('2');
  expect(submit).not.toHaveBeenCalled();
});
it('opens initial choices with space and offers inline creation', () => {
  const create = vi.fn();
  render(
    <SearchableSelect
      label="Category"
      value=""
      onChange={vi.fn()}
      onCreate={create}
      createLabel="Create category"
      options={[{ value: '1', label: 'Tea' }]}
    />
  );
  const field = screen.getByRole('combobox');
  fireEvent.keyDown(field, { key: ' ' });
  expect(screen.getAllByRole('option')).toHaveLength(1);
  fireEvent.click(screen.getByText('Create category'));
  expect(create).toHaveBeenCalledOnce();
});
it('bounds arrow navigation and leaves composition Enter alone', () => {
  const change = vi.fn();
  render(
    <SearchableSelect
      label="Category"
      value=""
      onChange={change}
      options={[
        { value: '1', label: 'Tea' },
        { value: '2', label: 'Milk' },
      ]}
    />
  );
  const field = screen.getByRole('combobox');
  fireEvent.focus(field);
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
  expect(change).not.toHaveBeenCalled();
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(change).toHaveBeenCalledWith('2');
});
