import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

export async function fetchServer<T>(path: string, options: RequestInit = {}): Promise<T | null> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as any),
        };

        if (accessToken) {
            headers['Cookie'] = `access_token=${accessToken}`;
        }

        const url = `${BACKEND_URL}${path}`;

        const res = await fetch(url, {
            ...options,
            headers,
            cache: options.cache || 'no-store', // Default to no-store for dynamic data
        });

        if (!res.ok) {
            console.warn(`[ServerFetch] Failed to fetch ${path}: ${res.status}`);
            return null;
        }

        const json = await res.json();
        if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
            return json.data as T;
        }
        return json as T;
    } catch (error) {
        console.error(`[ServerFetch] Error fetching ${path}:`, error);
        return null;
    }
}
