import { buildDefectPayload, buildDefectEvaluationPayload } from './serializeNdtAnnotation';
import type { DefectMeasurement } from '../types';

const measurement: DefectMeasurement = {
  uid: 'm-1',
  toolName: 'RectangleROI',
  points: [[1, 2, 0], [9, 8, 0]],
  metadata: { referencedImageId: 'wadors:image-1' },
  data: { cached: { area: 12.5 } },
};

describe('new defect/evaluation serialization', () => {
  it('stores OHIF geometry on the defect record', () => {
    const payload = buildDefectPayload({
      originalObjectId: 30,
      defectNo: 'D-m-1',
      measurement,
      form: {
        defectType: '裂纹',
        defectLevel: 'III级',
        conclusion: '不可接受',
        remark: 'needs repair',
      },
    });
    expect(payload).toMatchObject({
      originalObjectId: 30,
      defectNo: 'D-m-1',
      defectType: '裂纹',
      roiType: 'RectangleROI',
      description: 'needs repair',
    });
    expect(JSON.parse(payload.roiDataJson).measurement.uid).toBe('m-1');
  });

  it('stores the conclusion separately on a DEFECT evaluation', () => {
    expect(
      buildDefectEvaluationPayload(9, {
        defectType: '裂纹',
        defectLevel: 'III级',
        conclusion: '不可接受',
        remark: 'needs repair',
      })
    ).toEqual({
      evaluationType: 'DEFECT',
      defectId: 9,
      workpieceId: null,
      level: 'III级',
      conclusion: '不可接受',
      description: 'needs repair',
    });
  });
});
