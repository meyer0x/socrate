// Complète la CSP du fichier de headers d'un build de preview pour que le client joigne le service.
import { readFileSync, writeFileSync } from 'node:fs';

export const CSP_DIRECTIVES = ['connect-src', 'img-src', 'media-src'] as const;
const HEADER = /^(\s*Content-Security-Policy\s*:\s*)(.*?)(\s*)$/i;

export class CspError extends Error {}

/** Ajoute `origin` aux directives du client ; une directive absente part des sources de `default-src`. Sans `default-src`, elle reste libre. */
export function completePolicy(policy: string, origin: string): string {
  const directives = policy.split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]);
  const find = (name: string) => directives.find((d) => d[0]!.toLowerCase() === name);
  const fallback = find('default-src');
  for (const name of CSP_DIRECTIVES) {
    let directive = find(name);
    if (!directive) {
      if (!fallback) continue;
      directive = [name, ...fallback.slice(1)];
      directives.push(directive);
    }
    const sources = directive.slice(1).filter((s) => s.toLowerCase() !== "'none'");
    if (!sources.includes(origin)) sources.push(origin);
    directive.splice(1, directive.length - 1, ...sources);
  }
  return directives.map((d) => d.join(' ')).join('; ');
}

export function completeHeaders(text: string, origin: string, file = 'headers file'): string {
  const lines = text.split('\n');
  const found = lines.flatMap((line, i) => (HEADER.test(line) ? [i] : []));
  if (found.length !== 1) throw new CspError(`${file} must contain exactly one Content-Security-Policy line, found ${found.length}`);
  const i = found[0]!;
  const [, head, policy, tail] = HEADER.exec(lines[i]!)!;
  if (!policy) throw new CspError(`${file}: the Content-Security-Policy line is empty`);
  lines[i] = `${head}${completePolicy(policy, origin)}${tail}`;
  return lines.join('\n');
}

export function completeHeadersFile(path: string, origin: string): void {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new CspError(`csp: ${path} not found in the build output`);
  }
  writeFileSync(path, completeHeaders(text, origin, path));
}
