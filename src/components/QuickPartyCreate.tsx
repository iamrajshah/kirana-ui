import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateCustomerMutation } from '@core/api/customerApi';
import { useCreateSupplierMutation, type Supplier } from '@core/api/supplierApi';
import type { Customer } from '@core/types';
import { apiErrorMessage } from '@core/services/notificationService';
import { advanceOnEnter } from './keyboardNavigation';

type Props =
  | { kind: 'customer'; onCreated: (party: Customer) => void }
  | { kind: 'supplier'; onCreated: (party: Supplier) => void };
export function QuickPartyCreate(props: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [createCustomer, customerState] = useCreateCustomerMutation();
  const [createSupplier, supplierState] = useCreateSupplierMutation();
  const busy = customerState.isLoading || supplierState.isLoading;
  const valid = name.trim() && /^\d{10,15}$/.test(phone.trim());
  return (
    <div className="p-3">
      <button
        type="button"
        className="min-h-touch font-semibold"
        onClick={() => setOpen(!open)}
        disabled={busy}
      >
        + {t(props.kind === 'customer' ? 'customers.addCustomer' : 'suppliers.addSupplier')}
      </button>
      {open && (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!valid || busy) return;
            setError('');
            try {
              if (props.kind === 'customer')
                props.onCreated(
                  (await createCustomer({ name: name.trim(), phone: phone.trim() }).unwrap()).data
                );
              else
                props.onCreated(
                  (await createSupplier({ name: name.trim(), phone: phone.trim() }).unwrap()).data
                );
              setOpen(false);
              setName('');
              setPhone('');
            } catch (cause) {
              setError(apiErrorMessage(cause, t('common.error')));
            }
          }}
        >
          <label className="block">
            {t(props.kind === 'customer' ? 'customers.customerName' : 'suppliers.supplierName')}
            <input
              autoFocus
              required
              maxLength={100}
              className="block w-full border rounded-lg p-3"
              style={{ background: 'var(--ion-background-color)', color: 'var(--ion-text-color)' }}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={advanceOnEnter}
            />
          </label>
          <label className="block">
            {t('customers.customerPhone')}
            <input
              required
              type="tel"
              maxLength={15}
              pattern="[0-9]{10,15}"
              className="block w-full border rounded-lg p-3"
              style={{ background: 'var(--ion-background-color)', color: 'var(--ion-text-color)' }}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onKeyDown={advanceOnEnter}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button
            type="submit"
            className="min-h-touch border rounded-lg px-4"
            disabled={!valid || busy}
          >
            {t('common.save')}
          </button>
          <button
            type="button"
            className="min-h-touch px-4"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            {t('common.cancel')}
          </button>
        </form>
      )}
    </div>
  );
}
