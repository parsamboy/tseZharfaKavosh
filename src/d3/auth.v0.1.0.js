/**
 * tseZharfaKavosh — D3 auth/discovery v0.1.0 (G-17)
 * Managed Container + OAuth2/OIDC per D-2026-10-03-003, D-2026-10-05-002 Option A (explicit opt-in)
 * No provider chosen yet — topology fixed, discovery via .well-known
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-d3auth-001';
const SUPPORTED_GRANTS=['authorization_code','refresh_token'];
const DISCOVERY_PATH='/.well-known/openid-configuration';

/**
 * @param {object} p { issuer, clientId, redirectUri }
 */
function validateAuthConfig(p={}){
  if(!p.issuer || typeof p.issuer!=='string' || !p.issuer.startsWith('https://')) return { error:'invalid issuer https required' };
  if(!p.clientId || typeof p.clientId!=='string') return { error:'invalid clientId' };
  if(!p.redirectUri || typeof p.redirectUri!=='string' || !p.redirectUri.startsWith('https://')) return { error:'invalid redirectUri https required' };
  return { config:{ issuer:p.issuer, discoveryUrl:p.issuer+DISCOVERY_PATH, clientId:p.clientId, redirectUri:p.redirectUri, grants:SUPPORTED_GRANTS }, version:VERSION };
}

function discoveryUrl(issuer){ return issuer.replace(/\/$/,'')+DISCOVERY_PATH; }

module.exports={ validateAuthConfig, discoveryUrl, SUPPORTED_GRANTS, VERSION };
if(typeof window!=='undefined') window.TseD3Auth={ validateAuthConfig, discoveryUrl, SUPPORTED_GRANTS, VERSION };
