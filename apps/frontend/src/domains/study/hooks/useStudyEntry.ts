import { useEffect, useRef } from 'react';
import { useSocketContext } from '@/domains/study/context/SocketContext';

export function useStudyEntry(studyId: number) {
    const { client, connected } = useSocketContext();
    const enteredRef = useRef(false);

    useEffect(() => {
        // Reset entered state when studyId changes (e.g. navigation)
        enteredRef.current = false;
    }, [studyId]);

    useEffect(() => {
        if (client && connected && studyId && !enteredRef.current) {
            console.log(`[useStudyEntry] Sending enter request for study ${studyId}`);

            client.publish({
                destination: '/pub/studies/enter',
                body: JSON.stringify({ studyId }),
            });

            enteredRef.current = true;
        }
    }, [client, connected, studyId]);
}
