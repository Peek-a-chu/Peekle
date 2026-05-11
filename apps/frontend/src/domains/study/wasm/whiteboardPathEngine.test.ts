import { describe, expect, it } from 'vitest';
import { simplifyPathPointIndicesWithWasm } from './whiteboardPathEngine';

describe('whiteboardPathEngine', () => {
  it('returns radial simplification indexes from the embedded WASM module', async () => {
    const indexes = await simplifyPathPointIndicesWithWasm(
      new Float32Array([0, 0, 0.5, 0.5, 5, 0, 5.5, 0.2, 10, 0]),
      2,
    );

    expect(Array.from(indexes ?? [])).toEqual([0, 2, 4]);
  });
});
