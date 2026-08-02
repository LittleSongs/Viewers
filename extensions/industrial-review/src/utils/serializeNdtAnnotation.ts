import type {
  DefectMeasurement,
  NdtDefectPayload,
  NdtEvaluationForm,
  NdtEvaluationPayload,
  NdtTaskId,
} from '../types';
import { CONCLUSION_OPTIONS, DEFECT_LEVEL_OPTIONS, DEFECT_TYPE_OPTIONS } from '../types';

export function buildDefectPayload({
  originalObjectId,
  defectNo,
  measurement,
  form,
}: {
  originalObjectId: NdtTaskId;
  defectNo: string;
  measurement: DefectMeasurement;
  form: NdtEvaluationForm;
}): NdtDefectPayload {
  return {
    originalObjectId,
    defectNo,
    defectType: String(form.defectType),
    roiType: measurement.toolName,
    roiDataJson: JSON.stringify({
      version: 1,
      source: 'OHIF-industrial-review',
      createdAt: new Date().toISOString(),
      measurement: {
        uid: measurement.uid,
        toolName: measurement.toolName,
        points: measurement.points || [],
        metadata: measurement.metadata || {},
        data: measurement.data || {},
      },
    }),
    description: form.remark,
  };
}

export function buildDefectEvaluationPayload(
  defectId: NdtTaskId,
  form: NdtEvaluationForm
): NdtEvaluationPayload {
  return {
    evaluationType: 'DEFECT',
    defectId,
    workpieceId: null,
    level: String(form.defectLevel),
    conclusion: String(form.conclusion),
    description: form.remark,
  };
}

export function buildFormFromMeasurement(measurement: DefectMeasurement): NdtEvaluationForm {
  return {
    defectType: measurement.defectType || DEFECT_TYPE_OPTIONS[0],
    defectLevel: measurement.defectLevel || DEFECT_LEVEL_OPTIONS[0],
    conclusion: measurement.defectStatus || CONCLUSION_OPTIONS[0],
    remark: measurement.defectNote || '',
  };
}
