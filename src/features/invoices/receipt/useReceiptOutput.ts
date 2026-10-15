import { useEffect, useRef, useState } from 'react';
import { createReceiptOutputService, type ReceiptOutputService } from './outputService';

export const useReceiptOutput = (providedService?: ReceiptOutputService) => {
  const ownedService = useRef<ReceiptOutputService>();
  if (!ownedService.current) ownedService.current = createReceiptOutputService();
  const service = providedService ?? ownedService.current;
  const [state, setState] = useState(service.getState());
  useEffect(() => service.subscribe(setState), [service]);
  return {
    state,
    isBusy: state.phase === 'generating' || state.phase === 'handing-off',
    run: service.run,
  };
};
