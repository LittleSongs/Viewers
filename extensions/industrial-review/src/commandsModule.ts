import { Types } from '@ohif/core';
import buildInspectionContext from './utils/buildInspectionContext';
import InspectionContextModal from './components/InspectionContextModal';
import { DEFECT_PANEL_ID, type DefectToolName } from './types';

const DEFECT_TOOL_GROUP_IDS = ['default', 'mpr', 'SRToolGroup', 'volume3d'];

function commandsModule({
  servicesManager,
  commandsManager,
}: Types.Extensions.ExtensionParams): Types.Extensions.CommandsModule {
  const { viewportGridService, displaySetService, uiModalService, panelService, measurementService } =
    servicesManager.services as AppTypes.Services;

  const activateDefectTool = (toolName: DefectToolName) => {
    panelService.activatePanel(DEFECT_PANEL_ID, true);
    commandsManager.runCommand('setToolActiveToolbar', {
      toolName,
      toolGroupIds: DEFECT_TOOL_GROUP_IDS,
    });
  };

  const actions = {
    showInspectionContextModal: () => {
      const viewportGridState = viewportGridService.getState();
      const { activeViewportId, viewports } = viewportGridState;
      const activeViewport = activeViewportId ? viewports.get(activeViewportId) : null;
      const displaySetInstanceUID = activeViewport?.displaySetInstanceUIDs?.[0];

      const displaySet =
        typeof displaySetInstanceUID === 'string'
          ? displaySetService.getDisplaySetByUID(displaySetInstanceUID)
          : undefined;

      const instance = displaySet?.instance || displaySet?.instances?.[0];
      const context = displaySet ? buildInspectionContext(displaySet, instance) : null;

      uiModalService.show({
        content: InspectionContextModal,
        contentProps: {
          context,
        },
        title: 'Inspection Context',
        containerClassName: 'max-w-3xl',
      });
    },
    activateDefectRectangleTool: () => activateDefectTool('RectangleROI'),
    activateDefectPolygonTool: () => activateDefectTool('PlanarFreehandROI'),
    activateDefectPointTool: () => activateDefectTool('Probe'),
    jumpToDefect: ({ uid }) => {
      commandsManager.runCommand('jumpToMeasurement', { uid });
      panelService.activatePanel(DEFECT_PANEL_ID, true);
    },
    removeDefect: ({ uid }) => {
      commandsManager.runCommand('removeMeasurement', { uid });
    },
    updateDefectMeasurement: ({ uid, updates }) => {
      const measurement = measurementService.getMeasurement(uid);
      if (!measurement) {
        return;
      }

      measurementService.update(uid, { ...measurement, ...updates }, false);
    },
  };

  return {
    actions,
    definitions: {
      showInspectionContextModal: actions.showInspectionContextModal,
      activateDefectRectangleTool: actions.activateDefectRectangleTool,
      activateDefectPolygonTool: actions.activateDefectPolygonTool,
      activateDefectPointTool: actions.activateDefectPointTool,
      jumpToDefect: actions.jumpToDefect,
      removeDefect: actions.removeDefect,
      updateDefectMeasurement: actions.updateDefectMeasurement,
    },
    defaultContext: 'DEFAULT',
  };
}

export default commandsModule;
