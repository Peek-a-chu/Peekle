'use client';

import React, { useEffect, useState } from 'react';
import { fetchAdminStageClaims } from '@/domains/cs/api/csAdminApi';

export default function CsClaimHistory({ stageId }: { stageId: number }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadClaims() {
      setLoading(true);
      try {
        await fetchAdminStageClaims(stageId);
        // Will set claims later when implemented
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, [stageId]);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <p className="mb-2">문제 신고 내역 (클레임) 기능은 준비 중입니다.</p>
      <p className="text-sm">현재 안내용 탭이며, 다음 마일스톤에서 활성화됩니다.</p>
    </div>
  );
}
