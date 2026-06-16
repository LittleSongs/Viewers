import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Types } from '@ohif/core';
import buildInspectionContext from './utils/buildInspectionContext';
import InspectionContextModal from './components/InspectionContextModal';
import NdtCurveFloatingPanel from './components/NdtCurveFloatingPanel';
import { sampleLineFromActiveViewport } from './utils/curveSampling';
import { DEFECT_PANEL_ID, type DefectToolName } from './types';
import type { CurveData } from './types/curve';
import { saveEvaluation } from './api/ndtClient';

const DEFECT_TOOL_GROUP_IDS = ['default', 'mpr', 'SRToolGroup', 'volume3d'];
const GRAYSCALE_CURVE_CONTAINER_ID = 'ohif-ndt-grayscale-curve-floating-panel';

let grayscaleCurveRoot: Root | null = null;
let grayscaleCurveContainer: HTMLDivElement | null = null;

function closeGrayscaleCurveFloatingPanel() {
  grayscaleCurveRoot?.unmount();
  grayscaleCurveRoot = null;

  grayscaleCurveContainer?.remove();
  grayscaleCurveContainer = null;
}

function renderGrayscaleCurveFloatingPanel(curveData: CurveData) {
  if (!grayscaleCurveContainer) {
    grayscaleCurveContainer = document.createElement('div');
    grayscaleCurveContainer.id = GRAYSCALE_CURVE_CONTAINER_ID;
    document.body.appendChild(grayscaleCurveContainer);
    grayscaleCurveRoot = createRoot(grayscaleCurveContainer);
  }

  grayscaleCurveRoot?.render(
    React.createElement(NdtCurveFloatingPanel, {
      curveData,
      onClose: closeGrayscaleCurveFloatingPanel,
    })
  );
}

function commandsModule({
  servicesManager,
  commandsManager,
}: Types.Extensions.ExtensionParams): Types.Extensions.CommandsModule {
  const {
    viewportGridService,
    displaySetService,
    uiModalService,
    panelService,
    measurementService,
    uiNotificationService,
  } = servicesManager.services as AppTypes.Services;

  const activateDefectTool = (toolName: DefectToolName) => {
    panelService.activatePanel(DEFECT_PANEL_ID, true);
    commandsManager.runCommand('setToolActiveToolbar', {
      toolName,
      toolGroupIds: DEFECT_TOOL_GROUP_IDS,
    });
  };
  const notifyCurveMessage = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    if (uiNotificationService?.show) {
      uiNotificationService.show({
        title: '灰度曲线分析',
        message,
        type,
        duration: 3000,
      });
      return;
    }

    console.warn(`[NDT curve] ${message}`);
  };

  const openGrayscaleCurvePanel = () => {
    const result = sampleLineFromActiveViewport({ servicesManager });

    if (!result.data) {
      notifyCurveMessage(result.error || '无法生成灰度曲线。', 'warning');
      return;
    }

    renderGrayscaleCurveFloatingPanel(result.data);
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
    activateGrayscaleCurveTool: () => {
      commandsManager.runCommand('setToolActiveToolbar', {
        toolName: 'Length',
        toolGroupIds: DEFECT_TOOL_GROUP_IDS,
      });
      openGrayscaleCurvePanel();
    },
    openGrayscaleCurvePanel,
    closeGrayscaleCurvePanel: closeGrayscaleCurveFloatingPanel,
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
    saveNdtEvaluation: ({ payload, runtimeConfig }) => {
      return saveEvaluation(payload, runtimeConfig);
    },
  };

  return {
    actions,
    definitions: {
      showInspectionContextModal: actions.showInspectionContextModal,
      activateDefectRectangleTool: actions.activateDefectRectangleTool,
      activateDefectPolygonTool: actions.activateDefectPolygonTool,
      activateDefectPointTool: actions.activateDefectPointTool,
      activateGrayscaleCurveTool: actions.activateGrayscaleCurveTool,
      openGrayscaleCurvePanel: actions.openGrayscaleCurvePanel,
      closeGrayscaleCurvePanel: actions.closeGrayscaleCurvePanel,
      jumpToDefect: actions.jumpToDefect,
      removeDefect: actions.removeDefect,
      updateDefectMeasurement: actions.updateDefectMeasurement,
      saveNdtEvaluation: actions.saveNdtEvaluation,
    },
    defaultContext: 'DEFAULT',
  };
}

export default commandsModule;
