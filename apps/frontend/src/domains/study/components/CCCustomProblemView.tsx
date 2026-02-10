'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Save, Edit2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { fetchProblemDescription, saveProblemDescription } from '@/domains/study/api/studyApi';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CCCustomProblemViewProps {
    studyId: number;
    problemId: number;
    problemTitle: string;
    onBack: () => void;
    externalLink?: string;
    className?: string;
}

export function CCCustomProblemView({
    studyId,
    problemId,
    problemTitle,
    onBack,
    externalLink,
    className,
}: CCCustomProblemViewProps) {
    const [description, setDescription] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadDescription();
    }, [studyId, problemId]);

    const loadDescription = async () => {
        setIsLoading(true);
        try {
            const data = await fetchProblemDescription(studyId, problemId);
            setDescription(data || '');
        } catch (error) {
            console.error('Failed to load description:', error);
            toast.error('문제 설명을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!description.trim()) {
            toast.error('내용을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            await saveProblemDescription(studyId, problemId, description);
            toast.success('저장되었습니다.');
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save description:', error);
            toast.error('저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={cn('flex flex-col h-full bg-card', className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-14 shrink-0 border-b border-border">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={onBack}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium truncate text-sm" title={problemTitle}>
                        {problemTitle}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {externalLink && (
                        <a
                            href={externalLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground transition-colors mr-1"
                            title="원본 문제 보기"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs mr-1"
                        onClick={async () => {
                            if (description) {
                                try {
                                    await navigator.clipboard.writeText(description);
                                    toast.success('문제 설명이 복사되었습니다.');
                                } catch (err) {
                                    toast.error('복사에 실패했습니다.');
                                }
                            } else {
                                toast.error('복사할 내용이 없습니다.');
                            }
                        }}
                        title="설명 복사"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                        >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                    </Button>
                    {isEditing ? (
                        <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Save className="mr-1 h-3 w-3" />
                            {isSaving ? '저장 중...' : '저장'}
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit2 className="mr-1 h-3 w-3" />
                            편집
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        불러오는 중...
                    </div>
                ) : isEditing ? (
                    <div className="h-full p-4">
                        <Textarea
                            className="w-full h-full resize-none font-mono text-sm leading-relaxed p-4 bg-muted/30 focus-visible:ring-1"
                            placeholder="여기에 문제 설명을 붙여넣으세요..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            {description ? (
                                <div className="text-sm leading-relaxed text-foreground">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                                            h2: ({ ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                                            h3: ({ ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                                            p: ({ ...props }) => <p className="mb-4 leading-7" {...props} />,
                                            ul: ({ ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                                            ol: ({ ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                                            li: ({ ...props }) => <li className="pl-1" {...props} />,
                                            blockquote: ({ ...props }) => (
                                                <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4 text-muted-foreground" {...props} />
                                            ),
                                            code: ({ children, className, ...props }: any) => {
                                                const match = /language-(\w+)/.exec(className || '');
                                                return !String(children).includes('\n') ? (
                                                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props} />
                                                ) : (
                                                    <div className="relative my-4 rounded-md overflow-hidden bg-muted/50 border">
                                                        <div className="p-4 overflow-x-auto">
                                                            <code className={`text-sm font-mono ${className || ''}`} {...props}>
                                                                {children}
                                                            </code>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                            table: ({ ...props }) => (
                                                <div className="my-4 overflow-x-auto rounded-lg border">
                                                    <table className="w-full text-sm text-left" {...props} />
                                                </div>
                                            ),
                                            thead: ({ ...props }) => <thead className="bg-muted text-muted-foreground uppercase" {...props} />,
                                            th: ({ ...props }) => <th className="px-4 py-3 font-medium border-b" {...props} />,
                                            td: ({ ...props }) => <td className="px-4 py-3 border-b last:border-0" {...props} />,
                                            a: ({ ...props }) => <a className="text-primary hover:underline underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
                                            img: ({ ...props }) => <img className="rounded-lg my-4 max-w-full h-auto border" {...props} />,
                                            hr: ({ ...props }) => <hr className="my-6 border-border" {...props} />,
                                        }}
                                    >
                                        {description}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <p className="mb-2">저장된 설명이 없습니다.</p>
                                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                        설명 추가하기
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
