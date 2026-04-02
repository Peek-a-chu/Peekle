import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const E2E_STUDY_ID_MIN = 999900;
const e2eStudyRequestCounts = new Map<string, number>();

function isE2EStudyFixtureId(request: NextRequest, id: string): boolean {
  const parsedId = Number(id);
  return (
    request.nextUrl.searchParams.get('e2eStudySync') === '1' &&
    Number.isFinite(parsedId) &&
    parsedId >= E2E_STUDY_ID_MIN
  );
}

function buildE2EStudyFixture(id: string, requestCount: number) {
  const numericId = Number(id);
  const isHydratedSnapshot = requestCount > 1;

  return {
    id: numericId,
    title: 'E2E Study Room Sync',
    description: 'Fixture room for bootstrap and presence sync verification',
    role: 'MEMBER' as const,
    owner: { id: isHydratedSnapshot ? 2 : 1 },
    members: isHydratedSnapshot
      ? [
          {
            userId: 1,
            nickname: 'Me',
            profileImg: '',
            role: 'MEMBER' as const,
            isOnline: true,
          },
          {
            userId: 2,
            nickname: 'OtherUser',
            profileImg: '',
            role: 'OWNER' as const,
            isOnline: true,
          },
          {
            userId: 3,
            nickname: 'Charlie',
            profileImg: '',
            role: 'MEMBER' as const,
            isOnline: true,
          },
        ]
      : [
          {
            userId: 1,
            nickname: 'Me',
            profileImg: '',
            role: 'OWNER' as const,
            isOnline: true,
          },
          {
            userId: 2,
            nickname: 'OtherUser',
            profileImg: '',
            role: 'MEMBER' as const,
            isOnline: true,
          },
        ],
    lastStudyProblemId: 1001,
    lastStudyProblemDate: '2026-04-02',
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isE2EStudyFixtureId(request, id)) {
    const nextRequestCount = (e2eStudyRequestCounts.get(id) || 0) + 1;
    e2eStudyRequestCounts.set(id, nextRequestCount);
    return NextResponse.json(buildE2EStudyFixture(id, nextRequestCount), {
      status: 200,
      headers: {
        'x-e2e-study-request-count': String(nextRequestCount),
      },
    });
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/studies/${id}`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal Server Error' } },
      { status: 500 },
    );
  }
}
