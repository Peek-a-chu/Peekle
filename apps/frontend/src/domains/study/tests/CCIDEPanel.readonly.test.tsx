import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CCIDEPanel } from '@/domains/study/components/CCIDEPanel';

const editorStats = vi.hoisted(() => ({
  mountCount: 0,
  unmountCount: 0,
  setModelLanguageCalls: 0,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '123' }),
}));

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@monaco-editor/react', async () => {
  const React = await import('react');

  const MockEditor = ({
    value,
    language,
    path,
    onMount,
  }: {
    value?: string;
    language?: string;
    path?: string;
    onMount?: (editor: any, monaco: any) => void;
  }) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const valueRef = React.useRef(value ?? '');
    const modelRef = React.useRef({
      languageId: language ?? 'python',
      getLanguageId() {
        return modelRef.current.languageId;
      },
    });
    const editorApiRef = React.useRef<any>(null);

    if (!editorApiRef.current) {
      editorApiRef.current = {
        getValue: () => valueRef.current,
        setValue: (next: string) => {
          valueRef.current = next;
        },
        getContainerDomNode: () => containerRef.current ?? document.createElement('div'),
        addCommand: vi.fn(),
        trigger: vi.fn(),
        getModel: () => modelRef.current,
        onKeyDown: vi.fn(),
      };
    }

    React.useEffect(() => {
      valueRef.current = value ?? '';
    }, [value]);

    React.useEffect(() => {
      modelRef.current.languageId = language ?? 'python';
    }, [language]);

    React.useEffect(() => {
      editorStats.mountCount += 1;
      onMount?.(editorApiRef.current, {
        KeyMod: { Shift: 1 },
        KeyCode: { Enter: 13, KeyV: 86 },
        editor: {
          setModelLanguage: (model: { languageId: string }, nextLanguage: string) => {
            model.languageId = nextLanguage;
            editorStats.setModelLanguageCalls += 1;
          },
        },
      });

      return () => {
        editorStats.unmountCount += 1;
      };
    }, []);

    return (
      <div ref={containerRef} data-testid="mock-monaco-editor" data-language={language} data-path={path}>
        {value}
      </div>
    );
  };

  return {
    default: MockEditor,
  };
});

describe('CCIDEPanel readonly sync', () => {
  beforeEach(() => {
    editorStats.mountCount = 0;
    editorStats.unmountCount = 0;
    editorStats.setModelLanguageCalls = 0;
  });

  it('keeps the readonly editor mounted while realtime code packets update', async () => {
    const { rerender } = render(
      <CCIDEPanel
        readOnly
        hideToolbar
        editorId="other-editor"
        initialCode={'print("a")'}
        language="python"
      />,
    );

    await waitFor(() => {
      expect(editorStats.mountCount).toBe(1);
    });

    rerender(
      <CCIDEPanel
        readOnly
        hideToolbar
        editorId="other-editor"
        initialCode={'print("ab")'}
        language="python"
      />,
    );

    rerender(
      <CCIDEPanel
        readOnly
        hideToolbar
        editorId="other-editor"
        initialCode={'print("abc")'}
        language="python"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveTextContent('print("abc")');
    });

    expect(editorStats.mountCount).toBe(1);
    expect(editorStats.unmountCount).toBe(0);
  });
});
