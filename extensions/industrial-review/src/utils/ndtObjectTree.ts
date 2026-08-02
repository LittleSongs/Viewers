import type {
  NdtDicomObject,
  NdtObjectTreeResponse,
  NdtObjectType,
} from '../types';

const ROLE_ORDER: Record<NdtObjectType, number> = {
  ORIGINAL_IMAGE: 10,
  PROCESSED_IMAGE: 20,
  SCREENSHOT: 30,
  ANNOTATION_IMAGE: 40,
  PRESENTATION_STATE: 50,
  SR: 60,
  OTHER: 70,
};

const ROLE_LABELS: Record<NdtObjectType, string> = {
  ORIGINAL_IMAGE: '原始图像',
  PROCESSED_IMAGE: '处理图像',
  SCREENSHOT: '截图',
  ANNOTATION_IMAGE: '标注图像',
  PRESENTATION_STATE: '标注状态',
  SR: '结构化报告',
  OTHER: '其他对象',
};

function numericOrder(value?: string | number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.MAX_SAFE_INTEGER;
}

export function compareNdtObjects(a: NdtDicomObject, b: NdtDicomObject) {
  return (
    ROLE_ORDER[a.objectType] - ROLE_ORDER[b.objectType] ||
    String(a.createTime || '').localeCompare(String(b.createTime || '')) ||
    numericOrder(a.id as string | number) - numericOrder(b.id as string | number)
  );
}

export function normalizeNdtObjectTree(value?: any): NdtObjectTreeResponse {
  const workpieces = Array.isArray(value?.workpieces)
    ? value.workpieces.map(workpiece => ({
        id: workpiece.id,
        workpieceName: workpiece.workpieceName,
        status: workpiece.status,
        positions: Array.isArray(workpiece.positions)
          ? workpiece.positions.map(position => ({
              id: position.id,
              positionCode: position.positionCode,
              positionName: position.positionName,
              objects: Array.isArray(position.objects)
                ? [...position.objects].sort(compareNdtObjects)
                : [],
            }))
          : [],
      }))
    : [];
  return { taskId: value?.taskId, workpieces };
}

function getInstances(displaySet: any) {
  if (displaySet?.instances?.length) return displaySet.instances;
  if (displaySet?.images?.length) return displaySet.images;
  return displaySet?.instance ? [displaySet.instance] : [];
}

function getSop(instance: any) {
  return instance?.SOPInstanceUID || instance?.sopInstanceUID;
}

export function findDisplaySetForObject(object: NdtDicomObject, displaySets: any[]) {
  const sopMatch = displaySets.find(displaySet =>
    getInstances(displaySet).some(instance => getSop(instance) === object.sopInstanceUid)
  );
  if (sopMatch) return sopMatch;

  return displaySets.find(displaySet => {
    const seriesUid =
      displaySet?.SeriesInstanceUID ||
      displaySet?.seriesInstanceUID ||
      displaySet?.instance?.SeriesInstanceUID;
    return !getInstances(displaySet).length && seriesUid === object.seriesUid;
  });
}

export function getNdtObjectAvailability(object: NdtDicomObject, displaySets: any[]) {
  const displaySet = findDisplaySetForObject(object, displaySets);
  if (!displaySet) {
    return { enabled: false, reason: '当前研究中尚未加载该对象' };
  }
  const imageIndex = getInstances(displaySet).findIndex(
    instance => getSop(instance) === object.sopInstanceUid
  );
  return {
    enabled: true,
    displaySetInstanceUID: displaySet.displaySetInstanceUID,
    imageIndex: imageIndex >= 0 ? imageIndex : undefined,
  };
}

export async function navigateToNdtObject({
  object,
  displaySets,
  viewportId,
  viewportGridService,
  cornerstoneViewportService,
  commandsManager,
}: {
  object: NdtDicomObject;
  displaySets: any[];
  viewportId?: string;
  viewportGridService: any;
  cornerstoneViewportService?: any;
  commandsManager: any;
}) {
  const availability = getNdtObjectAvailability(object, displaySets);
  if (!availability.enabled || !viewportId) {
    return { ok: false, reason: availability.reason || '当前没有可用视口' };
  }

  const viewportUpdate = {
    viewportId,
    displaySetInstanceUIDs: [availability.displaySetInstanceUID],
  };
  const readyWaiter = createViewportReadyWaiter(
    cornerstoneViewportService,
    viewportId,
    availability.displaySetInstanceUID
  );
  try {
    if (typeof viewportGridService.setDisplaySetsForViewports === 'function') {
      await viewportGridService.setDisplaySetsForViewports([viewportUpdate]);
    } else {
      await Promise.resolve(viewportGridService.setDisplaySetsForViewport(viewportUpdate));
    }
    await readyWaiter.promise;
  } catch (error) {
    readyWaiter.cancel();
    return { ok: false, reason: error?.message || '目标对象加载失败' };
  }

  if (availability.imageIndex !== undefined && object.objectType !== 'SR') {
    commandsManager.runCommand('jumpToImage', {
      imageIndex: availability.imageIndex,
      viewport: { id: viewportId },
    });
  }
  return { ok: true };
}

function createViewportReadyWaiter(
  cornerstoneViewportService: any,
  viewportId: string,
  displaySetInstanceUID: string,
  timeoutMs = 5000
) {
  if (!cornerstoneViewportService?.subscribe) {
    return { promise: Promise.resolve(), cancel: () => undefined };
  }

  let subscription;
  let timeoutId;
  let settled = false;
  const cleanup = () => {
    subscription?.unsubscribe?.();
    if (timeoutId) clearTimeout(timeoutId);
  };
  const promise = new Promise<void>((resolve, reject) => {
    const eventName = cornerstoneViewportService.EVENTS?.VIEWPORT_DATA_CHANGED;
    timeoutId = setTimeout(() => {
      settled = true;
      cleanup();
      reject(new Error('目标对象加载超时'));
    }, timeoutMs);
    subscription = cornerstoneViewportService.subscribe(eventName, event => {
      const displaySetUIDs = (event?.viewportData?.data || []).map(
        item => item?.displaySetInstanceUID
      );
      if (event?.viewportId !== viewportId || !displaySetUIDs.includes(displaySetInstanceUID)) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    });
    if (settled) subscription?.unsubscribe?.();
  });

  return {
    promise,
    cancel: () => {
      if (!settled) {
        settled = true;
        cleanup();
      }
    },
  };
}

export { ROLE_ORDER, ROLE_LABELS };
