import {
  findDisplaySetForObject,
  getNdtObjectAvailability,
  navigateToNdtObject,
  normalizeNdtObjectTree,
} from './ndtObjectTree';

describe('NDT object tree', () => {
  const original = {
    id: 1,
    objectType: 'ORIGINAL' as const,
    label: '原始图像',
    studyInstanceUid: 'study',
    seriesInstanceUid: 'source-series',
    sopInstanceUid: 'source-1',
    instanceNumber: '2',
  };

  it('normalizes aliases, hides empty parts and applies stable role/instance sorting', () => {
    const tree = normalizeNdtObjectTree({
      parts: [
        { id: 2, partNo: 'P-2', objects: [] },
        {
          id: 1,
          part_no: 'P-1',
          objects: [
            { ...original, id: 3, objectType: 'PROCESSED_IMAGE', sopInstanceUid: 'p-2' },
            original,
            {
              ...original,
              id: 2,
              object_type: 'PROCESSED_IMAGE',
              objectType: undefined,
              sop_instance_uid: 'p-1',
              sopInstanceUid: undefined,
              instance_number: '1',
              instanceNumber: undefined,
            },
          ],
        },
      ],
      unassigned_objects: [{ ...original, id: 9, objectType: 'OTHER_DERIVED' }],
    } as any);

    expect(tree.parts).toHaveLength(1);
    expect(tree.parts[0].partNo).toBe('P-1');
    expect(tree.parts[0].objects.map(item => item.sopInstanceUid)).toEqual([
      'source-1',
      'p-1',
      'p-2',
    ]);
    expect(tree.unassignedObjects).toHaveLength(1);
  });

  it('matches SOP inside a multi-instance display set before falling back to Series UID', () => {
    const displaySets = [
      {
        displaySetInstanceUID: 'ds-source',
        SeriesInstanceUID: 'source-series',
        instances: [
          { SOPInstanceUID: 'source-0' },
          { SOPInstanceUID: 'source-1' },
        ],
      },
    ];

    expect(findDisplaySetForObject(original, displaySets)?.displaySetInstanceUID).toBe('ds-source');
    expect(getNdtObjectAvailability(original, displaySets)).toEqual({
      enabled: true,
      displaySetInstanceUID: 'ds-source',
      imageIndex: 1,
    });
  });

  it('awaits viewport assignment then jumps to the matching SOP stack index', async () => {
    const calls: string[] = [];
    const viewportGridService = {
      setDisplaySetsForViewports: jest.fn(async () => {
        calls.push('set');
        viewportDataChanged?.({
          viewportId: 'viewport-1',
          viewportData: { data: [{ displaySetInstanceUID: 'ds-source' }] },
        });
      }),
    };
    let viewportDataChanged;
    const unsubscribe = jest.fn();
    const cornerstoneViewportService = {
      EVENTS: { VIEWPORT_DATA_CHANGED: 'viewport-data-changed' },
      subscribe: jest.fn((_event, callback) => {
        viewportDataChanged = callback;
        return { unsubscribe };
      }),
    };
    const commandsManager = {
      runCommand: jest.fn(() => calls.push('jump')),
    };
    const displaySets = [
      {
        displaySetInstanceUID: 'ds-source',
        SeriesInstanceUID: 'source-series',
        instances: [
          { SOPInstanceUID: 'source-0' },
          { SOPInstanceUID: 'source-1' },
        ],
      },
    ];

    const result = await navigateToNdtObject({
      object: original,
      displaySets,
      viewportId: 'viewport-1',
      viewportGridService,
      cornerstoneViewportService,
      commandsManager,
    });

    expect(result.ok).toBe(true);
    expect(calls).toEqual(['set', 'jump']);
    expect(viewportGridService.setDisplaySetsForViewports).toHaveBeenCalledWith([
      { viewportId: 'viewport-1', displaySetInstanceUIDs: ['ds-source'] },
    ]);
    expect(commandsManager.runCommand).toHaveBeenCalledWith('jumpToImage', {
      imageIndex: 1,
      viewport: { id: 'viewport-1' },
    });
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does not jump until Cornerstone reports the target display set ready', async () => {
    let viewportDataChanged;
    const commandsManager = { runCommand: jest.fn() };
    const navigation = navigateToNdtObject({
      object: original,
      displaySets: [
        {
          displaySetInstanceUID: 'ds-source',
          instances: [{ SOPInstanceUID: 'source-0' }, { SOPInstanceUID: 'source-1' }],
        },
      ],
      viewportId: 'viewport-1',
      viewportGridService: { setDisplaySetsForViewports: jest.fn().mockResolvedValue(undefined) },
      cornerstoneViewportService: {
        EVENTS: { VIEWPORT_DATA_CHANGED: 'viewport-data-changed' },
        subscribe: jest.fn((_event, callback) => {
          viewportDataChanged = callback;
          return { unsubscribe: jest.fn() };
        }),
      },
      commandsManager,
    });

    await Promise.resolve();
    expect(commandsManager.runCommand).not.toHaveBeenCalled();
    viewportDataChanged({
      viewportId: 'viewport-1',
      viewportData: { data: [{ displaySetInstanceUID: 'ds-source' }] },
    });
    await navigation;
    expect(commandsManager.runCommand).toHaveBeenCalledWith('jumpToImage', {
      imageIndex: 1,
      viewport: { id: 'viewport-1' },
    });
  });

  it('does not navigate to an alternative image when the target display set is absent', async () => {
    const result = await navigateToNdtObject({
      object: original,
      displaySets: [],
      viewportId: 'viewport-1',
      viewportGridService: { setDisplaySetsForViewport: jest.fn() },
      commandsManager: { runCommand: jest.fn() },
    });

    expect(result).toEqual({ ok: false, reason: '当前研究中尚未加载该对象' });
  });
});
