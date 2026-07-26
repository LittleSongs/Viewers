import { useEffect, useState } from 'react';
import { getEvaluationHistory } from '../api/ndtClient';
import type { NdtEvaluationHistoryResponse, NdtRuntimeConfig } from '../types';

const EMPTY_HISTORY: NdtEvaluationHistoryResponse = { parts: [] };

export default function useNdtEvaluationHistory(
  runtimeConfig: NdtRuntimeConfig,
  sopInstanceUID?: string
) {
  const [history, setHistory] = useState<NdtEvaluationHistoryResponse>(EMPTY_HISTORY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runtimeConfig.taskId || !sopInstanceUID) {
      setHistory(EMPTY_HISTORY);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getEvaluationHistory(runtimeConfig.taskId, sopInstanceUID, runtimeConfig)
      .then(data => {
        if (!cancelled) setHistory(data || EMPTY_HISTORY);
      })
      .catch(reason => {
        if (!cancelled) {
          setHistory(EMPTY_HISTORY);
          setError(reason?.message || '无法加载评定历史');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runtimeConfig, sopInstanceUID]);

  return { history, isLoading, error };
}
