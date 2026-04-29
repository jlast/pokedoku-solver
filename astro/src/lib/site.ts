export const SITE_URL = "https://www.pokedoku-helper.com";
export const SITE_NAME = "Pokedoku Helper";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export function absoluteUrl(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalized, SITE_URL).toString();
}
