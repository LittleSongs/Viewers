import PanelDefectList from './panels/PanelDefectList';
import type { Types } from '@ohif/core';

export default function getPanelModule({}: Types.Extensions.ExtensionParams) {
  return [
    {
      name: 'panelDefectList',
      iconName: 'StatusError',
      iconLabel: 'Defects',
      label: 'NDT评定',
      component: PanelDefectList,
    },
  ];
}
