#!/usr/bin/env node
const fs = require('fs');

const API = process.env.API || 'http://127.0.0.1:5000/api';

async function request(path, opts = {}) {
  const url = `${API}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = text; }
  return { status: res.status, body };
}

async function main() {
  const ts = Date.now();
  const applicantEmail = `e2e+${ts}@certicheck.com`;
  const applicantPassword = 'TestPass123!';

  console.log('Registering applicant:', applicantEmail);
  const reg = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: applicantEmail, password: applicantPassword, firstName: 'E2E', lastName: 'Applicant' }),
  });
  console.log('Register status', reg.status);
  if (reg.status !== 201) { console.error('Register failed', reg.body); process.exit(1); }
  const token = reg.body.token;

  console.log('Submitting application');
  const appRes = await request('/applications/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orgName: 'E2E Org', orgType: 'company', website: 'https://example.com', contactName: 'E2E Applicant', contactEmail: applicantEmail, contactRole: 'CTO', volume: 'low', useCase: 'testing', wallet: 'demo' }),
  });
  console.log('Submit status', appRes.status);
  if (appRes.status !== 201) { console.error('Submit failed', appRes.body); process.exit(2); }
  const appId = appRes.body.application.id;

  console.log('Admin login');
  const adminLogin = await request('/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@certicheck.com', password: 'admin123' })
  });
  if (adminLogin.status !== 200) { console.error('Admin login failed', adminLogin.body); process.exit(3); }
  const adminToken = adminLogin.body.token;

  console.log('Creating account for application', appId);
  const createRes = await request(`/applications/${appId}/create-account`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } });
  console.log('Create-account status', createRes.status);

  console.log('Approving application', appId);
  const approveRes = await request(`/applications/${appId}/approve`, { method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } });
  console.log('Approve status', approveRes.status);

  let issuerLogin = null;
  if (createRes.body && createRes.body.credentials) {
    const { email, password } = createRes.body.credentials;
    console.log('Logging in as issuer:', email);
    issuerLogin = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    console.log('Issuer login status', issuerLogin.status);
  } else {
    console.log('No credentials returned (maybe linked existing user)');
  }

  const out = { register: reg, submit: appRes, create: createRes, approve: approveRes, issuerLogin };
  fs.writeFileSync('/tmp/e2e_node_results.json', JSON.stringify(out, null, 2));
  console.log('E2E results written to /tmp/e2e_node_results.json');
}

main().catch(err => { console.error('E2E script error:', err); process.exit(99); });
