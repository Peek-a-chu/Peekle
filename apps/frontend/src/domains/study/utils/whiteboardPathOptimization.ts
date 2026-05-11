import type { WhiteboardMessage } from '@/domains/study/types/whiteboard';

type FabricPathCommand = [string, ...number[]];
type WhiteboardPathPayload = {
  type?: string;
  path?: unknown;
  wasmOptimized?: boolean;
  wasmOriginalPathLength?: number;
  wasmOptimizedPathLength?: number;
  wasmSimplificationEpsilonPx?: number;
};

const WHITEBOARD_WASM_MIN_POINTS = 64;
const WHITEBOARD_PATH_SIMPLIFICATION_EPSILON_PX = 1.5;

const isWhiteboardWasmEnabled = () =>
  process.env.NEXT_PUBLIC_WHITEBOARD_WASM !== 'false' && typeof WebAssembly !== 'undefined';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getCommandEndpoint = (command: unknown): [number, number] | null => {
  if (!Array.isArray(command) || command.length < 3) {
    return null;
  }

  const numericValues = command.slice(1).filter(isFiniteNumber);
  if (numericValues.length < 2) {
    return null;
  }

  return [numericValues[numericValues.length - 2], numericValues[numericValues.length - 1]];
};

const clonePathCommand = (command: unknown) => (Array.isArray(command) ? [...command] : command);

export async function optimizeWhiteboardObjectPayload<T>(data: T): Promise<T> {
  const payload = data as WhiteboardPathPayload;
  const path = payload?.path;

  if (
    !isWhiteboardWasmEnabled() ||
    payload?.type !== 'path' ||
    !Array.isArray(path) ||
    path.length < WHITEBOARD_WASM_MIN_POINTS
  ) {
    return data;
  }

  const pointCommandIndexes: number[] = [];
  const pointCoordinates: number[] = [];

  path.forEach((command, commandIndex) => {
    const endpoint = getCommandEndpoint(command);
    if (!endpoint) return;

    pointCommandIndexes.push(commandIndex);
    pointCoordinates.push(endpoint[0], endpoint[1]);
  });

  if (pointCommandIndexes.length < WHITEBOARD_WASM_MIN_POINTS) {
    return data;
  }

  try {
    const { simplifyPathPointIndicesWithWasm } =
      await import('@/domains/study/wasm/whiteboardPathEngine');
    const keptPointIndexes = await simplifyPathPointIndicesWithWasm(
      new Float32Array(pointCoordinates),
      WHITEBOARD_PATH_SIMPLIFICATION_EPSILON_PX,
    );

    if (!keptPointIndexes || keptPointIndexes.length >= pointCommandIndexes.length) {
      return data;
    }

    const keptCommandIndexes = new Set<number>();
    keptPointIndexes.forEach((pointIndex) => {
      const commandIndex = pointCommandIndexes[pointIndex];
      if (commandIndex !== undefined) {
        keptCommandIndexes.add(commandIndex);
      }
    });

    const optimizedPath = path
      .filter(
        (command, commandIndex) =>
          !getCommandEndpoint(command) || keptCommandIndexes.has(commandIndex),
      )
      .map(clonePathCommand) as FabricPathCommand[];

    if (optimizedPath.length >= path.length) {
      return data;
    }

    return {
      ...(payload as Record<string, unknown>),
      path: optimizedPath,
      wasmOptimized: true,
      wasmOriginalPathLength: path.length,
      wasmOptimizedPathLength: optimizedPath.length,
      wasmSimplificationEpsilonPx: WHITEBOARD_PATH_SIMPLIFICATION_EPSILON_PX,
    } as T;
  } catch (error) {
    console.warn('[WhiteboardWASM] Path optimization skipped', error);
    return data;
  }
}

export async function optimizeWhiteboardMessagePayload(
  message: WhiteboardMessage,
): Promise<WhiteboardMessage> {
  if (!message.data || (message.action !== 'ADDED' && message.action !== 'MODIFIED')) {
    return message;
  }

  return {
    ...message,
    data: await optimizeWhiteboardObjectPayload(message.data),
  };
}
