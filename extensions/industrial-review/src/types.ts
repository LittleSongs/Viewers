export const DEFECT_TOOL_NAMES = ['RectangleROI', 'PlanarFreehandROI', 'Probe'] as const;
export type DefectToolName = (typeof DEFECT_TOOL_NAMES)[number];

export const DEFECT_PANEL_ID = '@ohif/extension-industrial-review.panelModule.panelDefectList';
export const NDT_OBJECT_BROWSER_PANEL_ID =
  '@ohif/extension-industrial-review.panelModule.panelNdtObjectBrowser';

export const DEFECT_TYPE_OPTIONS = ['气孔', '夹渣', '裂纹', '未焊透', '其他'] as const;
export const DEFECT_LEVEL_OPTIONS = ['I级', 'II级', 'III级', 'IV级', '不合格'] as const;
export const CONCLUSION_OPTIONS = ['可接受', '不可接受', '需复查', '其他'] as const;
export type DefectTypeOption = (typeof DEFECT_TYPE_OPTIONS)[number];
export type DefectLevelOption = (typeof DEFECT_LEVEL_OPTIONS)[number];
export type ConclusionOption = (typeof CONCLUSION_OPTIONS)[number];
export type NdtTaskId = number | string;

export type NdtObjectType =
  | 'ORIGINAL_IMAGE'
  | 'PROCESSED_IMAGE'
  | 'SCREENSHOT'
  | 'ANNOTATION_IMAGE'
  | 'PRESENTATION_STATE'
  | 'SR'
  | 'OTHER';
export type NdtStorageType = 'ORTHANC' | 'FILE_SYSTEM' | 'OBJECT_STORAGE' | 'DATABASE_JSON';

export interface NdtDicomObject {
  id: NdtTaskId;
  positionId: NdtTaskId;
  objectType: NdtObjectType;
  objectName?: string;
  storageType: NdtStorageType;
  orthancInstanceId?: string;
  studyUid?: string;
  seriesUid?: string;
  sopInstanceUid?: string;
  sopClassUid?: string;
  parametersJson?: string;
  metadataJson?: string;
  sha256?: string;
  createTime?: string;
}

export interface NdtPositionNode {
  id: NdtTaskId;
  positionCode: string;
  positionName: string;
  objects: NdtDicomObject[];
}

export interface NdtWorkpieceNode {
  id: NdtTaskId;
  workpieceName: string;
  status: string;
  positions: NdtPositionNode[];
}

export interface NdtObjectTreeResponse {
  taskId?: NdtTaskId;
  workpieces: NdtWorkpieceNode[];
}

export interface DefectMeasurement {
  uid: string;
  label?: string;
  toolName: DefectToolName;
  points?: number[][];
  metadata?: {
    referencedImageId?: string;
    referencedSopInstanceUID?: string;
    [key: string]: unknown;
  };
  data?: Record<string, unknown>;
  displayText?: { primary?: string[]; secondary?: string[] };
  isSelected?: boolean;
  defectType?: string;
  defectLevel?: string;
  defectNote?: string;
  defectStatus?: string;
}

export interface DefectListItem {
  uid: string;
  defectId: string;
  type: string;
  note: string;
  status: string;
  area: string;
  location: string;
  toolName: DefectToolName;
  isSelected: boolean;
  measurement: DefectMeasurement;
}

export interface NdtRuntimeConfig {
  ruoyiApiBase: string;
  taskId?: NdtTaskId;
  studyId?: NdtTaskId;
  token?: string;
  canEvaluate: boolean;
}

export interface NdtCurrentImageInfo {
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  srSopInstanceUID?: string;
  srSeriesInstanceUID?: string;
  srDisplaySetInstanceUID?: string;
  srSeriesDescription?: string;
  seriesDescription?: string;
  instanceNumber?: string | number;
  modality?: string;
  seriesNumber?: string | number;
  integrityStatus?: string;
  displaySetInstanceUID?: string;
  imageId?: string;
}

export interface NdtEvaluationForm {
  defectType: DefectTypeOption | string;
  defectLevel: DefectLevelOption | string;
  conclusion: ConclusionOption | string;
  remark: string;
}

export interface NdtDefectPayload {
  originalObjectId: NdtTaskId;
  defectNo: string;
  defectType: string;
  roiType: string;
  roiDataJson: string;
  description: string;
}

export interface NdtDefectRecord extends NdtDefectPayload {
  id: NdtTaskId;
  taskId?: NdtTaskId;
  createTime?: string;
}

export interface NdtEvaluationPayload {
  evaluationType: 'DEFECT' | 'WORKPIECE';
  defectId: NdtTaskId | null;
  workpieceId: NdtTaskId | null;
  level: string;
  conclusion: string;
  description: string;
}

export interface NdtEvaluationRecord extends NdtEvaluationPayload {
  id: NdtTaskId;
  status: 'DRAFT' | 'SUBMITTED';
  evaluatorName?: string;
  evaluationTime?: string;
}
