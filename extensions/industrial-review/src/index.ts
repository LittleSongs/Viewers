import { Types } from '@ohif/core';
import { id } from './id';
import getCommandsModule from './commandsModule';

const industrialReviewExtension: Types.Extensions.Extension = {
  id,
  getCommandsModule,
};

export default industrialReviewExtension;
