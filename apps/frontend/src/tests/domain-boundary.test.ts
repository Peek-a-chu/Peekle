import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = join(process.cwd(), 'src');

const collectSourceFiles = (directory: string): string[] => {
  const entries = readdirSync(directory);

  return entries.flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return collectSourceFiles(path);
    }

    if (!/\.(ts|tsx)$/.test(entry)) {
      return [];
    }

    return [path];
  });
};

const findForbiddenImports = (domain: 'game' | 'study', forbiddenDomain: 'game' | 'study') => {
  const domainPath = join(SOURCE_ROOT, 'domains', domain);
  const pattern = new RegExp(`@/domains/${forbiddenDomain}/`);

  return collectSourceFiles(domainPath)
    .filter((filePath) => pattern.test(readFileSync(filePath, 'utf8')))
    .map((filePath) => relative(process.cwd(), filePath));
};

describe('study/game domain boundaries', () => {
  it('keeps game domain independent from study internals', () => {
    expect(findForbiddenImports('game', 'study')).toEqual([]);
  });

  it('keeps study domain independent from game internals', () => {
    expect(findForbiddenImports('study', 'game')).toEqual([]);
  });
});
