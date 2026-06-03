import {
  initToolGroups,
  toolbarButtons as longitudinalToolbarButtons,
  extensionDependencies as longitudinalExtensionDependencies,
  modeInstance as longitudinalModeInstance,
} from '@ohif/mode-longitudinal';
import { ToolbarService } from '@ohif/core';
import { id } from './id';

const DEFECT_PANEL_ID = '@ohif/extension-industrial-review.panelModule.panelDefectList';
const LINE_PROFILE_PANEL_ID = '@ohif/extension-industrial-review.panelModule.panelLineProfile';

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

const defectAnnotationButtonGroup = {
  id: 'DefectAnnotation',
  uiType: 'ohif.toolButtonList',
  props: {
    buttonSection: 'defectAnnotationSection',
  },
};

const defectRectangleButton = {
  id: 'DefectRectangle',
  uiType: 'ohif.toolButton',
  props: {
    id: 'RectangleROI',
    icon: 'tool-rectangle',
    label: '矩形缺陷',
    tooltip: '框选矩形缺陷',
    commands: 'activateDefectRectangleTool',
    evaluate: 'evaluate.cornerstoneTool',
  },
};

const defectPolygonButton = {
  id: 'DefectPolygon',
  uiType: 'ohif.toolButton',
  props: {
    id: 'PlanarFreehandROI',
    icon: 'tool-freehand',
    label: '多边形缺陷',
    tooltip: '绘制多边形缺陷',
    commands: 'activateDefectPolygonTool',
    evaluate: 'evaluate.cornerstoneTool',
  },
};

const defectPointButton = {
  id: 'DefectPoint',
  uiType: 'ohif.toolButton',
  props: {
    id: 'Probe',
    icon: 'tool-probe',
    label: '点缺陷',
    tooltip: '点选缺陷位置',
    commands: 'activateDefectPointTool',
    evaluate: 'evaluate.cornerstoneTool',
  },
};

const primaryToolbar = longitudinalModeInstance.toolbarSections?.[TOOLBAR_SECTIONS.primary] || [];
const industrialRouteBase = longitudinalModeInstance.routes?.[0];
const industrialRouteProps = industrialRouteBase?.layoutInstance?.props || {};
const rightPanels = industrialRouteProps.rightPanels || [];

const toolbarSections = {
  ...longitudinalModeInstance.toolbarSections,
  defectAnnotationSection: ['DefectRectangle', 'DefectPolygon', 'DefectPoint'],
  [TOOLBAR_SECTIONS.primary]: [...primaryToolbar, 'InspectionContext', 'DefectAnnotation'],
};

const toolbarButtons = [
  ...longitudinalToolbarButtons,
  inspectionContextButton,
  defectAnnotationButtonGroup,
  defectRectangleButton,
  defectPolygonButton,
  defectPointButton,
];

const extensions = {
  ...longitudinalExtensionDependencies,
  '@ohif/extension-industrial-review': '^3.0.0',
};

const industrialRoute = {
  ...industrialRouteBase,
  path: 'industrial-viewer',
  layoutInstance: {
    ...industrialRouteBase?.layoutInstance,
    props: {
      ...industrialRouteProps,
      rightPanels: [...rightPanels, DEFECT_PANEL_ID, LINE_PROFILE_PANEL_ID],
    },
  },
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
