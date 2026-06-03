import type {
  DefectMeasurement,
  NdtCurrentImageInfo,
  NdtEvaluationForm,
  NdtEvaluationPayload,
  NdtTaskId,
} from '../types';

type SerializeArgs = {
  currentImage: NdtCurrentImageInfo;
  measurement?: DefectMeasurement | null;
  form: NdtEvaluationForm;
};

type BuildPayloadArgs = SerializeArgs & {
  taskId: NdtTaskId;
};

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
  const resolvedStudyInstanceUID =
    measurement?.metadata?.referencedStudyInstanceUID ||
    measurement?.metadata?.studyInstanceUID ||
    sourceImage.studyInstanceUID;
  const resolvedSeriesInstanceUID =
    measurement?.metadata?.referencedSeriesInstanceUID ||
    measurement?.metadata?.seriesInstanceUID ||
    sourceImage.seriesInstanceUID;
  const resolvedSopInstanceUID =
    measurement?.metadata?.referencedSopInstanceUID ||
    measurement?.metadata?.sopInstanceUID ||
    sourceImage.sopInstanceUID;

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
