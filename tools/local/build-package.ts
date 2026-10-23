// Construit `packages/socrate/dist/` : JavaScript et déclarations du paquet publié, `@socrate/contract` et `@socrate/react` embarqués, aucune source TypeScript.
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chmodSync, copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { guardedPath, localPath } from './local-run.ts';

export const PACKAGE_DIR = localPath('packages/socrate');

export async function buildPackage(dist = join(PACKAGE_DIR, 'dist')): Promise<string> {
  const outdir = guardedPath(dist);
  const pkg = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8')) as { dependencies: Record<string, string>; peerDependencies: Record<string, string> };
  // Dépendances et pairs restent des imports nus, résolus chez l'hôte : mediabunny reste chargé à la demande par son bundler.
  const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)].flatMap((name) => [name, `${name}/*`]);
  const common = { absWorkingDir: PACKAGE_DIR, bundle: true, format: 'esm', splitting: true, external, outdir, sourcemap: false, logLevel: 'warning', legalComments: 'inline', chunkNames: 'chunks/[name]-[hash]' } as const;
  const { build } = await import('esbuild');
  rmSync(outdir, { recursive: true, force: true });
  await build({ ...common, entryPoints: { react: 'src/react.tsx' }, platform: 'browser', target: 'es2022', jsx: 'automatic' });
  await build({ ...common, entryPoints: { vite: 'src/vite.ts', cli: 'src/cli.ts' }, platform: 'node', target: 'node20' });
  for (const file of ['react.d.ts', 'vite.d.ts', 'vite-client.d.ts']) copyFileSync(join(PACKAGE_DIR, 'types', file), join(outdir, file));
  const cli = join(outdir, 'cli.js');
  writeFileSync(cli, `#!/usr/bin/env node\n${readFileSync(cli, 'utf8')}`);
  chmodSync(cli, 0o755);
  return outdir;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`package built: ${await buildPackage()}`);
}
