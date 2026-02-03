'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, Volume2, Play, Square, ChevronDown, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';
import { toast } from 'sonner';
import type { Publisher } from 'openvidu-browser';

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

  const currentUserId = useRoomStore((state) => state.currentUserId);
  const participants = useRoomStore((state) => state.participants);
  const updateParticipant = useRoomStore((state) => state.updateParticipant);
  const { updateStatus } = useStudySocketActions();
  const me = participants.find((p) => p.id === currentUserId);
  const isMuted = me?.isMuted ?? false;
  const isVideoOff = me?.isVideoOff ?? false;

  // 카메라 미리보기 상태 및 ref
  const [isPreviewOn, setIsPreviewOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 장치 목록 상태
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasCheckedDevices, setHasCheckedDevices] = useState(false);

  // 장치 목록 가져오기
  const getDevices = async () => {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      const hasEmptyVideoLabel = devices.some((d) => d.kind === 'videoinput' && !d.label);
      const hasEmptyAudioLabel = devices.some((d) => (d.kind === 'audioinput' || d.kind === 'audiooutput') && !d.label);

      if (hasEmptyAudioLabel || hasEmptyVideoLabel) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          devices = await navigator.mediaDevices.enumerateDevices();
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn('[DeviceSection] Permission check error:', e);
        }
      }

      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
    } catch (error) {
      console.error('[DeviceSection] Failed to enumerate devices:', error);
    } finally {
      setHasCheckedDevices(true);
    }
  };

  useEffect(() => {
    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  // 실제 마이크 입력 레벨 (VU Meter)
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const speakerGainNodeRef = useRef<GainNode | null>(null);

  // Logic for Mic Level Measurement
  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    const start = async () => {
      const publisher = (window as any).__openviduPublisher as Publisher | undefined;
      if (!publisher?.stream?.getMediaStream() || isMuted) {
        setMicLevel(0);
        return;
      }
      const stream = publisher.stream.getMediaStream();
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream!);
      if (!gainNodeRef.current) gainNodeRef.current = ctx.createGain();
      const gainNode = gainNodeRef.current;
      gainNode.gain.value = micVolume / 100;

      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      const analyser = analyserRef.current;
      source.connect(gainNode);
      gainNode.connect(analyser);

      const update = () => {
        if (!analyser || !dataArrayRef.current) return;
        analyser.getByteFrequencyData(dataArrayRef.current as any); // Cast to any to fix TS error
        const avg = dataArrayRef.current.reduce((acc, val) => acc + val, 0) / dataArrayRef.current.length;
        setMicLevel(Math.min(100, (avg / 128) * 100)); // amplified sensitivity
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();

      cleanupFn = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch (e) { /* ignore */ }
      };
    };

    start();
    return () => cleanupFn?.();
  }, [isMuted, micVolume]);

  // Volumes
  useEffect(() => { if (gainNodeRef.current) gainNodeRef.current.gain.value = micVolume / 100; }, [micVolume]);
  useEffect(() => { if (speakerGainNodeRef.current) speakerGainNodeRef.current.gain.value = speakerVolume / 100; }, [speakerVolume]);


  // Handlers
  const handleMicToggle = (checked: boolean) => {
    if (!currentUserId || !me) return;
    const newMuted = !checked;
    updateParticipant(currentUserId, { isMuted: newMuted });
    updateStatus(newMuted, isVideoOff);
    (window as any).__openviduToggleAudio?.();
  };

  const handleVideoToggle = (checked: boolean) => {
    if (!currentUserId || !me) return;
    const newVideoOff = !checked;
    updateParticipant(currentUserId, { isVideoOff: newVideoOff });
    updateStatus(isMuted, newVideoOff);
    (window as any).__openviduToggleVideo?.();
  };

  const startPreview = async () => {
    try {
      let stream: MediaStream | null = null;
      const publisher = (window as any).__openviduPublisher;
      if (publisher?.stream && !isVideoOff) {
        const ovStream = publisher.stream.getMediaStream();
        if (ovStream?.getVideoTracks().some((t: MediaStreamTrack) => t.enabled && t.readyState === 'live')) {
          stream = ovStream;
        }
      }

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCameraId !== 'default' ? { deviceId: { exact: selectedCameraId } } : true
        });
      }

      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsPreviewOn(true);
    } catch (e) {
      console.error("Preview failed", e);
      toast.error("카메라 미리보기를 시작할 수 없습니다.");
    }
  };

  const stopPreview = () => {
    const publisher = (window as any).__openviduPublisher;
    const ovStream = publisher?.stream?.getMediaStream();
    if (streamRef.current && streamRef.current.id !== ovStream?.id) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
    setIsPreviewOn(false);
  };

  const handlePreviewToggle = () => {
    if (isPreviewOn) stopPreview();
    else startPreview();
  };

  // 스피커 테스트: 데모 소리 재생
  const handleSpeakerTest = async () => {
    if (isSpeakerTestRunning) {
      // 테스트 중지
      if (speakerGainNodeRef.current) {
        try {
          speakerGainNodeRef.current.disconnect();
        } catch (e) { /* ignore */ }
        speakerGainNodeRef.current = null;
      }
      toggleSpeakerTest();
      return;
    }

    try {
      // AudioContext 생성
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // 스피커 장치 지정 시도 (Chrome 등 일부 브라우저 지원)
      if (selectedSpeakerId && selectedSpeakerId !== 'default' && (audioContext as any).setSinkId) {
        try {
          await (audioContext as any).setSinkId(selectedSpeakerId);
        } catch (e) {
          console.warn("setSinkId not supported or failed", e);
        }
      }

      // 오실레이터로 테스트 톤 생성 (440Hz = A4 음, 880Hz = A5 음)
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.type = 'sine';
      oscillator1.frequency.value = 440; // A4 음

      oscillator2.type = 'sine';
      oscillator2.frequency.value = 880; // A5 음

      // 출력 볼륨 적용
      gainNode.gain.value = speakerVolume / 100;

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 2초 후 자동 중지
      const stopTime = audioContext.currentTime + 2;
      oscillator1.start();
      oscillator1.stop(stopTime);
      oscillator2.start();
      oscillator2.stop(stopTime);

      speakerGainNodeRef.current = gainNode;

      toggleSpeakerTest();

      // 2초 후 정리
      setTimeout(() => {
        try {
          if (speakerGainNodeRef.current) {
            speakerGainNodeRef.current.disconnect();
            speakerGainNodeRef.current = null;
          }
        } catch (e) {
          // Ignore disconnect errors
        }

        // 2초 뒤에 자동으로 UI 상태를 꺼주기 위해 store 직접 접근
        const currentState = useSettingsStore.getState();
        if (currentState.isSpeakerTestRunning) {
          currentState.toggleSpeakerTest();
        }
      }, 2000);

      toast.success('스피커 테스트가 시작되었습니다.');
    } catch (error: any) {
      console.error('[DeviceSection] Failed to start speaker test:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      toast.error(`스피커 테스트를 시작할 수 없습니다: ${errorMessage}`);
    }
  };

  const handleMicTestClick = () => { toggleMicTest(); };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-8">

      {/* ---------------- CAMERA SECTION ---------------- */}
      <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Camera Controls */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">카메라</h3>
                <div className={cn("px-2 py-0.5 rounded text-[11px] font-bold", isVideoOff ? "bg-muted text-muted-foreground" : "bg-green-500/10 text-green-600")}>
                  {isVideoOff ? '꺼짐' : 'ON'}
                </div>
              </div>
              <Switch
                checked={!isVideoOff}
                onCheckedChange={handleVideoToggle}
                className={cn("data-[state=checked]:bg-green-500")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1">장치 선택</label>
              <div className="relative">
                <select
                  value={selectedCameraId}
                  onChange={(e) => setCamera(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-4 pr-10 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-shadow"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-[11px] text-muted-foreground pl-1">
                연결된 카메라 장치를 선택하세요.
              </p>
            </div>
          </div>

          {/* Camera Preview */}
          <div className="bg-black/5 rounded-xl p-1 border border-border/50 h-fit">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-inner group">
              {isPreviewOn ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/20">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-sm">
                    <Camera size={24} className="text-muted-foreground/40" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground/60">미리보기 꺼짐</p>
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                <Button variant={isPreviewOn ? "secondary" : "default"} size="sm" onClick={handlePreviewToggle} className="rounded-full px-5 font-bold shadow-lg text-xs h-9">
                  {isPreviewOn ? '미리보기 끄기' : '미리보기 시작'}
                </Button>
              </div>

              {isPreviewOn && (
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-red-500/90 flex items-center gap-1.5 shadow-sm backdrop-blur-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">LIVE</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                <RefreshCw size={10} /> 상태 정상
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- MIC SECTION ---------------- */}
      <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Mic Controls */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">마이크</h3>
                <div className={cn("px-2 py-0.5 rounded text-[11px] font-bold", isMuted ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-600")}>
                  {isMuted ? '음소거' : 'ON'}
                </div>
              </div>
              <Switch
                checked={!isMuted}
                onCheckedChange={handleMicToggle}
                className={cn("data-[state=checked]:bg-blue-500")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1">장치 선택</label>
              <div className="relative">
                <select
                  value={selectedMicId}
                  onChange={(e) => setMic(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-4 pr-10 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-shadow"
                >
                  {audioDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${i + 1}`}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-semibold text-muted-foreground">입력 볼륨</span>
                <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-foreground">{micVolume}%</span>
              </div>
              <Slider value={[micVolume]} onValueChange={([v]) => setMicVolume(v)} max={100} className="py-1" />
            </div>
          </div>

          {/* Mic Visualizer */}
          <div className="bg-muted/10 rounded-xl p-5 border border-border/50 flex flex-col justify-center h-full min-h-[160px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-muted-foreground">입력 감도 확인</span>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", micLevel > 5 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                {micLevel > 5 ? '신호 감지됨' : '대기 중'}
              </span>
            </div>

            <div className="flex-1 flex items-end justify-between gap-1 px-1 h-32">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-full rounded-[1px] transition-all duration-75",
                    i < (micLevel / 4.2)
                      ? (i > 18 ? 'bg-red-500' : i > 12 ? 'bg-yellow-400' : 'bg-primary')
                      : 'bg-muted/40'
                  )}
                  style={{ height: `${15 + (i * 3.5)}%` }}
                />
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
              <Button
                onClick={handleMicTestClick}
                variant="outline"
                size="sm"
                className={cn("w-full text-xs font-bold h-9", isMicTestRunning && "border-destructive text-destructive bg-destructive/5 hover:bg-destructive/10")}
              >
                {isMicTestRunning ? (
                  <>
                    <Square size={12} className="mr-2 fill-current" /> 테스트 중지
                  </>
                ) : (
                  <>
                    <Mic size={12} className="mr-2" /> 마이크 테스트 시작
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SPEAKER SECTION ---------------- */}
      <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-6">스피커</h3>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1">장치 선택</label>
              <div className="relative">
                <select
                  value={selectedSpeakerId}
                  onChange={(e) => setSpeaker(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-4 pr-10 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-shadow"
                >
                  {audioOutputDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${i + 1}`}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-semibold text-muted-foreground">출력 볼륨</span>
                <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-foreground">{speakerVolume}%</span>
              </div>
              <Slider value={[speakerVolume]} onValueChange={([v]) => setSpeakerVolume(v)} max={100} className="py-1" />
            </div>
          </div>

          {/* Speaker Test Box */}
          <div className="bg-muted/10 rounded-xl p-5 border border-border/50 flex flex-col justify-center items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Volume2 size={32} className={cn("text-primary", isSpeakerTestRunning && "animate-pulse")} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              테스트 사운드를 재생하여<br />스피커 출력을 확인합니다.
            </p>
            <Button
              onClick={handleSpeakerTest}
              className={cn("w-full max-w-[200px] text-xs font-bold h-9 mt-2", isSpeakerTestRunning && "bg-primary/90")}
            >
              {isSpeakerTestRunning ? (
                <>
                  <Square size={12} className="mr-2 fill-current" /> 재생 중지
                </>
              ) : (
                <>
                  <Play size={12} className="mr-2 fill-current" /> 테스트 사운드 재생
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DeviceSection;
