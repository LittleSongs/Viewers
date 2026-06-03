import { useEffect, useMemo, useState } from 'react';
import { useSystem } from '@ohif/core';
import { useViewportGrid } from '@ohif/ui-next';
import { getNdtRuntimeConfig } from '../api/ndtClient';
import type { NdtCurrentImageInfo } from '../types';

const STACK_VIEWPORT_SCROLL_EVENT = 'CORNERSTONE_STACK_VIEWPORT_SCROLL';
const VOLUME_VIEWPORT_SCROLL_EVENT = 'VOLUME_VIEWPORT_SCROLL';
const IMAGE_RENDERED_EVENT = 'CORNERSTONE_IMAGE_RENDERED';

function firstDefined(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      return value as string | number;
    }
  }

  return undefined;
}

function toInstanceList(displaySet) {
  const instances = displaySet?.instances || displaySet?.images || [];
  const singleInstance = displaySet?.instance ? [displaySet.instance] : [];
  return [...instances, ...singleInstance].filter(Boolean);
}

function getCurrentImageIndex(cornerstoneViewport) {
  if (typeof cornerstoneViewport?.getCurrentImageIdIndex !== 'function') {
    return undefined;
  }

  const index = cornerstoneViewport.getCurrentImageIdIndex();
  return Number.isFinite(index) ? index : undefined;
}

function getCurrentImageId(cornerstoneViewport, viewportData, index?: number) {
  if (typeof cornerstoneViewport?.getCurrentImageId === 'function') {
    const imageId = cornerstoneViewport.getCurrentImageId();
    if (imageId) {
      return imageId;
    }
  }

  const imageIds = viewportData?.data?.[0]?.imageIds;
  return index !== undefined ? imageIds?.[index] : undefined;
}

function getCurrentInstance(displaySet, imageId?: string, imageIndex?: number) {
  const instances = toInstanceList(displaySet);
  return (
    instances.find(instance => instance?.imageId === imageId) ||
    (imageIndex !== undefined ? instances[imageIndex] : undefined) ||
    displaySet?.instance ||
    instances[0]
  );
}

function getSopInstanceUID(displaySet) {
  return firstDefined(
    displaySet?.SOPInstanceUID,
    displaySet?.instance?.SOPInstanceUID,
    displaySet?.instances?.[0]?.SOPInstanceUID
  ) as string | undefined;
}

function buildCurrentImageInfo({
  viewportGridService,
  displaySetService,
  cornerstoneViewportService,
  activeViewportId,
}: {
  viewportGridService;
  displaySetService;
  cornerstoneViewportService?;
  activeViewportId?: string;
}): NdtCurrentImageInfo {
  if (!activeViewportId) {
    return {};
  }

  const displaySetUIDs =
    viewportGridService.getDisplaySetsUIDsForViewport?.(activeViewportId) ||
    viewportGridService.getState?.()?.viewports?.get(activeViewportId)?.displaySetInstanceUIDs ||
    [];

  const displaySets = displaySetUIDs
    .map(displaySetUID => displaySetService.getDisplaySetByUID(displaySetUID))
    .filter(Boolean);
  const srDisplaySet = displaySets.find(displaySet => displaySet?.Modality === 'SR');
  const displaySet = displaySets.find(displaySet => displaySet?.Modality !== 'SR') || displaySets[0];
  const displaySetInstanceUID = displaySet?.displaySetInstanceUID || displaySetUIDs[0];
  const viewportInfo = cornerstoneViewportService?.getViewportInfo?.(activeViewportId);
  const viewportData = viewportInfo?.getViewportData?.();
  const cornerstoneViewport =
    cornerstoneViewportService?.getCornerstoneViewport?.(activeViewportId);
  const imageIndex = getCurrentImageIndex(cornerstoneViewport);
  const imageId = getCurrentImageId(cornerstoneViewport, viewportData, imageIndex);
  const instance = getCurrentInstance(displaySet, imageId, imageIndex);

  return {
    studyInstanceUID: firstDefined(instance?.StudyInstanceUID, displaySet?.StudyInstanceUID) as
      | string
      | undefined,
    seriesInstanceUID: firstDefined(instance?.SeriesInstanceUID, displaySet?.SeriesInstanceUID) as
      | string
      | undefined,
    sopInstanceUID: firstDefined(instance?.SOPInstanceUID, displaySet?.SOPInstanceUID) as
      | string
      | undefined,
    seriesDescription: firstDefined(instance?.SeriesDescription, displaySet?.SeriesDescription) as
      | string
      | undefined,
    instanceNumber: firstDefined(instance?.InstanceNumber, imageIndex),
    modality: firstDefined(instance?.Modality, displaySet?.Modality) as string | undefined,
    seriesNumber: firstDefined(instance?.SeriesNumber, displaySet?.SeriesNumber),
    integrityStatus: firstDefined(displaySet?.integrityStatus, instance?.integrityStatus) as
      | string
      | undefined,
    displaySetInstanceUID,
    imageId,
    srSopInstanceUID: getSopInstanceUID(srDisplaySet),
    srSeriesInstanceUID: firstDefined(
      srDisplaySet?.SeriesInstanceUID,
      srDisplaySet?.instance?.SeriesInstanceUID,
      srDisplaySet?.instances?.[0]?.SeriesInstanceUID
    ) as string | undefined,
    srDisplaySetInstanceUID: srDisplaySet?.displaySetInstanceUID,
    srSeriesDescription: firstDefined(
      srDisplaySet?.SeriesDescription,
      srDisplaySet?.instance?.SeriesDescription
    ) as string | undefined,
  };
}

