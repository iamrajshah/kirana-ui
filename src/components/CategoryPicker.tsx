import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetCategoriesQuery, type Category } from '@core/api/categoryApi';
import { useDebouncedValue } from '@hooks/useDebouncedValue';
import { SearchableSelect } from './SearchableSelect';
import { AddCategoryModal } from './AddCategoryModal';

export function CategoryPicker({
  value,
  onSelect,
  canCreate = false,
}: {
  value: string;
  onSelect: (category: Category | null) => void;
  canCreate?: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search, 200);
  const [creating, setCreating] = useState(false);
  const [createdCategory, setCreatedCategory] = useState<Category | null>(null);
  const { data } = useGetCategoriesQuery({ search: query });
  const fetched = data?.data ?? [];
  const options =
    createdCategory &&
    !fetched.some((category) => String(category.id) === String(createdCategory.id))
      ? [...fetched, createdCategory]
      : fetched;
  return (
    <>
      <SearchableSelect
        label={t('products.category')}
        value={value}
        onSearch={setSearch}
        options={options
          .filter((category) => category.is_active)
          .map((category) => ({ value: String(category.id), label: category.name }))}
        onChange={(id) => onSelect(options.find((category) => String(category.id) === id) ?? null)}
        onCreate={canCreate ? () => setCreating(true) : undefined}
        createLabel={t('products.addNewCategory')}
      />
      {creating && (
        <AddCategoryModal
          isOpen={creating}
          onDidDismiss={() => setCreating(false)}
          onCategoryCreated={(category) => {
            setCreatedCategory(category);
            onSelect(category);
          }}
        />
      )}
    </>
  );
}
