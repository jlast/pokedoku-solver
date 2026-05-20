/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_ENABLE_AUTH?: string;
  readonly PUBLIC_ALLOW_AUTH_QUERY_OVERRIDE?: string;
  readonly PUBLIC_COGNITO_REGION: string;
  readonly PUBLIC_COGNITO_USER_POOL_ID: string;
  readonly PUBLIC_COGNITO_CLIENT_ID: string;
  readonly PUBLIC_COGNITO_DOMAIN: string;
  readonly PUBLIC_COGNITO_REDIRECT_SIGN_IN: string;
  readonly PUBLIC_COGNITO_REDIRECT_SIGN_OUT: string;
  readonly PUBLIC_USER_DEX_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
