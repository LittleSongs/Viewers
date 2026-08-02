import type {
  NdtDefectPayload,
  NdtDefectRecord,
  NdtEvaluationPayload,
  NdtEvaluationRecord,
  NdtObjectTreeResponse,
  NdtRuntimeConfig,
} from '../types';

export const DEFAULT_RUOYI_API_BASE = 'http://localhost:8080';
export const TOKEN_SESSION_KEY = 'ndt.ruoyiToken';

type RuntimeConfigOptions = {
  search?: string;
  storage?: Storage | null;
};

function getWindowSearch() {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function getWindowStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function parseTaskId(value: string | null) {
  if (!value) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}

export function normalizeRuoyiApiBase(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : DEFAULT_RUOYI_API_BASE;
}

function removeTokenFromAddressBar() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('token')) return;
  url.searchParams.delete('token');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function getNdtRuntimeConfig(options: RuntimeConfigOptions = {}): NdtRuntimeConfig {
  const search = options.search ?? getWindowSearch();
  const storage = options.storage === undefined ? getWindowStorage() : options.storage;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const launchToken = params.get('token') || undefined;
  if (launchToken && storage) {
    storage.setItem(TOKEN_SESSION_KEY, launchToken);
  }
  if (launchToken && options.search === undefined) {
    removeTokenFromAddressBar();
  }

  return {
    ruoyiApiBase: normalizeRuoyiApiBase(params.get('ruoyiApiBase')),
    taskId: parseTaskId(params.get('taskId')),
    studyId: parseTaskId(params.get('studyId')),
    token: launchToken || storage?.getItem(TOKEN_SESSION_KEY) || undefined,
    canEvaluate: params.get('canEvaluate') === 'true',
  };
}

export function buildAuthHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, '')}` } : {};
}

function buildUrl(path: string, config: NdtRuntimeConfig, query?: Record<string, unknown>) {
  const url = new URL(`${config.ruoyiApiBase}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function requestJson<T>(
  path: string,
  config: NdtRuntimeConfig,
  options: RequestInit & { query?: Record<string, unknown> } = {}
): Promise<T> {
  const { query, headers, ...rest } = options;
  const response = await fetch(buildUrl(path, config, query), {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...buildAuthHeaders(config.token),
      ...headers,
    },
    credentials: 'same-origin',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || (body?.code && body.code !== 200)) {
    throw new Error(body?.msg || body?.message || `RuoYi API request failed: ${response.status}`);
  }
  return body as T;
}

function unwrapData<T>(body: { data?: T } | T): T {
  return (body as { data?: T }).data ?? (body as T);
}

export async function getObjectTree(
  taskId: NdtRuntimeConfig['taskId'],
  studyId: NdtRuntimeConfig['studyId'],
  config: NdtRuntimeConfig
): Promise<NdtObjectTreeResponse> {
  const body = await requestJson<{ data?: NdtObjectTreeResponse } | NdtObjectTreeResponse>(
    `/ndt/task/${encodeURIComponent(String(taskId))}/object-tree`,
    config,
    { query: { studyId } }
  );
  return unwrapData(body);
}

export async function createDefect(
  payload: NdtDefectPayload,
  config: NdtRuntimeConfig
): Promise<NdtDefectRecord> {
  const body = await requestJson<{ data?: NdtDefectRecord } | NdtDefectRecord>(
    '/ndt/defect',
    config,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return unwrapData(body);
}

export async function updateDefect(
  payload: NdtDefectPayload & { id: NdtDefectRecord['id'] },
  config: NdtRuntimeConfig
) {
  return requestJson('/ndt/defect', config, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function listDefects(
  originalObjectId: NdtDefectPayload['originalObjectId'],
  config: NdtRuntimeConfig
): Promise<NdtDefectRecord[]> {
  const body = await requestJson<{ rows?: NdtDefectRecord[] }>(
    '/ndt/defect/list',
    config,
    { query: { originalObjectId, pageNum: 1, pageSize: 1000 } }
  );
  return body.rows || [];
}

export async function createEvaluation(
  payload: NdtEvaluationPayload,
  config: NdtRuntimeConfig
): Promise<NdtEvaluationRecord> {
  const body = await requestJson<{ data?: NdtEvaluationRecord } | NdtEvaluationRecord>(
    '/ndt/evaluation',
    config,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return unwrapData(body);
}

export async function updateEvaluation(
  payload: NdtEvaluationPayload & { id: NdtEvaluationRecord['id'] },
  config: NdtRuntimeConfig
) {
  return requestJson('/ndt/evaluation', config, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function listEvaluations(
  defectId: NdtDefectRecord['id'],
  config: NdtRuntimeConfig
): Promise<NdtEvaluationRecord[]> {
  const body = await requestJson<{ rows?: NdtEvaluationRecord[] }>(
    '/ndt/evaluation/list',
    config,
    { query: { defectId, pageNum: 1, pageSize: 1000 } }
  );
  return body.rows || [];
}

export async function submitEvaluation(id: NdtEvaluationRecord['id'], config: NdtRuntimeConfig) {
  return requestJson(`/ndt/evaluation/${encodeURIComponent(String(id))}/submit`, config, {
    method: 'POST',
  });
}

function toFile(blob: Blob, fileName: string) {
  return blob instanceof File ? blob : new File([blob], fileName, { type: 'application/dicom' });
}

export async function submitEvaluationWithSr(
  evaluationId: NdtEvaluationRecord['id'],
  sourceObjectId: NdtDefectPayload['originalObjectId'],
  srFile: Blob,
  config: NdtRuntimeConfig
) {
  const formData = new FormData();
  formData.append('sourceObjectId', String(sourceObjectId));
  formData.append('srFile', toFile(srFile, `ndt-evaluation-${evaluationId}.dcm`));
  return requestJson(
    `/ndt/evaluation/${encodeURIComponent(String(evaluationId))}/submit-with-sr`,
    config,
    { method: 'POST', body: formData }
  );
}

export async function getObjectRelations(objectId: string | number, config: NdtRuntimeConfig) {
  const body = await requestJson<{ data?: unknown[] }>(
    `/ndt/dicom/object/${encodeURIComponent(String(objectId))}/relations`,
    config
  );
  return body.data || [];
}
