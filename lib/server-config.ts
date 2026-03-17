function normalizeOptional(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalNumber(value?: string | null) {
  const normalized = normalizeOptional(value);

  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export const serverConfig = {
  baseUrl: normalizeOptional(process.env.UIPATH_BASE_URL),
  orgName: normalizeOptional(process.env.UIPATH_ORG_NAME),
  tenantName: normalizeOptional(process.env.UIPATH_TENANT_NAME),
  clientId: normalizeOptional(process.env.UIPATH_CLIENT_ID),
  redirectUri: normalizeOptional(process.env.UIPATH_REDIRECT_URI),
  scope: normalizeOptional(process.env.UIPATH_SCOPE),
  secret: normalizeOptional(process.env.UIPATH_SECRET),
  folderId: normalizeOptionalNumber(process.env.UIPATH_FOLDER_ID),
  folderKey: normalizeOptional(process.env.UIPATH_FOLDER_KEY),
  bucketId: normalizeOptionalNumber(process.env.UIPATH_BUCKET_ID),
  processKey: normalizeOptional(process.env.UIPATH_SECURITY_CLAIM_PROCESS_KEY) ?? "SECURITY_CLAIM",
  bucketPathPrefix: normalizeOptional(process.env.UIPATH_BUCKET_PATH_PREFIX) ?? "security-claims",
};

export function hasServerUiPathCoreConfig() {
  return Boolean(serverConfig.baseUrl && serverConfig.orgName && serverConfig.tenantName);
}

export function hasServerSecretConfig() {
  return hasServerUiPathCoreConfig() && Boolean(serverConfig.secret);
}
