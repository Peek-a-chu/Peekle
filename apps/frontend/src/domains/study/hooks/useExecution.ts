import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface ExecutionRequest {
    language: string;
    code: string;
    input: string;
}

export interface ExecutionResponse {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
}

export function useExecution() {
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);

    const executeCode = useCallback(async (request: ExecutionRequest) => {
        try {
            setIsExecuting(true);
            setExecutionResult(null);

            const response = await apiFetch<ExecutionResponse>('/api/executions/run', {
                method: 'POST',
                body: JSON.stringify(request),
            });
            if (response && response.data) {
                setExecutionResult(response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Execution failed:', error);
            toast.error('코드 실행에 실패했습니다.');
            setExecutionResult({
                stdout: '',
                stderr: '서버 에러가 발생했습니다.',
                exitCode: -1,
                executionTime: 0,
            });
        } finally {
            setIsExecuting(false);
        }
        return null;
    }, []);

    const clearResult = useCallback(() => {
        setExecutionResult(null);
    }, []);

    return {
        isExecuting,
        executionResult,
        executeCode,
        clearResult,
    };
}
