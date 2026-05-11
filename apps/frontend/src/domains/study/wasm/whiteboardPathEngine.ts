type WhiteboardPathEngineExports = {
  memory: WebAssembly.Memory;
  simplify_radial: (
    pointsPtr: number,
    pointCount: number,
    epsilonSq: number,
    outputPtr: number,
  ) => number;
  __heap_base?: WebAssembly.Global | number;
};

type WhiteboardPathEngine = {
  exports: WhiteboardPathEngineExports;
  heapBase: number;
};

type BufferLike = {
  from: (value: string, encoding: 'base64') => Uint8Array;
};

const WHITEBOARD_PATH_ENGINE_WASM_BASE64 =
  'AGFzbQEAAAABCQFgBH9/fX8BfwMCAQAFBAEBARAGFgN/AUGAgAILfwBBgIACC38AQYCAAgsHNwQGbWVtb3J5AgAPc2ltcGxpZnlfcmFkaWFsAAAKX19kYXRhX2VuZAMBC19faGVhcF9iYXNlAwIK9QEB8gEGAX8CfQR/AX0BfwJ9AkAgAQ0AQQAPCyADQQA2AgAgAUECIAFBAksbQX9qIQQgAEEEaioCACEFIAAqAgAhBkEBIQdBASEIA38gACAHQQN0aiEJA0ACQCAEIAciCkcNAAJAIAFBAUYNACADIAhBAnRqIglBfGooAgAgAUF/aiIHRg0AIAkgBzYCACAIQQFqIQgLIAgPCyAJKgIAIQsgCUEEaiEMIAlBCGohCSAKQQFqIQcgCyAGkyINIA2UIAwqAgAiDiAFkyINIA2UkiACYEUNAAsgAyAIQQJ0aiAKNgIAIAhBAWohCCAOIQUgCyEGDAALCw==';

const WASM_PAGE_SIZE_BYTES = 64 * 1024;
const WHITEBOARD_WASM_MAX_POINTS = 80_000;

let enginePromise: Promise<WhiteboardPathEngine | null> | null = null;

const alignTo = (value: number, alignment: number) => Math.ceil(value / alignment) * alignment;

const getGlobalValue = (value: WebAssembly.Global | number | undefined) => {
  if (typeof value === 'number') return value;
  if (value && typeof value.value === 'number') return value.value;
  return 0;
};

const decodeBase64Wasm = (base64: string) => {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  const buffer = (globalThis as typeof globalThis & { Buffer?: BufferLike }).Buffer;
  if (buffer) {
    return new Uint8Array(buffer.from(base64, 'base64'));
  }

  throw new Error('Base64 decoder is unavailable for whiteboard WASM engine');
};

const loadWhiteboardPathEngine = async () => {
  if (typeof WebAssembly === 'undefined') {
    return null;
  }

  if (!enginePromise) {
    enginePromise = WebAssembly.instantiate(
      decodeBase64Wasm(WHITEBOARD_PATH_ENGINE_WASM_BASE64),
      {},
    )
      .then(({ instance }) => {
        const exports = instance.exports as WhiteboardPathEngineExports;
        if (!exports.memory || typeof exports.simplify_radial !== 'function') {
          throw new Error('Invalid whiteboard WASM exports');
        }

        return {
          exports,
          heapBase: alignTo(getGlobalValue(exports.__heap_base), 8),
        };
      })
      .catch((error) => {
        console.warn('[WhiteboardWASM] Failed to initialize path engine', error);
        return null;
      });
  }

  return enginePromise;
};

const ensureMemoryCapacity = (memory: WebAssembly.Memory, requiredBytes: number) => {
  if (requiredBytes <= memory.buffer.byteLength) {
    return true;
  }

  const missingBytes = requiredBytes - memory.buffer.byteLength;
  const pagesToGrow = Math.ceil(missingBytes / WASM_PAGE_SIZE_BYTES);

  try {
    memory.grow(pagesToGrow);
    return requiredBytes <= memory.buffer.byteLength;
  } catch {
    return false;
  }
};

export async function simplifyPathPointIndicesWithWasm(
  points: Float32Array,
  epsilonPx: number,
): Promise<Uint32Array | null> {
  const pointCount = points.length / 2;
  if (!Number.isInteger(pointCount) || pointCount <= 0 || pointCount > WHITEBOARD_WASM_MAX_POINTS) {
    return null;
  }

  const engine = await loadWhiteboardPathEngine();
  if (!engine) {
    return null;
  }

  const inputPtr = engine.heapBase;
  const inputBytes = points.byteLength;
  const outputPtr = alignTo(inputPtr + inputBytes, Uint32Array.BYTES_PER_ELEMENT);
  const outputBytes = pointCount * Uint32Array.BYTES_PER_ELEMENT;
  const requiredBytes = outputPtr + outputBytes;

  if (!ensureMemoryCapacity(engine.exports.memory, requiredBytes)) {
    return null;
  }

  new Float32Array(engine.exports.memory.buffer, inputPtr, points.length).set(points);

  const keptCount = engine.exports.simplify_radial(
    inputPtr,
    pointCount,
    epsilonPx * epsilonPx,
    outputPtr,
  );

  if (keptCount <= 0 || keptCount > pointCount) {
    return null;
  }

  return new Uint32Array(new Uint32Array(engine.exports.memory.buffer, outputPtr, keptCount));
}
