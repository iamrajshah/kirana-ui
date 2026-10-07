import { expect, it } from 'vitest';
import { apiErrorMessage } from './notificationService';

it('prefers the API response message over a direct message', () => {
  const error = { data: { message: 'Insufficient stock' }, message: 'Request failed' };
  expect(apiErrorMessage(error, 'Try again', true)).toBe('Insufficient stock');
});

it('uses the fallback when the API message is missing or malformed', () => {
  expect(apiErrorMessage({ data: { message: 42 } }, 'Try again')).toBe('Try again');
  expect(apiErrorMessage({ data: {} }, 'Try again')).toBe('Try again');
});

it('only uses direct errors when the caller opts in', () => {
  expect(apiErrorMessage(new Error('Network lost'), 'Try again')).toBe('Try again');
  expect(apiErrorMessage(new Error('Network lost'), 'Try again', true)).toBe('Network lost');
  expect(apiErrorMessage('Offline', 'Try again')).toBe('Try again');
  expect(apiErrorMessage('Offline', 'Try again', true)).toBe('Offline');
});
