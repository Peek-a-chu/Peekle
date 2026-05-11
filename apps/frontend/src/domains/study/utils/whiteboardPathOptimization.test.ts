import { describe, expect, it, vi, beforeEach } from 'vitest';
import { optimizeWhiteboardObjectPayload } from './whiteboardPathOptimization';
import { simplifyPathPointIndicesWithWasm } from '@/domains/study/wasm/whiteboardPathEngine';

type OptimizedWhiteboardPathPayload = {
  path: readonly unknown[];
  wasmOptimized?: boolean;
  wasmOriginalPathLength?: number;
  wasmOptimizedPathLength?: number;
  stroke?: string;
};

vi.mock('@/domains/study/wasm/whiteboardPathEngine', () => ({
  simplifyPathPointIndicesWithWasm: vi.fn(),
}));

const mockedSimplifyPathPointIndicesWithWasm = vi.mocked(simplifyPathPointIndicesWithWasm);

const createPath = (length: number) =>
  Array.from({ length }, (_, index) => [index === 0 ? 'M' : 'L', index, index] as const);

describe('whiteboardPathOptimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('simplifies large Fabric path payloads with WASM-selected point indexes', async () => {
    mockedSimplifyPathPointIndicesWithWasm.mockResolvedValue(new Uint32Array([0, 10, 69]));
    const payload = {
      id: 'path-1',
      type: 'path',
      path: createPath(70),
      stroke: '#111111',
    };

    const result = (await optimizeWhiteboardObjectPayload(
      payload,
    )) as OptimizedWhiteboardPathPayload;

    expect(mockedSimplifyPathPointIndicesWithWasm).toHaveBeenCalledOnce();
    expect(Array.from(mockedSimplifyPathPointIndicesWithWasm.mock.calls[0][0])).toHaveLength(140);
    expect(result.path).toEqual([
      ['M', 0, 0],
      ['L', 10, 10],
      ['L', 69, 69],
    ]);
    expect(result.wasmOptimized).toBe(true);
    expect(result.wasmOriginalPathLength).toBe(70);
    expect(result.wasmOptimizedPathLength).toBe(3);
    expect(result.stroke).toBe('#111111');
  });

  it('keeps small path payloads on the original JS path', async () => {
    const payload = {
      id: 'path-2',
      type: 'path',
      path: createPath(10),
    };

    const result = await optimizeWhiteboardObjectPayload(payload);

    expect(result).toBe(payload);
    expect(mockedSimplifyPathPointIndicesWithWasm).not.toHaveBeenCalled();
  });

  it('falls back to the original payload when the WASM engine cannot produce indexes', async () => {
    mockedSimplifyPathPointIndicesWithWasm.mockResolvedValue(null);
    const payload = {
      id: 'path-3',
      type: 'path',
      path: createPath(70),
    };

    const result = await optimizeWhiteboardObjectPayload(payload);

    expect(result).toBe(payload);
  });
});
