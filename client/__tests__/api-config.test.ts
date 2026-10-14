/**
 * Config override: when expo.extra IS set (app.json on a real device), the
 * API client must use those values instead of the defaults.
 */
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { agentUrl: 'http://192.168.0.50:8000', viewerId: 'viewer-42' },
    },
  },
}));

import { AGENT_URL, VIEWER_ID } from '../lib/api';

it('reads agentUrl/viewerId from expo extra', () => {
  expect(AGENT_URL).toBe('http://192.168.0.50:8000');
  expect(VIEWER_ID).toBe('viewer-42');
});
