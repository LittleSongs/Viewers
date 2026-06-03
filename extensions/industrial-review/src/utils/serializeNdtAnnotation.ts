import type {
  DefectMeasurement,
  NdtCurrentImageInfo,
  NdtEvaluationForm,
  NdtEvaluationPayload,
  NdtTaskId,
} from '../types';
import { CONCLUSION_OPTIONS, DEFECT_LEVEL_OPTIONS, DEFECT_TYPE_OPTIONS } from '../types';

type SerializeArgs = {
  currentImage: NdtCurrentImageInfo;
  measurement?: DefectMeasurement | null;
  form: NdtEvaluationForm;
};

type BuildPayloadArgs = SerializeArgs & {
  taskId: NdtTaskId;
};

type BuildBatchPayloadArgs = {
  taskId: NdtTaskId;
  currentImage: NdtCurrentImageInfo;
  measurements: DefectMeasurement[];
};

function asOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value);
}

export function serializeNdtAnnotation({ currentImage, measurement, form }: SerializeArgs) {
  return JSON.stringify({
    version: 1,
    source: 'OHIF-industrialMode',
    createdAt: new Date().toISOString(),
    image: currentImage,
    measurement: measurement
      ? {
        uid: measurement.uid,
        toolName: measurement.toolName,
        points: measurement.points || [],
        metadata: measurement.metadata || {},
        data: measurement.data || {},
        referencedImageId: measurement.metadata?.referencedImageId,
        defectType: measurement.defectType,
        defectNote: measurement.defectNote,
        defectStatus: measurement.defectStatus,
      }
      : null,
    evaluation: form,
  });
}

export function buildEvaluationPayload({
  taskId,
  currentImage,
  measurement,
  form,
}: BuildPayloadArgs): NdtEvaluationPayload {
  const sourceImage = measurement?.metadata?.referencedImageId ? currentImage : currentImage;
  const resolvedStudyInstanceUID = asOptionalString(
    measurement?.metadata?.referencedStudyInstanceUID ||
      measurement?.metadata?.studyInstanceUID ||
      sourceImage.studyInstanceUID
  );
  const resolvedSeriesInstanceUID = asOptionalString(
    measurement?.metadata?.referencedSeriesInstanceUID ||
      measurement?.metadata?.seriesInstanceUID ||
      sourceImage.seriesInstanceUID
  );
  const resolvedSopInstanceUID = asOptionalString(
    measurement?.metadata?.referencedSopInstanceUID ||
      measurement?.metadata?.sopInstanceUID ||
      sourceImage.sopInstanceUID
  );

  return {
    taskId,
    studyInstanceUID: resolvedStudyInstanceUID,
    seriesInstanceUID: resolvedSeriesInstanceUID,
    sopInstanceUID: resolvedSopInstanceUID,
    defectType: form.defectType,
    defectLevel: form.defectLevel,
    conclusion: form.conclusion,
    annotationJson: serializeNdtAnnotation({
      currentImage: {
        ...sourceImage,
        studyInstanceUID: resolvedStudyInstanceUID,
        seriesInstanceUID: resolvedSeriesInstanceUID,
        sopInstanceUID: resolvedSopInstanceUID,
      },
      measurement,
      form,
    }),
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

export function buildBatchEvaluationPayloads({
  taskId,
  currentImage,
  measurements,
}: BuildBatchPayloadArgs): NdtEvaluationPayload[] {
  return measurements.map(measurement =>
    buildEvaluationPayload({
      taskId,
      currentImage,
      measurement,
      form: buildFormFromMeasurement(measurement),
    })
  );
}
