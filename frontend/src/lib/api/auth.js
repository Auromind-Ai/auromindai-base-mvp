import client from './client';

// Authentication endpoints stubs
export async function sendOTP(email, auth_type) {
  return client.post('/auth/send-otp', { email, auth_type });
}

export async function verifyOTP(email, otp, auth_type = 'login', full_name = null, workspace_name = null) {
  return client.post('/auth/verify-otp', {
    email,
    otp,
    auth_type,
    full_name,
    workspace_name
  });
}

export async function signup(email, password, full_name, workspace_name) {
  return client.post('/auth/signup', {
    email,
    password,
    full_name,
    workspace_name,
  });
}

export async function login(email) {
  return client.post('/auth/send-otp', { email });
}

export function googleLogin(type = 'login') {
  if (typeof window !== 'undefined') {
    window.location.href = `${client.baseURL}/auth/google/login?type=${type}`;
  }
}

export async function getCurrentUser(options = {}) {
  return client.get('/auth/me', options);
}

export async function updateProfile(data) {
  return client.patch('/auth/me', data);
}

export async function getWorkspaces() {
  return client.get('/auth/workspaces');
}

export async function get2FAStatus() {
  return client.get('/2fa/status');
}

export async function setup2FA() {
  return client.post('/2fa/setup', {});
}

export async function verifySetup2FA(code) {
  return client.post('/2fa/verify-setup', { code });
}

export async function verifyLogin2FA(pending_token, code) {
  return client.post('/2fa/verify-login', { pending_token, code });
}

export async function disable2FA(code) {
  return client.post('/2fa/disable', { code });
}

export async function requestAccountDeletion() {
  return client.post('/account/request-deletion', {});
}

export async function cancelAccountDeletion() {
  return client.post('/account/cancel-deletion', {});
}

export async function refreshToken() {
  return client.post('/auth/refresh', {});
}

export async function logout() {
  return client.post('/auth/logout', {});
}

export async function stopImpersonation() {
  return client.post('/auth/stop-impersonation', {});
}
