import { SelectionControl } from '@components/SelectionControl';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetProductTaxQuery,
  usePreviewProductTaxMutation,
  useApplyProductTaxMutation,
  type TaxReviewInput,
  type TaxReviewResult,
  type TaxValues,
} from '@core/api/productTaxApi';
import { apiErrorMessage } from '@core/services/notificationService';
import { taxDraft, parseTaxDraft, type TaxDraft } from './productTax.logic';
import './product-tax-workspace.css';
import './productTax.translations';

const keys: Array<keyof TaxValues> = [
  'hsnCode',
  'gstPercent',
  'uqcCode',
  'unitLabel',
  'uqcQuantityFactor',
];
const uqcCodes = [
  'BAG',
  'BAL',
  'BDL',
  'BOX',
  'BTL',
  'CTN',
  'DOZ',
  'GMS',
  'KGS',
  'LTR',
  'MLT',
  'MTR',
  'NOS',
  'PAC',
  'PCS',
  'SET',
];
export default function ProductTaxWorkspace({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, TaxDraft>>({});
  const [expected, setExpected] = useState<Record<string, TaxValues>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkHsn, setBulkHsn] = useState('');
  const [bulkGst, setBulkGst] = useState('');
  const [review, setReview] = useState<{ input: TaxReviewInput; result: TaxReviewResult } | null>(
    null
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [discard, setDiscard] = useState(false);
  const {
    currentData: data,
    isFetching,
    isError,
    refetch,
  } = useGetProductTaxQuery({
    skip,
    take: 25,
    search: query,
    incomplete,
  });
  const [preview, { isLoading: previewing }] = usePreviewProductTaxMutation();
  const [apply, { isLoading: applying }] = useApplyProductTaxMutation();
  const rows = data?.data.rows ?? [];
  const dirty = Object.keys(drafts).length > 0;
  const busy = previewing || applying;
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || applying) event.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, applying]);
  const edit = (id: string, key: keyof TaxValues, value: string) => {
    setReview(null);
    setSaved(false);
    setError('');
    const source = rows.find((row) => row.variantId === id)!;
    setExpected((current) => {
      const next = { ...current };
      for (const row of rows.filter((row) =>
        key === 'hsnCode' ? row.productId === source.productId : row.variantId === id
      )) {
        next[row.variantId] ??= { ...row.values };
      }
      return next;
    });
    setDrafts((current) => {
      const next = { ...current };
      const source = rows.find((row) => row.variantId === id)!;
      for (const row of rows.filter((row) =>
        key === 'hsnCode' ? row.productId === source.productId : row.variantId === id
      )) {
        next[row.variantId] = { ...(next[row.variantId] ?? taxDraft(row.values)), [key]: value };
      }
      return next;
    });
  };
  const reviewEdits = async () => {
    setError('');
    const changed = rows.filter((row) => drafts[row.variantId]);
    const values = changed.map((row) => parseTaxDraft(drafts[row.variantId]));
    if (values.some((value) => !value)) {
      setError(t('taxWorkspace.invalid'));
      return;
    }
    const input: TaxReviewInput = {
      rows: changed.map((row, index) => ({
        variantId: row.variantId,
        expected: expected[row.variantId],
        values: values[index]!,
      })),
    };
    try {
      const response = await preview(input).unwrap();
      setReview({ input, result: response.data });
    } catch (failure) {
      setError(apiErrorMessage(failure, t('taxWorkspace.failed')));
    }
  };
  const confirm = async () => {
    if (!review) return;
    try {
      await apply(review.input).unwrap();
      setDrafts({});
      setExpected({});
      setReview(null);
      setSaved(true);
      setSelected([]);
    } catch (failure) {
      setError(apiErrorMessage(failure, t('taxWorkspace.failed')));
      setReview(null);
    }
  };
  return (
    <section className="tax-workspace">
      <header>
        <h2>{t('taxWorkspace.title')}</h2>
        <button
          type="button"
          disabled={busy}
          onClick={() => (dirty ? setDiscard(true) : onClose())}
        >
          {t('common.close')}
        </button>
      </header>
      <p>{t('taxWorkspace.explanation')}</p>
      <p>{t('taxWorkspace.sharedHsn')}</p>
      {discard && (
        <div role="alert">
          <p>{t('taxWorkspace.discardPrompt')}</p>
          <button type="button" onClick={onClose}>
            {t('taxWorkspace.discard')}
          </button>
          <button type="button" onClick={() => setDiscard(false)}>
            {t('common.cancel')}
          </button>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSkip(0);
          setQuery(search.trim());
        }}
      >
        <label>
          {t('common.search')}
          <input
            value={search}
            disabled={dirty || busy}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button disabled={dirty || busy}>{t('common.search')}</button>
        <label>
          <input
            type="checkbox"
            checked={incomplete}
            disabled={dirty || busy}
            onChange={(event) => {
              setIncomplete(event.target.checked);
              setSkip(0);
            }}
          />
          {t('taxWorkspace.incompleteOnly')}
        </label>
      </form>
      {isError && (
        <div role="alert">
          {t('taxWorkspace.failed')}
          <button type="button" onClick={() => void refetch()}>
            {t('common.retry')}
          </button>
        </div>
      )}
      {isFetching && <p role="status">{t('common.loading')}</p>}
      {saved && <p role="status">{t('taxWorkspace.saved')}</p>}
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy || !!review || isFetching}>
        <legend>{t('taxWorkspace.bulk')}</legend>
        <label>
          {t('taxFields.hsnCode')}
          <input
            value={bulkHsn}
            maxLength={8}
            onChange={(event) => setBulkHsn(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => selected.forEach((id) => edit(id, 'hsnCode', bulkHsn))}
        >
          {t('taxWorkspace.applyHsn')}
        </button>
        <label>
          {t('products.gstLabel')}
          <input
            value={bulkGst}
            inputMode="decimal"
            onChange={(event) => setBulkGst(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => selected.forEach((id) => edit(id, 'gstPercent', bulkGst))}
        >
          {t('taxWorkspace.applyGst')}
        </button>
      </fieldset>
      <div className="tax-table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('taxWorkspace.select')}</th>
              <th>{t('products.title')}</th>
              {keys.map((key) => (
                <th key={key}>{t(`taxWorkspace.${key}`)}</th>
              ))}
              <th>{t('taxWorkspace.completeness')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.variantId}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={t('taxWorkspace.selectRow', {
                      name: row.productName,
                      sku: row.sku ?? row.variantId,
                    })}
                    checked={selected.includes(row.variantId)}
                    disabled={busy || !!review}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, row.variantId]
                          : current.filter((id) => id !== row.variantId)
                      )
                    }
                  />
                </td>
                <th scope="row">
                  {row.productName}
                  <small>{[row.sku, row.brand, row.size].filter(Boolean).join(' · ')}</small>
                </th>
                {keys.map((key) => (
                  <td key={key}>
                    {key === 'uqcCode' ? (
                      <SelectionControl
                        aria-label={`${t(`taxWorkspace.${key}`)} ${row.sku ?? row.variantId}`}
                        disabled={busy || !!review || isFetching}
                        value={(drafts[row.variantId] ?? taxDraft(row.values))[key]}
                        onChange={(event) => edit(row.variantId, key, event.target.value)}
                      >
                        <option value="">{t('taxWorkspace.notSet')}</option>
                        {uqcCodes.map((code) => (
                          <option key={code}>{code}</option>
                        ))}
                      </SelectionControl>
                    ) : (
                      <input
                        aria-label={`${t(`taxWorkspace.${key}`)} ${row.sku ?? row.variantId}`}
                        inputMode={
                          key === 'hsnCode' ? 'numeric' : key === 'unitLabel' ? 'text' : 'decimal'
                        }
                        disabled={busy || !!review || isFetching}
                        value={(drafts[row.variantId] ?? taxDraft(row.values))[key]}
                        placeholder={t('taxWorkspace.notSet')}
                        onChange={(event) => edit(row.variantId, key, event.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td>
                  {row.missing.length
                    ? row.missing.map((fact) => t(`taxWorkspace.missing.${fact}`)).join(', ')
                    : t('taxWorkspace.complete')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isFetching && !rows.length && <p>{t('taxWorkspace.empty')}</p>}
      <nav aria-label={t('taxWorkspace.pages')}>
        <button
          type="button"
          disabled={skip === 0 || dirty || busy || isFetching}
          onClick={() => setSkip(skip - 25)}
        >
          {t('taxWorkspace.previous')}
        </button>
        <span>
          {skip + (rows.length ? 1 : 0)}–{skip + rows.length} / {data?.data.total ?? 0}
        </span>
        <button
          type="button"
          disabled={skip + 25 >= (data?.data.total ?? 0) || dirty || busy || isFetching}
          onClick={() => setSkip(skip + 25)}
        >
          {t('taxWorkspace.next')}
        </button>
      </nav>
      {dirty && !review && (
        <div>
          <button type="button" disabled={busy || isFetching} onClick={() => void reviewEdits()}>
            {t('taxWorkspace.preview')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDrafts({});
              setExpected({});
              setError('');
              void refetch();
            }}
          >
            {t('taxWorkspace.discard')}
          </button>
        </div>
      )}
      {review && (
        <section aria-label={t('taxWorkspace.review')}>
          <h3>{t('taxWorkspace.review')}</h3>
          <p>{t('taxWorkspace.changed', { count: review.result.changedCount })}</p>
          {review.result.changes
            .filter((row) => row.changed)
            .map((row) => (
              <div key={row.variantId}>
                <strong>{row.productName}</strong>
                <ul>
                  {keys
                    .filter((key) => row.before[key] !== row.after[key])
                    .map((key) => (
                      <li key={key}>
                        {t(`taxWorkspace.${key}`)}: {row.before[key] ?? t('taxWorkspace.notSet')} →{' '}
                        {row.after[key] ?? t('taxWorkspace.notSet')}
                      </li>
                    ))}
                </ul>
                {row.missing.length > 0 && <p>{t('taxWorkspace.stillIncomplete')}</p>}
              </div>
            ))}
          <button
            type="button"
            disabled={busy || !review.result.changedCount}
            onClick={() => void confirm()}
          >
            {t('taxWorkspace.confirm')}
          </button>
          <button type="button" disabled={busy} onClick={() => setReview(null)}>
            {t('common.back')}
          </button>
        </section>
      )}
    </section>
  );
}
