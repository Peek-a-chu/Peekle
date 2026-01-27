'use client';

import { useState, useEffect } from 'react';
import { Camera, Mic, Volume2, Play, Circle } from 'lucide-react';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const DeviceSection = () => {
    const {
        selectedCameraId,
        selectedMicId,
        selectedSpeakerId,
        micVolume,
        speakerVolume,
        setCamera,
        setMic,
        setSpeaker,
        setMicVolume,
        setSpeakerVolume,
        isMicTestRunning,
        isSpeakerTestRunning,
        toggleMicTest,
        toggleSpeakerTest,
    } = useSettingsStore();

    // 마이크 입력을 위한 가상 전압 레벨
    const [micLevel, setMicLevel] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isMicTestRunning) {
            interval = setInterval(() => {
                setMicLevel(Math.random() * 80 + 20); // Random level between 20-100
            }, 100);
        } else {
            setMicLevel(0);
        }
        return () => clearInterval(interval);
    }, [isMicTestRunning]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 카메라 섹션 */}
            <section className="space-y-3">
                <label className="text-sm font-bold text-muted-foreground">카메라</label>
                <div className="relative">
                    <select
                        value={selectedCameraId}
                        onChange={(e) => setCamera(e.target.value)}
                        className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
                    >
                        <option value="default" className="bg-card">내장 카메라</option>
                        <option value="ext-1" className="bg-card">외부 웹캠 1</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <Camera size={14} />
                    </div>
                </div>

                {/* 카메라 미리보기 영역 */}
                <div className="aspect-video w-full bg-muted/50 rounded-xl border border-border flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                        <Camera size={32} />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">카메라 미리보기</span>

                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full">
                        <Circle size={8} className="fill-red-500 text-red-500 animate-pulse" />
                        <span className="text-[10px] text-white font-bold opacity-80 uppercase tracking-wider">Preview Active</span>
                    </div>
                </div>
            </section>

            {/* 마이크 섹션 */}
            <section className="space-y-4 pt-2 border-t border-border">
                <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground">마이크</label>
                    <div className="relative">
                        <select
                            value={selectedMicId}
                            onChange={(e) => setMic(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
                        >
                            <option value="default" className="bg-card">내장 마이크</option>
                            <option value="ext-mic" className="bg-card">외부 마이크 (USB)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <Mic size={14} />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground">입력 볼륨</span>
                        <span className="text-xs font-black text-foreground">{micVolume}%</span>
                    </div>
                    <Slider
                        value={[micVolume]}
                        onValueChange={([val]) => setMicVolume(val)}
                        max={100}
                        step={1}
                        className="py-1"
                    />
                    {/* 마이크 레벨 미터 */}
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-75"
                            style={{ width: `${micLevel}%` }}
                        />
                    </div>
                </div>

                <button
                    onClick={toggleMicTest}
                    className={cn(
                        'px-4 py-2 rounded-lg text-xs font-bold border transition-all',
                        isMicTestRunning
                            ? 'bg-primary/10 text-primary border-primary/50 animate-pulse'
                            : 'bg-card text-foreground border-border hover:bg-muted',
                    )}
                >
                    {isMicTestRunning ? '테스트 중지' : '테스트'}
                </button>
            </section>

            {/* 스피커 섹션 */}
            <section className="space-y-4 pt-2 border-t border-border">
                <div className="space-y-3">
                    <label className="text-sm font-bold text-muted-foreground">스피커</label>
                    <div className="relative">
                        <select
                            value={selectedSpeakerId}
                            onChange={(e) => setSpeaker(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
                        >
                            <option value="default" className="bg-card">내장 스피커</option>
                            <option value="headphone" className="bg-card">헤드폰</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <Volume2 size={14} />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground">출력 볼륨</span>
                        <span className="text-xs font-black text-foreground">{speakerVolume}%</span>
                    </div>
                    <Slider
                        value={[speakerVolume]}
                        onValueChange={([val]) => setSpeakerVolume(val)}
                        max={100}
                        step={1}
                        className="py-1"
                    />
                </div>

                <button
                    onClick={toggleSpeakerTest}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all',
                        isSpeakerTestRunning
                            ? 'bg-primary/15 border-primary/50 text-primary'
                            : 'bg-card text-foreground border-border hover:bg-muted',
                    )}
                >
                    <Volume2 size={14} className={isSpeakerTestRunning ? 'animate-bounce' : ''} />
                    <span>{isSpeakerTestRunning ? '재생 중...' : '테스트'}</span>
                </button>
            </section>
        </div >
    );
};

export default DeviceSection;
