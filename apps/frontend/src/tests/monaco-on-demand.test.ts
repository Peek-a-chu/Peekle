import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('profile history Monaco on-demand loading', () => {
  it('keeps Monaco out of the history list entry chunk', () => {
    const source = readSource('src/domains/profile/components/CCHistoryList.tsx');

    expect(source).not.toContain('@monaco-editor/react');
    expect(source).toContain("dynamic(() => import('./CCSubmissionCodeViewer')");
    expect(source).toContain('useSubmissionCodeViewer');
  });

  it('loads Monaco only inside the submission code viewer island', () => {
    const source = readSource('src/domains/profile/components/CCSubmissionCodeViewer.tsx');

    expect(source).toContain('@monaco-editor/react');
  });
});
