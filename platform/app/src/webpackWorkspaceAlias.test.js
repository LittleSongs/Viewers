const path = require('path');

const createWebpackBase = require('../../../.webpack/webpack.base');

describe('webpack workspace aliases', () => {
  it('resolves @ohif/app imports to the current worktree app entry', () => {
    const config = createWebpackBase(
      {},
      {},
      {
        SRC_DIR: path.resolve(__dirname),
        ENTRY: path.resolve(__dirname, 'index.js'),
      }
    );

    expect(config.resolve.alias['@ohif/app$']).toBe(path.resolve(__dirname));
  });
});
