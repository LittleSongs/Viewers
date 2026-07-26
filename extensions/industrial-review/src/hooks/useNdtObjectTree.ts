import { useEffect, useState } from 'react';
import { getObjectTree } from '../api/ndtClient';
import type { NdtObjectTreeResponse, NdtRuntimeConfig } from '../types';
import { normalizeNdtObjectTree } from '../utils/ndtObjectTree';

const EMPTY_TREE: NdtObjectTreeResponse = { parts: [], unassignedObjects: [] };

export default function useNdtObjectTree(runtimeConfig: NdtRuntimeConfig, displaySetService: any) {
  const [tree, setTree] = useState<NdtObjectTreeResponse>(EMPTY_TREE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setDisplaySetVersion] = useState(0);

  useEffect(() => {
    if (!runtimeConfig.taskId) {
      setTree(EMPTY_TREE);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getObjectTree(runtimeConfig.taskId, runtimeConfig)
      .then(data => {
        if (!cancelled) setTree(normalizeNdtObjectTree(data));
      })
      .catch(reason => {
        if (!cancelled) {
          setTree(EMPTY_TREE);
          setError(reason?.message || '无法加载检测部位对象树');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runtimeConfig]);

  useEffect(() => {
    const refresh = () => setDisplaySetVersion(version => version + 1);
    const subscriptions = [
      displaySetService?.subscribe?.(displaySetService.EVENTS.DISPLAY_SETS_ADDED, refresh),
      displaySetService?.subscribe?.(displaySetService.EVENTS.DISPLAY_SETS_CHANGED, refresh),
      displaySetService?.subscribe?.(displaySetService.EVENTS.DISPLAY_SETS_REMOVED, refresh),
    ].filter(Boolean);
    return () => subscriptions.forEach(subscription => subscription.unsubscribe());
  }, [displaySetService]);

  return { tree, isLoading, error };
}
