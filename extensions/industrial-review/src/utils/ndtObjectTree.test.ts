import {
  findDisplaySetForObject,
  getNdtObjectAvailability,
  normalizeNdtObjectTree,
} from './ndtObjectTree';

describe('new NDT object tree', () => {
  const original = {
    id: 1,
    positionId: 4,
    objectType: 'ORIGINAL_IMAGE' as const,
    objectName: 'source.dcm',
    storageType: 'ORTHANC' as const,
    studyUid: 'study',
    seriesUid: 'series',
    sopInstanceUid: 'sop-1',
  };

  it('preserves the exact workpiece and position hierarchy and sorts object types', () => {
    const tree = normalizeNdtObjectTree({
      taskId: 10,
      workpieces: [
        {
          id: 2,
          workpieceName: 'W-1',
          status: 'IN_PROGRESS',
          positions: [
            {
              id: 4,
              positionCode: 'P-1',
              positionName: '焊缝',
              objects: [
                { ...original, id: 3, objectType: 'SR', objectName: 'report.dcm' },
                original,
              ],
            },
          ],
        },
      ],
    });

    expect(tree.workpieces[0].positions[0].objects.map(object => object.objectType)).toEqual([
      'ORIGINAL_IMAGE',
      'SR',
    ]);
  });

  it('does not parse old part or snake_case aliases', () => {
    expect(normalizeNdtObjectTree({ parts: [{ id: 1 }], unassigned_objects: [{}] }).workpieces).toEqual([]);
  });

  it('matches a DICOM object by SOP UID', () => {
    const displaySets = [
      { displaySetInstanceUID: 'ds', instances: [{ SOPInstanceUID: 'sop-0' }, { SOPInstanceUID: 'sop-1' }] },
    ];
    expect(findDisplaySetForObject(original, displaySets)?.displaySetInstanceUID).toBe('ds');
    expect(getNdtObjectAvailability(original, displaySets)).toEqual({
      enabled: true,
      displaySetInstanceUID: 'ds',
      imageIndex: 1,
    });
  });
});
