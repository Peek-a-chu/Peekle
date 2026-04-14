'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CsDomainManager from '@/domains/admin/components/CsDomainManager';
import CsStageEditor from '@/domains/admin/components/CsStageEditor';
import CsClaimHistory from '@/domains/admin/components/CsClaimHistory';
import { CSAdminTrack } from '@/domains/cs/api/csAdminApi';

export default function CsContentAdminPage() {
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<CSAdminTrack | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const selectedStage = selectedTrack?.stages.find((stage) => stage.stageId === selectedStageId) ?? null;

  return (
    <div className="container mx-auto py-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">CS 학습 콘텐츠 관리</h1>
        <p className="text-muted-foreground">도메인, 트랙, 스테이지, 문제를 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 flex flex-col gap-3">
          <CsDomainManager
            selectedDomainId={selectedDomainId}
            onSelectDomain={setSelectedDomainId}
            selectedTrack={selectedTrack}
            onSelectTrack={setSelectedTrack}
            selectedStageId={selectedStageId}
            onSelectStage={setSelectedStageId}
          />
        </div>

        <div className="md:col-span-3">
          {selectedStageId ? (
            <Card className="h-full">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-xl">스테이지 편집</CardTitle>
                <CardDescription>
                  {selectedTrack?.domainName} / {selectedTrack?.domainId}-{selectedTrack?.trackNo}) {selectedTrack?.name}
                  {selectedStage ? ` · 스테이지 ${selectedStage.stageNo} 문제 편집` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <Tabs defaultValue="editor">
                  <TabsList className="mb-3">
                    <TabsTrigger value="editor">문제 편집</TabsTrigger>
                    <TabsTrigger value="claims">신고 내역</TabsTrigger>
                  </TabsList>
                  <TabsContent value="editor">
                    <CsStageEditor stageId={selectedStageId} />
                  </TabsContent>
                  <TabsContent value="claims">
                    <CsClaimHistory stageId={selectedStageId} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-[280px] flex items-center justify-center text-muted-foreground">
              <CardContent className="flex flex-col items-center justify-center p-4">
                <p>좌측에서 도메인, 트랙, 스테이지를 선택하면 콘텐츠를 관리할 수 있습니다.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
