import {
  batchSubmitEvaluationWithSr,
  buildAuthHeaders,
  getEvaluationsBySr,
  getEvaluationHistory,
  getObjectTree,
  getNdtRuntimeConfig,
  normalizeRuoyiApiBase,
} from './ndtClient';

describe('ndtClient runtime config', () => {
  it('uses localhost RuoYi defaults when URL params are absent', () => {
    const config = getNdtRuntimeConfig({
      search: '',
      storage: null,
    });

    expect(config.ruoyiApiBase).toBe('http://localhost:8080');
    expect(config.taskId).toBeUndefined();
    expect(config.canEvaluate).toBe(false);
    expect(config.token).toBeUndefined();
  });

  it('parses RuoYi URL params and normalizes trailing slashes', () => {
    const config = getNdtRuntimeConfig({
      search:
        '?taskId=1001&canEvaluate=true&token=abc123&ruoyiApiBase=http%3A%2F%2Flocalhost%3A8080%2F',
      storage: null,
    });

    expect(config.ruoyiApiBase).toBe('http://localhost:8080');
    expect(config.taskId).toBe(1001);
    expect(config.canEvaluate).toBe(true);
    expect(config.token).toBe('abc123');
  });

  it('falls back to localStorage token names when URL token is absent', () => {
    const storage = {
      getItem: jest.fn(key => (key === 'Admin-Token' ? 'stored-token' : null)),
    } as unknown as Storage;

    const config = getNdtRuntimeConfig({
      search: '?taskId=12',
      storage,
    });

    expect(config.token).toBe('stored-token');
  });

  it('builds Bearer authorization headers without duplicating the scheme', () => {
    expect(buildAuthHeaders('plain-token')).toEqual({
      Authorization: 'Bearer plain-token',
    });
    expect(buildAuthHeaders('Bearer existing-token')).toEqual({
      Authorization: 'Bearer existing-token',
    });
  });

  it('normalizes empty or whitespace API bases to the default URL', () => {
    expect(normalizeRuoyiApiBase('  ')).toBe('http://localhost:8080');
  });
});

describe('ndtClient evaluation SR APIs', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: { saved: true } }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads batch evaluations and a DICOM SR file as multipart form data', async () => {
    const srFile = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/dicom' });

    await batchSubmitEvaluationWithSr(
      {
        taskId: 1001,
        studyInstanceUID: '1.2.3',
        seriesInstanceUID: '1.2.3.4',
        sopInstanceUID: '1.2.3.4.5',
        evaluations: [
          {
            taskId: 1001,
            studyInstanceUID: '1.2.3',
            seriesInstanceUID: '1.2.3.4',
            sopInstanceUID: '1.2.3.4.5',
            defectType: '裂纹',
            defectLevel: 'II级',
            conclusion: '不可接受',
            annotationJson: '{}',
          },
        ],
        srFile,
      },
      {
        ruoyiApiBase: 'http://localhost:8080',
        token: 'abc',
        canEvaluate: true,
      }
    );

    const [, request] = (global.fetch as jest.Mock).mock.calls[0];
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://localhost:8080/ndt/evaluation/batch-submit-sr'
    );
    expect(request.method).toBe('POST');
    expect(request.headers.Authorization).toBe('Bearer abc');
    expect(request.body).toBeInstanceOf(FormData);
    expect(request.body.get('taskId')).toBe('1001');
    expect(request.body.get('evaluationsJson')).toContain('裂纹');
    expect(request.body.get('srFile')).toBeInstanceOf(File);
  });

  it('loads evaluations linked to the selected SR SOP instance UID', async () => {
    await getEvaluationsBySr(
      {
        taskId: 1001,
        srSopInstanceUID: '9.8.7',
      },
      {
        ruoyiApiBase: 'http://localhost:8080',
        canEvaluate: true,
      }
    );

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://localhost:8080/ndt/evaluation/by-sr?taskId=1001&srSopInstanceUID=9.8.7'
    );
  });

  it('unwraps the object tree and evaluation history API responses', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { parts: [], unassignedObjects: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { parts: [{ id: 1 }] } }),
      });
    const config = {
      ruoyiApiBase: 'http://localhost:8080',
      taskId: 1001,
      canEvaluate: false,
    };

    await expect(getObjectTree(1001, config)).resolves.toEqual({
      parts: [],
      unassignedObjects: [],
    });
    await expect(getEvaluationHistory(1001, '1.2.3', config)).resolves.toEqual({
      parts: [{ id: 1 }],
    });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://localhost:8080/ndt/task/1001/object-tree'
    );
    expect((global.fetch as jest.Mock).mock.calls[0][1]).toEqual(
      expect.objectContaining({ credentials: 'same-origin' })
    );
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe(
      'http://localhost:8080/ndt/evaluation/history?taskId=1001&sopInstanceUID=1.2.3'
    );
  });
});
