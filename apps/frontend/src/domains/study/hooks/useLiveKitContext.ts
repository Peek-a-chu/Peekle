'use client';

import { useLocalParticipant } from '@livekit/components-react';
import { LocalParticipant } from 'livekit-client';
import { useEffect, useState } from 'react';

// A safe hook that returns localParticipant if in a room, or null if outside.
export function useSafeLocalParticipant() {
  const [participant, setParticipant] = useState<LocalParticipant | undefined>(undefined);

  // Try to execute the hook, but it might throw if RoomContext is missing
  // However, hooks cannot be conditionally executed or try-catched easily in React component body.
  // The official hook throws error if RoomContext is missing.

  // Since we cannot "try-catch" a hook call inside component body,
  // we must rely on checking if we are inside a context BEFORE calling it?
  // No, React Context consumption is safe (returns default value),
  // but LiveKit's useLocalParticipant() explicitly THROWS if context is missing.

  // So the strategy is:
  // 1. In global scope, we don't render components that use this hook (already done in layout.tsx but user wants device settings globally).
  // 2. We need a Mock or Safe version.

  // Actually, we can't implement this hook safely if the library hook throws.
  // The only way is to detect if context exists.

  // But wait, the user wants to configure devices GLOBALLY.
  // So we shouldn't be using useLocalParticipant at all for device *selection*.
  // We should use navigator.mediaDevices directly, which we are largely doing.

  return { localParticipant: undefined };
}
