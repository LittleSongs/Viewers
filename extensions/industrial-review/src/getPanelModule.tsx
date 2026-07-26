import PanelDefectList from './panels/PanelDefectList';
import PanelNdtObjectBrowser from './panels/PanelNdtObjectBrowser';
import type { Types } from '@ohif/core';

export default function getPanelModule({}: Types.Extensions.ExtensionParams) {
  return [
    {
      name: 'panelNdtObjectBrowser',
      iconName: 'ListView',
      iconLabel: 'NDT Objects',
      label: '检测部位',
      component: PanelNdtObjectBrowser,
    },
    {
      name: 'panelDefectList',
      iconName: 'StatusError',
      iconLabel: 'Defects',
      label: 'NDT评定',
      component: PanelDefectList,
    },
  ];
}
