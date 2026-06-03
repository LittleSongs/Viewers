import { useEffect, useRef, useState } from 'react';
import { getCurrentRelations } from '../api/ndtClient';
import type {
  NdtCurrentImageInfo,
  NdtEvaluationRecord,
  NdtRelatedObject,
  NdtRelationResponse,
  NdtRuntimeConfig,
} from '../types';

const EMPTY_RELATIONS = {
  processedImages: [] as NdtRelatedObject[],
  snapshots: [] as NdtRelatedObject[],
  srReports: [] as NdtRelatedObject[],
  evaluations: [] as NdtEvaluationRecord[],
};

type NormalizedRelations = typeof EMPTY_RELATIONS & {
  integrityStatus?: string;
};

function normalizeRelations(data?: NdtRelationResponse | null) {
  return {
    processedImages: data?.processedImages || data?.processedImageList || [],
    snapshots: data?.snapshots || data?.snapshotList || [],
    srReports: data?.srReports || data?.srReportList || [],
    evaluations: data?.evaluations || data?.evaluationList || [],
    integrityStatus: data?.integrityStatus || data?.integrity_status,
  };
}

function getRelationKey(runtimeConfig: NdtRuntimeConfig, currentImage: NdtCurrentImageInfo) {
  return [
    runtimeConfig.taskId,
    currentImage.studyInstanceUID,
    currentImage.seriesInstanceUID,
    currentImage.sopInstanceUID,
  ].join('|');
}

export default function useNdtRelations(
  runtimeConfig: NdtRuntimeConfig,
  currentImage: NdtCurrentImageInfo
) {
  const [relations, setRelations] = useState<NormalizedRelations>(EMPTY_RELATIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const lastRelationKeyRef = useRef('');

  const relationKey = getRelationKey(runtimeConfig, currentImage);
  const canLoad =
    !!runtimeConfig.taskId &&
    !!currentImage.studyInstanceUID &&
    !!currentImage.seriesInstanceUID &&
    !!currentImage.sopInstanceUID;

  useEffect(() => {
    if (!canLoad) {
      hasFetchedRef.current = false;
      lastRelationKeyRef.current = '';
      setRelations(EMPTY_RELATIONS);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (hasFetchedRef.current && lastRelationKeyRef.current === relationKey) {
      return;
    }

    let cancelled = false;
    hasFetchedRef.current = true;
    lastRelationKeyRef.current = relationKey;
    setIsLoading(true);
    setError(null);

    getCurrentRelations(
      {
        taskId: runtimeConfig.taskId,
        studyInstanceUID: currentImage.studyInstanceUID,
        seriesInstanceUID: currentImage.seriesInstanceUID,
        sopInstanceUID: currentImage.sopInstanceUID,
      },
      runtimeConfig
    )
      .then(data => {
        if (!cancelled) {
          setRelations(normalizeRelations(data));
        }
      })
      .catch(err => {
        if (!cancelled) {
          setRelations(EMPTY_RELATIONS);
          setError(err?.message || '无法加载当前图像相关对象');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canLoad, currentImage.seriesInstanceUID, currentImage.sopInstanceUID, currentImage.studyInstanceUID, relationKey, runtimeConfig]);

  return {
    relations,
    isLoading,
    error,
  };
}
