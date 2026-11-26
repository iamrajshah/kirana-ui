import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CategoryPicker } from './CategoryPicker';
import type { Category } from '@core/api/categoryApi';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/api/categoryApi', () => ({ useGetCategoriesQuery: () => ({ data: { data: [] } }) }));
vi.mock('./AddCategoryModal', () => ({
  AddCategoryModal: ({
    onCategoryCreated,
    onDidDismiss,
  }: {
    onCategoryCreated: (category: Partial<Category>) => void;
    onDidDismiss: () => void;
  }) => (
    <button
      onClick={() => {
        onCategoryCreated({ id: 500, name: 'New category', is_active: true });
        onDidDismiss();
      }}
    >
      Finish creation
    </button>
  ),
}));
afterEach(cleanup);
it('keeps a newly created category selected outside the fetched first page', () => {
  function Form() {
    const [value, setValue] = useState('');
    return (
      <CategoryPicker
        value={value}
        canCreate
        onSelect={(category) => setValue(String(category?.id ?? ''))}
      />
    );
  }
  render(<Form />);
  fireEvent.focus(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('products.addNewCategory'));
  fireEvent.click(screen.getByText('Finish creation'));
  fireEvent.blur(screen.getByRole('combobox'));
  expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('New category');
});
