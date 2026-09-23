import { execFileSync } from 'node:child_process';

/** Fecha (YYYY-MM-DD) del último commit que tocó el archivo; null si no hay git, historial o el archivo no está commiteado. */
export function gitLastMod(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}
