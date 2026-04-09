import { Types } from '@ohif/core';
import buildInspectionContext from './utils/buildInspectionContext';
import InspectionContextModal from './components/InspectionContextModal';

function commandsModule({
  servicesManager,
}: Types.Extensions.ExtensionParams): Types.Extensions.CommandsModule {
  const { viewportGridService, displaySetService, uiModalService } =
    servicesManager.services as AppTypes.Services;

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
  };

  return {
    actions,
    definitions: {
      showInspectionContextModal: actions.showInspectionContextModal,
    },
    defaultContext: 'DEFAULT',
  };
}

export default commandsModule;
