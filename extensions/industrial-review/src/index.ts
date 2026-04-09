import { Types } from '@ohif/core';
import { id } from './id';
import getCommandsModule from './commandsModule';
import getPanelModule from './getPanelModule';

const industrialReviewExtension: Types.Extensions.Extension = {
  id,
  getCommandsModule,
  getPanelModule,
};

export default industrialReviewExtension;
