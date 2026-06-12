import type {
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsMetadataPrimitive,
  AnalyticsMetadataValue,
} from './analytics-events';

declare global {
  interface Window {
    sa_event: (event: string, metadata?: Record<string, string | number>) => void;
    sa_loaded: boolean;
  }
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
  if (window.sa_loaded) {
    window.sa_event(name, serializeMetadata(metadata));
    if (callback) callback();
  } else if (callback) {
    callback();
  }
}
