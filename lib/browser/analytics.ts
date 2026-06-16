import type {
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsMetadataPrimitive,
  AnalyticsMetadataValue,
} from './analytics-events';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (command: 'event' | 'js' | 'config', ...args: unknown[]) => void;
  }
}

function getNormalizedPath(path: string): string {
  if (path.startsWith('/pokemon/')) {
    return '/pokemon/***';
  }

  if (path.startsWith('/tools/category/')) {
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 3) return '/tools/category/*';
    if (parts.length === 4) return '/tools/category/*/*';

    return '/tools/category/***';
  }

  return path;
}

function getRouteMetadata(path: string): Record<string, string | undefined> {
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'pokemon' && parts[1]) {
    return {
      route_type: 'pokemon',
      pokemon_slug: parts.slice(1).join('/'),
    };
  }

  if (parts[0] === 'tools' && parts[1] === 'category' && parts[2]) {
    return {
      route_type: 'category',
      category_slug: parts[2],
      subcategory_slug: parts[3] || undefined,
    };
  }

  return {};
}

function serializeMetadata(
  metadata?: Record<string, AnalyticsMetadataValue>,
): Record<string, string | number> | undefined {
  if (!metadata) return undefined;

  const serializedEntries = Object.entries(metadata).flatMap(([key, value]) => {
    if (value === undefined) return [];
    if (Array.isArray(value)) return [[key, value.join(',')]];
    if (typeof value === 'boolean') return [[key, value ? 'true' : 'false']];
    return [[key, value satisfies AnalyticsMetadataPrimitive]];
  });

  return serializedEntries.length > 0 ? Object.fromEntries(serializedEntries) : undefined;
}

export function trackEvent<T extends AnalyticsEventName>(
  name: T,
  metadata?: AnalyticsEventMap[T],
  callback?: () => void,
) {
  if (typeof window.gtag === 'function') {
    const serializedMetadata = serializeMetadata(metadata) ?? {};

    if (name === 'page_view') {
      Object.assign(serializedMetadata, {
        page_path: getNormalizedPath(window.location.pathname),
        page_location: window.location.href,
        page_title: document.title,
        raw_path: window.location.pathname,
        ...getRouteMetadata(window.location.pathname),
      });
    }

    window.gtag('event', name, serializedMetadata);
    if (callback) callback();
  } else if (callback) {
    callback();
  }
}
