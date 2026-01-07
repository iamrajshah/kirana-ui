import { useSelector } from 'react-redux';
import type { RootState } from '../core/store';

export const useAppSelector = useSelector.withTypes<RootState>();
