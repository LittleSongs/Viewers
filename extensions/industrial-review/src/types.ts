export const DEFECT_TOOL_NAMES = ['RectangleROI', 'PlanarFreehandROI', 'Probe'] as const;

export type DefectToolName = (typeof DEFECT_TOOL_NAMES)[number];

export const DEFECT_PANEL_ID = '@ohif/extension-industrial-review.panelModule.panelDefectList';

export const DEFECT_TYPE_OPTIONS = ['气孔', '夹渣', '裂纹', '未焊透', '其他'] as const;
export const DEFECT_STATUS_OPTIONS = ['待确认', '已确认', '已处理'] as const;
export const DEFECT_LEVEL_OPTIONS = ['I级', 'II级', 'III级', 'IV级', '不合格'] as const;
export const CONCLUSION_OPTIONS = ['可接受', '不可接受', '需复查', '其他'] as const;

export type DefectTypeOption = (typeof DEFECT_TYPE_OPTIONS)[number];
export type DefectStatusOption = (typeof DEFECT_STATUS_OPTIONS)[number];
export type DefectLevelOption = (typeof DEFECT_LEVEL_OPTIONS)[number];
export type ConclusionOption = (typeof CONCLUSION_OPTIONS)[number];
export type NdtTaskId = number | string;

export interface DefectMeasurement {
  uid: string;
  label?: string;
  toolName: DefectToolName;
  points?: number[][];
  metadata?: {
    referencedImageId?: string;
    [key: string]: unknown;
  };
  data?: Record<string, unknown>;
  displayText?: {
    primary?: string[];
    secondary?: string[];
  };
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
  token?: string;
  canEvaluate: boolean;
}

export interface NdtCurrentImageInfo {
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  seriesDescription?: string;
  instanceNumber?: string | number;
  modality?: string;
  seriesNumber?: string | number;
  integrityStatus?: string;
  displaySetInstanceUID?: string;
  imageId?: string;
}

export interface NdtCurrentRelationParams {
  taskId: NdtTaskId;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
}

export interface NdtRelatedObject {
  id?: NdtTaskId;
  relatedType?: string;
  related_type?: string;
  sopInstanceUID?: string;
  sop_instance_uid?: string;
  seriesInstanceUID?: string;
  series_instance_uid?: string;
  orthancInstanceId?: string;
  orthanc_instance_id?: string;
  fileName?: string;
  file_name?: string;
  createTime?: string;
  create_time?: string;
  [key: string]: unknown;
}

export interface NdtEvaluationRecord {
  id?: NdtTaskId;
  defectType?: string;
  defect_type?: string;
  defectLevel?: string;
  defect_level?: string;
  conclusion?: string;
  evaluatorUserId?: NdtTaskId;
  evaluator_user_id?: NdtTaskId;
  evaluateTime?: string;
  evaluate_time?: string;
  status?: string;
  [key: string]: unknown;
}

export interface NdtRelationResponse {
  processedImages?: NdtRelatedObject[];
  processedImageList?: NdtRelatedObject[];
  snapshots?: NdtRelatedObject[];
  snapshotList?: NdtRelatedObject[];
  srReports?: NdtRelatedObject[];
  srReportList?: NdtRelatedObject[];
  evaluations?: NdtEvaluationRecord[];
  evaluationList?: NdtEvaluationRecord[];
  integrityStatus?: string;
  integrity_status?: string;
  [key: string]: unknown;
}

export interface NdtEvaluationForm {
  defectType: DefectTypeOption | string;
  defectLevel: DefectLevelOption | string;
  conclusion: ConclusionOption | string;
  remark: string;
}

export interface NdtEvaluationPayload {
  taskId: NdtTaskId;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  defectType: string;
  defectLevel: string;
  conclusion: string;
  annotationJson: string;
}
