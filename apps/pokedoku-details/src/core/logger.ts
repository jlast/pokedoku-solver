const PREFIX = '[pokedoku-details]';

const withPrefix = (message: unknown): unknown => {
  if (typeof message === 'string') {
    return `${PREFIX} ${message}`;
  }

  return `${PREFIX} ${String(message)}`;
};

export const log = (message: unknown, ...args: unknown[]): void => {
  console.log(withPrefix(message), ...args);
};

export const info = (message: unknown, ...args: unknown[]): void => {
  console.info(withPrefix(message), ...args);
};

export const warn = (message: unknown, ...args: unknown[]): void => {
  console.warn(withPrefix(message), ...args);
};

export const error = (message: unknown, ...args: unknown[]): void => {
  console.error(withPrefix(message), ...args);
};
