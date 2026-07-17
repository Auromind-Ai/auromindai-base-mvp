import client from './client';
import * as auth from './auth';
import * as admin from './admin';
import * as analytics from './analytics';
import * as billing from './billing';
import * as brain from './brain';
import * as calendar from './calendar';
import * as channels from './channels';
import * as chat from './chat';
import * as integrations from './integrations';
import * as settings from './settings';
import * as templates from './templates';
import * as users from './users';
import * as dashboard from './dashboard';

const api = {
  // Expose the base request helpers as well
  request: client.request.bind(client),
  requestRaw: client.requestRaw.bind(client),
  get: client.get.bind(client),
  post: client.post.bind(client),
  put: client.put.bind(client),
  patch: client.patch.bind(client),
  delete: client.delete.bind(client),
  addRequestHook: client.addRequestHook.bind(client),
  addResponseHook: client.addResponseHook.bind(client),
  setCSRFTokenGetter: client.setCSRFTokenGetter.bind(client),
  baseURL: client.baseURL,
  
  ...auth,
  ...admin,
  ...analytics,
  ...billing,
  ...brain,
  ...calendar,
  ...channels,
  ...chat,
  ...integrations,
  ...settings,
  ...templates,
  ...users,
  ...dashboard,
};

export default api;
export { api };
