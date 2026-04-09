export const DEFECT_TOOL_NAMES = ['RectangleROI', 'PlanarFreehandROI', 'Probe'] as const;

export type DefectToolName = (typeof DEFECT_TOOL_NAMES)[number];

export const DEFECT_PANEL_ID = '@ohif/extension-industrial-review.panelModule.panelDefectList';

export const DEFECT_TYPE_OPTIONS = ['未分类', '裂纹', '孔洞', '污点', '划痕', '其他'] as const;
export const DEFECT_STATUS_OPTIONS = ['待确认', '已确认', '已处理'] as const;

export type DefectTypeOption = (typeof DEFECT_TYPE_OPTIONS)[number];
export type DefectStatusOption = (typeof DEFECT_STATUS_OPTIONS)[number];

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
