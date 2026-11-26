import { SelectionControl } from '@components/SelectionControl';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetFoodLicencesQuery, type FoodLicence } from '@core/api/foodLicenceApi';
import { useAppSelector } from '@core/hooks';
import { selectCommercialAccess, selectCurrentUser } from '@core/auth/authSlice';
import { canUseCommercialFeature } from '@core/commercial';
import './translations';
import './FoodLicences.css';

const licenceAvailable = (licence: FoodLicence, firmId: string, invoiceDate: string): boolean =>
  licence.firm_id === firmId &&
  licence.is_active &&
  (!licence.valid_from || licence.valid_from.slice(0, 10) <= invoiceDate) &&
  (!licence.expiry_date || licence.expiry_date.slice(0, 10) >= invoiceDate);

export const FoodLicenceSelector: React.FC<{
  firmId: string;
  invoiceDate: string;
  value: string;
  onChange: (id: string) => void;
}> = ({ firmId, invoiceDate, value, onChange }) => {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const access = useAppSelector(selectCommercialAccess);
  const roles = user?.roles ?? [];
  const allowed =
    roles.some((role) => role === 'OWNER' || role === 'MANAGER') &&
    canUseCommercialFeature(roles, access, 'FOOD_LICENCES');
  const { data, isFetching, isError, refetch } = useGetFoodLicencesQuery(
    { firm_id: firmId },
    { skip: !allowed || !firmId }
  );
  const licences = data?.data.licences;
  // Never submit a licence from a previous firm/date or one no longer enabled.
  useEffect(() => {
    if (
      value &&
      (!allowed ||
        !firmId ||
        (licences &&
          !licences.some(
            (licence) => licence.id === value && licenceAvailable(licence, firmId, invoiceDate)
          )))
    )
      onChange('');
  }, [allowed, firmId, invoiceDate, licences, onChange, value]);
  if (!allowed) return null;
  return (
    <div className="food-licences">
      <label>
        {t('foodLicences.purchaseLabel')}
        <SelectionControl
          aria-label={t('foodLicences.purchaseLabel')}
          value={value}
          disabled={!firmId || isFetching}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{t('foodLicences.none')}</option>
          {(licences ?? [])
            .filter((licence) => licenceAvailable(licence, firmId, invoiceDate))
            .map((licence) => (
              <option key={licence.id} value={licence.id}>
                {licence.label} · {licence.licence_number}
              </option>
            ))}
        </SelectionControl>
      </label>
      <small>{t('foodLicences.purchaseHint')}</small>
      {isError && (
        <p role="alert">
          {t('foodLicences.loadFailed')}{' '}
          <button type="button" onClick={() => void refetch()}>
            {t('foodLicences.retry')}
          </button>
        </p>
      )}
      {value && licences?.find((licence) => licence.id === value)?.expiry_date === null && (
        <p>{t('foodLicences.unknownValidity')}</p>
      )}
    </div>
  );
};
