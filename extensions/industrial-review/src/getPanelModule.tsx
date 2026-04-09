import PanelDefectList from './panels/PanelDefectList';
import type { Types } from '@ohif/core';

export default function getPanelModule({}: Types.Extensions.ExtensionParams) {
  return [
    {
      name: 'panelDefectList',
      iconName: 'StatusError',
      iconLabel: 'Defects',
      label: '缺陷清单',
      component: PanelDefectList,
    },
  ];
}
