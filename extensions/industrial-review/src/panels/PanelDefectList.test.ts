import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@ohif/core', () => ({ useSystem: jest.fn() }));
jest.mock('@ohif/ui-next', () => ({
  Button: 'button',
  Input: 'input',
  PanelSection: Object.assign('section', {
    Header: 'header',
    Content: 'div',
  }),
  ScrollArea: 'div',
  Select: 'select',
  SelectContent: 'div',
  SelectItem: 'option',
  SelectTrigger: 'div',
  SelectValue: 'span',
}));
jest.mock('../hooks/useDefectMeasurements', () => jest.fn());
jest.mock('../hooks/useNdtObjectTree', () => jest.fn());
jest.mock('../hooks/useNdtViewerContext', () => jest.fn());
jest.mock('../utils/createDicomSrBlob', () => jest.fn());

import { SavedHistory } from './PanelDefectList';

describe('SavedHistory', () => {
  it('renders defects and their evaluation state from the new split model', () => {
    render(
      React.createElement(SavedHistory, {
        defects: [
          {
            id: 11,
            originalObjectId: 101,
            defectNo: 'D-001',
            defectType: '裂纹',
            roiType: 'RectangleROI',
            roiDataJson: '{}',
            description: '焊缝边缘',
          },
        ],
        evaluations: {
          '11': [
            {
              id: 21,
              evaluationType: 'DEFECT',
              defectId: 11,
              workpieceId: null,
              level: 'III级',
              conclusion: '不可接受',
              description: '需要返修',
              status: 'SUBMITTED',
            },
          ],
        },
      })
    );

    expect(screen.getByText(/D-001 · 裂纹/)).toBeTruthy();
    expect(screen.getByText(/III级 \/ 不可接受 \/ SUBMITTED/)).toBeTruthy();
  });
});
