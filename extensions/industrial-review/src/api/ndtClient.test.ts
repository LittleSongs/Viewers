import {
  buildAuthHeaders,
  createDefect,
  createEvaluation,
  getNdtRuntimeConfig,
  getObjectTree,
  submitEvaluationWithSr,
  updateDefect,
  updateEvaluation,
} from './ndtClient';

describe('NDT runtime authentication', () => {
  it('uses the explicit new launch parameters only', () => {
    expect(
      getNdtRuntimeConfig({
        search: '?taskId=1001&studyId=2002&canEvaluate=true&token=abc&ruoyiApiBase=http%3A%2F%2Flocalhost%3A8080%2F',
        storage: null,
      })
    ).toEqual({
      ruoyiApiBase: 'http://localhost:8080',
      taskId: 1001,
      studyId: 2002,
      canEvaluate: true,
      token: 'abc',
    });
  });

  it('reads the token from the single OHIF session key', () => {
    const storage = { getItem: jest.fn(() => 'session-token') } as unknown as Storage;
    expect(getNdtRuntimeConfig({ search: '?taskId=8', storage }).token).toBe('session-token');
    expect(storage.getItem).toHaveBeenCalledWith('ndt.ruoyiToken');
  });

  it('builds a Bearer header', () => {
    expect(buildAuthHeaders('abc')).toEqual({ Authorization: 'Bearer abc' });
  });
});

describe('new NDT APIs', () => {
  const config = {
    ruoyiApiBase: 'http://localhost:8080',
    taskId: 1001,
    studyId: 2002,
    canEvaluate: true,
    token: 'abc',
  };

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: { id: 9, workpieces: [] } }),
    }) as jest.Mock;
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads the workpiece-position-object tree', async () => {
    await expect(getObjectTree(1001, 2002, config)).resolves.toEqual({ id: 9, workpieces: [] });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://localhost:8080/ndt/task/1001/object-tree?studyId=2002'
    );
  });

  it('creates defects and evaluations as separate records', async () => {
    await createDefect(
      {
        originalObjectId: 30,
        defectNo: 'D-1',
        defectType: '裂纹',
        roiType: 'RectangleROI',
        roiDataJson: '{}',
        description: 'critical',
      },
      config
    );
    await createEvaluation(
      {
        evaluationType: 'DEFECT',
        defectId: 9,
        workpieceId: null,
        level: 'II级',
        conclusion: '不可接受',
        description: 'critical',
      },
      config
    );

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://localhost:8080/ndt/defect'
    );
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe(
      'http://localhost:8080/ndt/evaluation'
    );
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toEqual(
      expect.objectContaining({ evaluationType: 'DEFECT', defectId: 9, workpieceId: null })
    );
  });

  it('updates an existing defect and draft evaluation instead of duplicating them', async () => {
    await updateDefect(
      {
        id: 9,
        originalObjectId: 30,
        defectNo: 'D-1',
        defectType: '裂纹',
        roiType: 'RectangleROI',
        roiDataJson: '{}',
        description: 'updated',
      },
      config
    );
    await updateEvaluation(
      {
        id: 10,
        evaluationType: 'DEFECT',
        defectId: 9,
        workpieceId: null,
        level: 'III级',
        conclusion: '不可接受',
        description: 'updated',
      },
      config
    );

    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('PUT');
    expect((global.fetch as jest.Mock).mock.calls[1][1].method).toBe('PUT');
  });

  it('submits one evaluation with an SR related to the original object id', async () => {
    const sr = new Blob([new Uint8Array([1, 2])], { type: 'application/dicom' });
    await submitEvaluationWithSr(7, 30, sr, config);
    const [url, request] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:8080/ndt/evaluation/7/submit-with-sr');
    expect(request.body.get('sourceObjectId')).toBe('30');
    expect(request.body.get('srFile')).toBeInstanceOf(File);
  });
});
