import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLocalFirst } from '../useLocalFirst';
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));

describe('useLocalFirst', () => {
  it('renders a failed fetch even when IndexedDB produces no update', async () => {
    const { result } = renderHook(() => useLocalFirst(async () => undefined, async () => { throw new Error('offline'); }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('offline');
  });
  it('ignores failure from the previous selection', async () => {
    let fail!: (reason: Error) => void;
    const oldRequest = new Promise<void>((_resolve, reject) => { fail = reject; });
    const { result, rerender } = renderHook(({ id }) => useLocalFirst(async () => undefined,
      () => id === 1 ? oldRequest : Promise.resolve(), [id]), { initialProps: { id: 1 } });
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { fail(new Error('old response')); await Promise.resolve(); });
    expect(result.current.error).toBeNull();
  });
});
