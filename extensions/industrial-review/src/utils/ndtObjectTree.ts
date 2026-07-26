import type {
  NdtObjectTreeItem,
  NdtObjectTreePart,
  NdtObjectTreeResponse,
  NdtObjectType,
} from '../types';

const ROLE_ORDER: Record<NdtObjectType, number> = {
  ORIGINAL: 10,
  PROCESSED_IMAGE: 20,
  SNAPSHOT: 30,
  PRESENTATION_STATE: 40,
  SR: 50,
  OTHER_DERIVED: 60,
};

const ROLE_LABELS: Record<NdtObjectType, string> = {
  ORIGINAL: '原始图像',
  PROCESSED_IMAGE: '处理图像',
  SNAPSHOT: '截图',
  PRESENTATION_STATE: '标注状态',
  SR: '结构化报告',
  OTHER_DERIVED: '其他衍生对象',
};

function first<T>(...values: T[]): T | undefined {
  return values.find(value => value !== undefined && value !== null && value !== ('' as T));
}

function normalizeRole(value?: string): NdtObjectType {
  return value && value in ROLE_ORDER ? (value as NdtObjectType) : 'OTHER_DERIVED';
}

function normalizeItem(value: any): NdtObjectTreeItem {
  const objectType = normalizeRole(first(value.objectType, value.object_type));
  return {
    id: value.id,
    objectType,
    label: first(value.label, ROLE_LABELS[objectType]) as string,
    studyInstanceUid: first(value.studyInstanceUid, value.study_instance_uid),
    seriesInstanceUid: first(value.seriesInstanceUid, value.series_instance_uid),
    sopInstanceUid: first(value.sopInstanceUid, value.sop_instance_uid),
    modality: value.modality,
    seriesNumber: first(value.seriesNumber, value.series_number),
    instanceNumber: first(value.instanceNumber, value.instance_number),
    seriesDescription: first(value.seriesDescription, value.series_description),
    createTime: first(value.createTime, value.create_time),
  };
}

function numericOrder(value?: string | number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.MAX_SAFE_INTEGER;
}

export function compareNdtObjects(a: NdtObjectTreeItem, b: NdtObjectTreeItem) {
  return (
    ROLE_ORDER[a.objectType] - ROLE_ORDER[b.objectType] ||
    numericOrder(a.instanceNumber) - numericOrder(b.instanceNumber) ||
    String(a.createTime || '').localeCompare(String(b.createTime || '')) ||
    numericOrder(a.id as string | number) - numericOrder(b.id as string | number)
  );
}

function normalizePart(value: any): NdtObjectTreePart {
  return {
    id: value.id,
    partNo: first(value.partNo, value.part_no),
    partName: first(value.partName, value.part_name),
    sourceDicomInstanceId: first(value.sourceDicomInstanceId, value.source_dicom_instance_id),
    sourceSopInstanceUid: first(value.sourceSopInstanceUid, value.source_sop_instance_uid),
    objects: (value.objects || []).map(normalizeItem).sort(compareNdtObjects),
  };
}

export function normalizeNdtObjectTree(value?: any): NdtObjectTreeResponse {
  const parts = (value?.parts || []).map(normalizePart).filter(part => part.objects.length);
  parts.sort((a, b) => String(a.partNo || '').localeCompare(String(b.partNo || '')));
  const unassignedObjects = (value?.unassignedObjects || value?.unassigned_objects || [])
    .map(normalizeItem)
    .sort(compareNdtObjects);
  return { parts, unassignedObjects };
}

function getInstances(displaySet: any) {
  if (displaySet?.instances?.length) return displaySet.instances;
  if (displaySet?.images?.length) return displaySet.images;
  return displaySet?.instance ? [displaySet.instance] : [];
}

function getSop(instance: any) {
  return first(instance?.SOPInstanceUID, instance?.sopInstanceUID);
}

export function findDisplaySetForObject(object: NdtObjectTreeItem, displaySets: any[]) {
  const sopMatch = displaySets.find(displaySet =>
    getInstances(displaySet).some(instance => getSop(instance) === object.sopInstanceUid)
  );
  if (sopMatch) return sopMatch;

  return displaySets.find(displaySet => {
    const seriesUid = first(
      displaySet?.SeriesInstanceUID,
      displaySet?.seriesInstanceUID,
      displaySet?.instance?.SeriesInstanceUID
    );
    return !getInstances(displaySet).length && seriesUid === object.seriesInstanceUid;
  });
}

export function getNdtObjectAvailability(object: NdtObjectTreeItem, displaySets: any[]) {
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
  object: NdtObjectTreeItem;
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
