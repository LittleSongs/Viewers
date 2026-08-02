import { updateAuthServiceAndCleanUrl } from './updateAuthServiceAndCleanUrl';

describe('updateAuthServiceAndCleanUrl', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/industrial-viewer?taskId=3&token=launch-token');
  });

  it('preserves the launch token for NDT requests before removing it from the address bar', () => {
    const userAuthenticationService = {
      setServiceImplementation: jest.fn(),
    };

    updateAuthServiceAndCleanUrl(
      'launch-token',
      { search: '?taskId=3&token=launch-token' },
      userAuthenticationService
    );

    expect(window.sessionStorage.getItem('ndt.ruoyiToken')).toBe('launch-token');
    expect(window.location.search).toBe('?taskId=3');
  });
});
