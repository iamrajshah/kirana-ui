import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

const Probe = ({ value }: { value: string }) => {
  const debouncedValue = useDebouncedValue(value, 300);
  return <span>{debouncedValue}</span>;
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('keeps the current value visible until the delay elapses', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Probe value="rice" />);

    rerender(<Probe value="salt" />);
    expect(screen.getByText('rice')).toBeTruthy();

    act(() => vi.advanceTimersByTime(299));
    expect(screen.getByText('rice')).toBeTruthy();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('salt')).toBeTruthy();
  });

  it('cancels a superseded value', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Probe value="r" />);

    rerender(<Probe value="ri" />);
    act(() => vi.advanceTimersByTime(200));
    rerender(<Probe value="rice" />);
    act(() => vi.advanceTimersByTime(299));
    expect(screen.getByText('r')).toBeTruthy();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('rice')).toBeTruthy();
  });
});
