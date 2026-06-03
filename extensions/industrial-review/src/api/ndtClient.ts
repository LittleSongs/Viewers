import type {
  NdtCurrentRelationParams,
  NdtBatchEvaluationSrPayload,
  NdtEvaluationPayload,
  NdtEvaluationRecord,
  NdtRelationResponse,
  NdtRuntimeConfig,
} from '../types';

export const DEFAULT_RUOYI_API_BASE = 'http://localhost:8080';

const TOKEN_STORAGE_KEYS = ['token', 'Admin-Token', 'ruoyi-token', 'Authorization'];

type RuntimeConfigOptions = {
  search?: string;
  storage?: Storage | null;
};

function getWindowSearch() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location?.search || '';
}

function getWindowStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredToken(storage?: Storage | null) {
  if (!storage) {
    return undefined;
  }

  for (const key of TOKEN_STORAGE_KEYS) {
    const value = storage.getItem(key);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function parseTaskId(value: string | null) {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}

function parseBooleanParam(value: string | null) {
  return value === 'true' || value === '1' || value === 'yes';
}

function parseRuntimeBoolean(value: string | null) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return parseBooleanParam(value) || value === 'false' || value === '0' || value === 'no'
    ? parseBooleanParam(value)
    : undefined;
}

export function normalizeRuoyiApiBase(value?: string | null) {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed.replace(/\/+$/, '');
  }

  return DEFAULT_RUOYI_API_BASE;
}

export function getNdtRuntimeConfig(options: RuntimeConfigOptions = {}): NdtRuntimeConfig {
  const search = options.search ?? getWindowSearch();
  const storage = options.storage === undefined ? getWindowStorage() : options.storage;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const token = params.get('token') || readStoredToken(storage);
  const taskId = parseTaskId(params.get('taskId')) ?? parseTaskId(params.get('TaskId'));
  const canEvaluate =
    parseRuntimeBoolean(params.get('canEvaluate')) ?? parseRuntimeBoolean(params.get('CanEvaluate'));

  return {
    ruoyiApiBase: normalizeRuoyiApiBase(params.get('ruoyiApiBase')),
    taskId,
    token: token || undefined,
    canEvaluate: taskId === undefined ? false : canEvaluate ?? false,
  };
}

export function buildAuthHeaders(token?: string) {
  if (!token) {
    return {};
  }

  const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  return {
    Authorization: value,
  };
}

function buildUrl(path: string, config: NdtRuntimeConfig, query?: Record<string, unknown>) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${config.ruoyiApiBase}${normalizedPath}`);

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
    credentials: 'include',
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.msg || body?.message || `RuoYi API request failed: ${response.status}`);
  }

  if (body?.code && body.code !== 200) {
    throw new Error(body.msg || body.message || `RuoYi API returned code ${body.code}`);
  }

  return body as T;
}

export async function getCurrentRelations(
  params: Record<string, unknown> & NdtCurrentRelationParams,
  config: NdtRuntimeConfig
): Promise<NdtRelationResponse> {
  const body = await requestJson<{ data?: NdtRelationResponse } | NdtRelationResponse>(
    '/ndt/dicom/relation/current',
    config,
    {
      query: params,
    }
  );

  return ('data' in body && body.data ? body.data : body) as NdtRelationResponse;
}

export async function saveEvaluation(
  payload: NdtEvaluationPayload,
  config: NdtRuntimeConfig
): Promise<unknown> {
  return requestJson('/ndt/evaluation', config, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

function appendIfPresent(formData: FormData, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== '') {
    formData.append(key, String(value));
  }
}

function toFile(blob: Blob, fileName: string) {
  if (typeof File !== 'undefined' && blob instanceof File) {
    return blob;
  }

  return new File([blob], fileName, {
    type: blob.type || 'application/dicom',
  });
}

export async function batchSubmitEvaluationWithSr(
  payload: NdtBatchEvaluationSrPayload,
  config: NdtRuntimeConfig
): Promise<unknown> {
  const formData = new FormData();
  const fileName = payload.srFileName || `ndt-evaluation-${payload.taskId}.dcm`;

  appendIfPresent(formData, 'taskId', payload.taskId);
  appendIfPresent(formData, 'studyInstanceUID', payload.studyInstanceUID);
  appendIfPresent(formData, 'seriesInstanceUID', payload.seriesInstanceUID);
  appendIfPresent(formData, 'sopInstanceUID', payload.sopInstanceUID);
  formData.append('evaluationsJson', JSON.stringify(payload.evaluations));
  formData.append('srFile', toFile(payload.srFile, fileName), fileName);

  return requestJson('/ndt/evaluation/batch-submit-sr', config, {
    method: 'POST',
    body: formData,
  });
}

export async function getEvaluationsBySr(
  params: {
    taskId: NdtRuntimeConfig['taskId'];
    srSopInstanceUID: string;
  },
  config: NdtRuntimeConfig
): Promise<NdtEvaluationRecord[]> {
  const body = await requestJson<{ data?: NdtEvaluationRecord[] } | NdtEvaluationRecord[]>(
    '/ndt/evaluation/by-sr',
    config,
    {
      query: params,
    }
  );

  return ('data' in body && body.data ? body.data : body) as NdtEvaluationRecord[];
}
