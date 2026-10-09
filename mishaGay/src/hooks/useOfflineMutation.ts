import { useState } from 'react';
import { contractsAPI, type CreateContractPayload, type UpdateContractPayload } from '../api/contracts';
export function useOfflineMutation() {
  const [state, setState] = useState<{ isLoading: boolean; error: Error | null }>({ isLoading: false, error: null });
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    setState({ isLoading: true, error: null });
    try { const result = await operation(); setState({ isLoading: false, error: null }); return result; }
    catch (err) { const error = err instanceof Error ? err : new Error(String(err)); setState({ isLoading: false, error }); throw error; }
  }
  return {
    state,
    createContract: (data: CreateContractPayload) => run(() => contractsAPI.createContract(data)),
    updateContract: (offlineId: string, patch: UpdateContractPayload) => run(() => contractsAPI.update(undefined, patch, offlineId)),
    closeContract: (offlineId: string, payload?: Parameters<typeof contractsAPI.close>[1]) => run(() => contractsAPI.close(undefined, payload, offlineId)),
  };
}
