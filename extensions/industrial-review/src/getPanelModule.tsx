import PanelDefectList from './panels/PanelDefectList';
import PanelLineProfile from './panels/PanelLineProfile';
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
    {
      name: 'panelLineProfile',
      iconName: 'tab-linear',
      iconLabel: 'Profile',
      label: '灰度曲线',
      component: PanelLineProfile,
    },
  ];
}
