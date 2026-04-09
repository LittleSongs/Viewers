import {
  initToolGroups,
  toolbarButtons as longitudinalToolbarButtons,
  extensionDependencies as longitudinalExtensionDependencies,
  modeInstance as longitudinalModeInstance,
} from '@ohif/mode-longitudinal';
import { ToolbarService } from '@ohif/core';
import { id } from './id';

const { TOOLBAR_SECTIONS } = ToolbarService;

const inspectionContextButton = {
  id: 'InspectionContext',
  uiType: 'ohif.toolButton',
  props: {
    icon: 'dicom-tag-browser',
    label: 'Inspection Context',
    tooltip: '工业图像上下文 / 工件信息',
    commands: 'showInspectionContextModal',
    evaluate: 'evaluate.action',
  },
};

const primaryToolbar = longitudinalModeInstance.toolbarSections?.[TOOLBAR_SECTIONS.primary] || [];

const toolbarSections = {
  ...longitudinalModeInstance.toolbarSections,
  [TOOLBAR_SECTIONS.primary]: [...primaryToolbar, 'InspectionContext'],
};

const toolbarButtons = [...longitudinalToolbarButtons, inspectionContextButton];

const extensions = {
  ...longitudinalExtensionDependencies,
  '@ohif/extension-industrial-review': '^3.0.0',
};

const industrialRoute = {
  ...longitudinalModeInstance.routes?.[0],
  path: 'industrial-viewer',
};

const industrialMode = {
  ...longitudinalModeInstance,
  id,
  routeName: 'industrial-viewer',
  displayName: 'Industrial Viewer',
  hide: false,
  routes: [industrialRoute],
  extensions,
  toolbarButtons,
  toolbarSections,
  isValidMode: () => ({
    valid: true,
    description: 'Generic industrial review mode',
  }),
};

const mode = {
  id,
  modeInstance: industrialMode,
  extensionDependencies: extensions,
  modeFactory: async () => industrialMode,
};

export default mode;
export { initToolGroups, toolbarButtons };