export default function useNdtViewerContext() {
  const { servicesManager } = useSystem();
  const [{ activeViewportId }] = useViewportGrid();
  const { viewportGridService, displaySetService, cornerstoneViewportService } =
    servicesManager.services as AppTypes.Services;

  const runtimeConfig = useMemo(() => getNdtRuntimeConfig(), []);
  const [currentImage, setCurrentImage] = useState<NdtCurrentImageInfo>(() =>
    buildCurrentImageInfo({
      viewportGridService,
      displaySetService,
      cornerstoneViewportService,
      activeViewportId,
    })
  );

  useEffect(() => {
    const updateCurrentImage = () => {
      setCurrentImage(
        buildCurrentImageInfo({
          viewportGridService,
          displaySetService,
          cornerstoneViewportService,
          activeViewportId,
        })
      );
    };

    updateCurrentImage();

    const subscriptions = [
      viewportGridService.subscribe?.(
        viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
        updateCurrentImage
      ),
      viewportGridService.subscribe?.(
        viewportGridService.EVENTS.GRID_STATE_CHANGED,
        updateCurrentImage
      ),
      cornerstoneViewportService?.subscribe?.(
        cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
        updateCurrentImage
      ),
      displaySetService?.subscribe?.(
        displaySetService.EVENTS.DISPLAY_SETS_ADDED,
        updateCurrentImage
      ),
      displaySetService?.subscribe?.(
        displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
        updateCurrentImage
      ),
      displaySetService?.subscribe?.(
        displaySetService.EVENTS.DISPLAY_SETS_REMOVED,
        updateCurrentImage
      ),
    ].filter(Boolean);

    const element = cornerstoneViewportService?.getViewportInfo?.(activeViewportId)?.getElement?.();
    element?.addEventListener(STACK_VIEWPORT_SCROLL_EVENT, updateCurrentImage);
    element?.addEventListener(VOLUME_VIEWPORT_SCROLL_EVENT, updateCurrentImage);
    element?.addEventListener(IMAGE_RENDERED_EVENT, updateCurrentImage);

    return () => {
      subscriptions.forEach(subscription => subscription.unsubscribe());
      element?.removeEventListener(STACK_VIEWPORT_SCROLL_EVENT, updateCurrentImage);
      element?.removeEventListener(VOLUME_VIEWPORT_SCROLL_EVENT, updateCurrentImage);
      element?.removeEventListener(IMAGE_RENDERED_EVENT, updateCurrentImage);
    };
  }, [activeViewportId, cornerstoneViewportService, displaySetService, viewportGridService]);

  return {
    runtimeConfig,
    currentImage,
  };
}
