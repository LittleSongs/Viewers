import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@ohif/core', () => ({ useSystem: jest.fn() }));
jest.mock('@ohif/ui-next', () => ({
  Button: 'button',
  DropdownMenu: 'div',
  DropdownMenuContent: 'div',
  DropdownMenuItem: 'div',
  DropdownMenuTrigger: 'div',
  Icons: {},
  Input: 'input',
  PanelSection: 'section',
  ScrollArea: 'div',
  Select: 'select',
  SelectContent: 'div',
  SelectItem: 'option',
  SelectTrigger: 'div',
  SelectValue: 'span',
}));
jest.mock('../hooks/useDefectMeasurements', () => jest.fn());
jest.mock('../hooks/useNdtViewerContext', () => jest.fn());
jest.mock('../hooks/useNdtEvaluationHistory', () => jest.fn());
jest.mock('../utils/createDicomSrBlob', () => jest.fn());

import { EvaluationHistory } from './PanelDefectList';

describe('NDT evaluation history', () => {
  it('renders read-only history grouped by part without related-object navigation', () => {
    render(
      React.createElement(EvaluationHistory, {
        history: {
          parts: [
            {
              id: 1,
              partNo: 'P-000031',
              partName: '焊缝 A',
              sourceSopInstanceUid: '1.2.3',
              evaluations: [
                {
                  id: 9,
                  evaluatorUserName: 'inspector',
                  evaluateTime: '2026-07-21 10:00:00',
                  defectType: '裂纹',
                  defectLevel: 'II',
                  conclusion: '不合格',
                },
              ],
            },
          ],
        },
      })
    );

    expect(screen.getByText(/P-000031/)).toBeTruthy();
    expect(screen.getByText(/裂纹 \/ II \/ 不合格/)).toBeTruthy();
    expect(screen.getByText(/inspector/)).toBeTruthy();
    expect(screen.queryByText('相关对象')).toBeNull();
    expect(screen.queryByText('返回原始图')).toBeNull();
  });
});
