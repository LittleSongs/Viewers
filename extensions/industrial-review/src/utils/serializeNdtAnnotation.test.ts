import {
  buildBatchEvaluationPayloads,
  buildEvaluationPayload,
  serializeNdtAnnotation,
} from './serializeNdtAnnotation';
import type { DefectMeasurement } from '../types';

const currentImage = {
  studyInstanceUID: '1.2.3',
  seriesInstanceUID: '1.2.3.4',
  sopInstanceUID: '1.2.3.4.5',
  seriesDescription: 'Original',
  instanceNumber: '7',
  modality: 'DX',
};

const measurement: DefectMeasurement = {
  uid: 'm-1',
  toolName: 'RectangleROI',
  points: [
    [1, 2, 0],
    [9, 8, 0],
  ],
  metadata: {
    referencedImageId: 'wadors:image-1',
  },
  data: {
    cached: {
      area: 12.5,
    },
  },
  defectType: '气孔',
  defectNote: 'edge indication',
};

describe('serializeNdtAnnotation', () => {
  it('serializes the current image and selected measurement into JSON', () => {
    const json = serializeNdtAnnotation({
      currentImage,
      measurement,
      form: {
        defectType: '气孔',
        defectLevel: 'II级',
        conclusion: '可接受',
        remark: 'first pass',
      },
    });

    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.source).toBe('OHIF-industrialMode');
    expect(parsed.image.sopInstanceUID).toBe('1.2.3.4.5');
    expect(parsed.measurement.uid).toBe('m-1');
    expect(parsed.measurement.toolName).toBe('RectangleROI');
    expect(parsed.evaluation.defectLevel).toBe('II级');
  });

  it('builds the RuoYi evaluation payload with backend field names', () => {
    const payload = buildEvaluationPayload({
      taskId: 1001,
      currentImage,
      measurement,
      form: {
        defectType: '裂纹',
        defectLevel: 'III级',
        conclusion: '不可接受',
        remark: 'needs repair',
      },
    });

    expect(payload).toMatchObject({
      taskId: 1001,
      studyInstanceUID: '1.2.3',
      seriesInstanceUID: '1.2.3.4',
      sopInstanceUID: '1.2.3.4.5',
      defectType: '裂纹',
      defectLevel: 'III级',
      conclusion: '不可接受',
    });
    expect(JSON.parse(payload.annotationJson).evaluation.remark).toBe('needs repair');
  });

  it('builds one evaluation payload for each defect measurement', () => {
    const payloads = buildBatchEvaluationPayloads({
      taskId: 1001,
      currentImage,
      measurements: [
        {
          ...measurement,
          uid: 'm-1',
          defectType: '裂纹',
          defectLevel: 'II级',
          defectStatus: '不可接受',
          defectNote: 'first defect',
        },
        {
          ...measurement,
          uid: 'm-2',
          defectType: '夹渣',
          defectLevel: 'III级',
          defectStatus: '需复查',
          defectNote: 'second defect',
        },
      ],
    });

    expect(payloads).toHaveLength(2);
    expect(payloads[0]).toMatchObject({
      taskId: 1001,
      defectType: '裂纹',
      defectLevel: 'II级',
      conclusion: '不可接受',
    });
    expect(payloads[1]).toMatchObject({
      taskId: 1001,
      defectType: '夹渣',
      defectLevel: 'III级',
      conclusion: '需复查',
    });
    expect(JSON.parse(payloads[0].annotationJson).measurement.uid).toBe('m-1');
    expect(JSON.parse(payloads[1].annotationJson).evaluation.remark).toBe('second defect');
  });
});
