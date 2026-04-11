'use client';

import { useEffect, useState } from 'react';
import { Loader2, TerminalSquare, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { CSDomain, fetchCSDomains, changeCSDomain } from '../api/csApi';
import { Button } from '@/components/ui/button';

interface DomainSelectionProps {
  onSuccess: () => void;
}

export default function DomainSelection({ onSuccess }: DomainSelectionProps) {
  const [domains, setDomains] = useState<CSDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDomains = async () => {
      try {
        console.log('[DEBUG] Fetching CS Domains...');
        const data = await fetchCSDomains();
        setDomains(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('도메인 목록을 불러오지 못했습니다.');
        console.error(error);
        setDomains([]);
      } finally {
        setLoading(false);
      }
    };

    loadDomains();
  }, []);

  const handleSubmit = async () => {
    if (!selectedId) return;

    setSubmitting(true);
    try {
      console.log(`[DEBUG] Submitting domain ID ${selectedId}`);
      await changeCSDomain(selectedId);
      toast.success('학습 도메인이 설정되었습니다!');
      onSuccess();
    } catch (error) {
      toast.error('도메인 선택 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">학습 도메인을 준비하고 있습니다...</p>
      </div>
    );
  }

  const safeDomains = Array.isArray(domains) ? domains : [];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 w-full animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-3xl w-full space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-2">
            <TerminalSquare className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            무엇을 먼저 학습할까요?
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground max-w-xl mx-auto">
            원하는 도메인을 선택하여 맞춤형 CS 학습 여정을 시작하세요. 선택한 도메인은 언제든 변경할 수 있습니다.
          </p>
        </div>

        {/* Domain Grid Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
          {safeDomains.map((domain) => {
            const isSelected = selectedId === domain.id;
            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => setSelectedId(domain.id)}
                className={`
                  relative flex flex-col items-start p-5 rounded-2xl text-left transition-all duration-300 ease-out overflow-hidden group
                  ${isSelected
                    ? 'ring-2 ring-primary bg-primary/5 shadow-md scale-[1.02]' 
                    : 'bg-card border border-border/50 hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm'
                  }
                `}
              >
                {/* Background decorative gradient */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent opacity-0 rounded-bl-full transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                
                <div className="flex w-full justify-between items-start mb-4 relative z-10">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-primary transition-colors'}`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary/40 transition-colors" />
                  )}
                </div>

                <h3 className={`font-semibold text-[15px] leading-tight relative z-10 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {domain.name}
                </h3>
              </button>
            );
          })}
        </div>

        {/* Action Bottom */}
        <div className="flex justify-center pt-8">
          <Button
            size="lg"
            disabled={!selectedId || submitting}
            onClick={handleSubmit}
            className={`
              h-14 px-8 text-base font-bold rounded-full gap-2 transition-all duration-300
              ${selectedId ? 'shadow-lg shadow-primary/25 hover:shadow-primary/40' : ''}
              min-w-[200px]
            `}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                적용 중...
              </>
            ) : (
              <>
                학습 시작하기
                <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${selectedId ? 'translate-x-1' : ''}`} />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
