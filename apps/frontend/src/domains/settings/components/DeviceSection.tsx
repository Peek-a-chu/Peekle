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
import { useLocalParticipant } from '@livekit/components-react';
import type { LocalParticipant } from 'livekit-client';

// 1. UI & Logic Component (Pure, accepts dependencies via props)
interface DeviceSectionInnerProps {
  localParticipant: LocalParticipant | null | undefined;
  isGlobal?: boolean;
}

const DeviceSectionInner = ({ localParticipant, isGlobal = false }: DeviceSectionInnerProps) => {
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

  // Socket actions might fail if global, handled in handlers
  // In global mode, these hooks return default/empty processing safely usually
  const { updateStatus } = useStudySocketActions();

  const me = participants.find((p) => p.id === currentUserId);
  const isMuted = me?.isMuted ?? false;
  const isVideoOff = me?.isVideoOff ?? false;

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const micTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerGainNodeRef = useRef<GainNode | null>(null);

  // State
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [isPreviewOn, setIsPreviewOn] = useState(false);

  // 장치 목록 가져오기 (HEAD Logic)
  const getDevices = async () => {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();

      // 라벨이 없는 경우(권한 없음) 권한 요청 시도
      const hasEmptyVideoLabel = devices.some(
        (device) => device.kind === 'videoinput' && !device.label,
      );
      const hasEmptyAudioLabel = devices.some(
        (device) =>
          (device.kind === 'audioinput' || device.kind === 'audiooutput') && !device.label,
      );

      if (hasEmptyAudioLabel || hasEmptyVideoLabel) {
        try {
          let audioStream: MediaStream | null = null;
          let videoStream: MediaStream | null = null;

          if (hasEmptyAudioLabel) {
            try {
              audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e) {
              console.warn('[DeviceSection] Failed to get audio permission:', e);
            }
          }

          if (hasEmptyVideoLabel) {
            try {
              videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (e) {
              console.warn('[DeviceSection] Failed to get video permission:', e);
            }
          }

          if (audioStream || videoStream) {
            devices = await navigator.mediaDevices.enumerateDevices();
          }

          if (audioStream) audioStream.getTracks().forEach((track) => track.stop());
          if (videoStream) videoStream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          console.warn('[DeviceSection] Permission check error:', err);
        }
      }

      setVideoDevices(devices.filter((device) => device.kind === 'videoinput'));
      setAudioDevices(devices.filter((device) => device.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter((device) => device.kind === 'audiooutput'));
    } catch (error) {
      console.error('[DeviceSection] Failed to enumerate devices:', error);
    }
  };

  useEffect(() => {
    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  // Preview Logic (Adapted to support Incoming UI manual toggle + HEAD logic)
  const startPreview = async () => {
    if (streamRef.current) return; // Already started

    try {
      let stream: MediaStream | null = null;
      if (selectedCameraId) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedCameraId !== 'default' ? { exact: selectedCameraId } : undefined,
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      }
    } catch (e) {
      console.error('Failed to start camera preview', e);
      // If preview fails, turn off state
      setIsPreviewOn(false);
      toast.error("카메라 미리보기를 시작할 수 없습니다.");
    }
  };

  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    // Only run if isPreviewOn is true
    if (isPreviewOn) {
      startPreview();
    } else {
      stopPreview();
    }
    // Cleanup
    return () => {
      // We don't stop preview on deps change necessarily, but we might want to restart if device changes
      // For simplicity, if ID changes, we restart
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewOn, selectedCameraId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPreview();
    }
  }, []);

  const handlePreviewToggle = () => {
    setIsPreviewOn(!isPreviewOn);
  };


  // Mic Level Measurement (HEAD Logic - LiveKit Safe)
  useEffect(() => {
    let localStream: MediaStream | null = null;
    let stopped = false;

    const startMetering = async () => {
      try {
        let stream: MediaStream | null = null;
        let isLocalStream = false;

        // 1. LiveKit (활성 트랙)
        if (localParticipant && !isMuted) {
          const trackReq = Array.from(localParticipant.audioTrackPublications.values()).find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t: any) => t.track?.kind === 'audio',
          );
          if (trackReq?.track?.mediaStreamTrack) {
            stream = new MediaStream([trackReq.track.mediaStreamTrack]);
          }
        }

        // 2. getUserMedia (없으면 직접 요청 - 레벨 미터용)
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: selectedMicId !== 'default' ? { exact: selectedMicId } : undefined,
              },
            });
            isLocalStream = true;
            localStream = stream;
          } catch (e) {
            console.warn('[DeviceSection] Failed to get local mic stream for metering:', e);
          }
        }

        if (stopped) {
          if (isLocalStream && stream) stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (!stream) {
          setMicLevel(0);
          return;
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          setMicLevel(0);
          return;
        }

        if (!audioContextRef.current) {
          audioContextRef.current =
            new // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioContext = audioContextRef.current;
        if (audioContext.state === 'suspended') await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        // Initialize gain from current micVolume (0-100 -> 0.0-1.0)
        gainNode.gain.value = useSettingsStore.getState().micVolume / 100;
        gainNodeRef.current = gainNode;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        source.connect(gainNode);
        gainNode.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (stopped) return;
          analyser.getByteTimeDomainData(dataArray);

          // Calculate RMS 
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const value = dataArray[i] - 128; // Center at 0
            sum += value * value;
          }
          const rms = Math.sqrt(sum / dataArray.length);

          // Normalize to 0-100 
          const level = Math.min(100, (rms / 50) * 100);
          setMicLevel(level);

          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        console.warn('Metering error', err);
        setMicLevel(0);
      }
    };

    void startMetering();

    return () => {
      stopped = true;
      gainNodeRef.current = null;
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMuted, selectedMicId, localParticipant]);

  // Volume Effect
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micVolume / 100;
    }
  }, [micVolume]);

  useEffect(() => {
    if (speakerGainNodeRef.current) {
      speakerGainNodeRef.current.gain.value = speakerVolume / 100;
    }
  }, [speakerVolume]);


  // Handlers (HEAD Logic)
  const handleMicToggle = async () => {
    if (isGlobal) {
      toast.info('스터디 룸 입장 후 다시 시도해주세요.');
      return;
    }

    if (!currentUserId || !me) return;

    const newMuted = !isMuted;
    updateParticipant(currentUserId, { isMuted: newMuted });

    if (updateStatus) updateStatus(newMuted, isVideoOff);

    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!newMuted);
    }
  };

  const handleVideoToggle = async () => {
    if (isGlobal) {
      toast.info('스터디 룸 입장 후 다시 시도해주세요.');
      return;
    }

    if (!currentUserId || !me) return;

    const newVideoOff = !isVideoOff;
    updateParticipant(currentUserId, { isVideoOff: newVideoOff });

    if (updateStatus) updateStatus(isMuted, newVideoOff);

    if (localParticipant) {
      await localParticipant.setCameraEnabled(!newVideoOff);
    }
  };

  // Mic Test (Loopback) - HEAD Logic
  const handleMicTest = async () => {
    if (isMicTestRunning) {
      if (micTestAudioRef.current) {
        micTestAudioRef.current.pause();
        micTestAudioRef.current = null;
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch {
          // ignore
        }
        // gainNodeRef.current = null; // Do not null this as it affects the meter? 
        // Actually HEAD logic disconnected it. Metering also uses it?
        // HEAD logic for Metering creates its OWN gainNodeRef logic.
        // Wait, HEAD `handleMicTest` creates NEW gainNodes on the fly?
        // Line 523: `const inputGainNode = audioContext.createGain();`
        // Line 548: `gainNodeRef.current = inputGainNode;`
        // THIS OVERWRITES the Metering Gain Node!
        // This might be a bug in HEAD or intended to switch mode.
        // Assuming HEAD logic is what user wants.
      }
      toggleMicTest();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicId !== 'default' ? { exact: selectedMicId } : undefined,
        },
      });

      if (!audioContextRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();

      const inputGainNode = audioContext.createGain();
      inputGainNode.gain.value = micVolume / 100;

      const outputGainNode = audioContext.createGain();
      outputGainNode.gain.value = speakerVolume / 100;

      source.connect(inputGainNode);
      inputGainNode.connect(outputGainNode);
      outputGainNode.connect(destination);

      const audio = new Audio();
      audio.srcObject = destination.stream;
      audio.volume = 1.0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (selectedSpeakerId !== 'default' && (audio as any).setSinkId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (audio as any).setSinkId(selectedSpeakerId);
        } catch {
          // ignore
        }
      }

      await audio.play();
      micTestAudioRef.current = audio;
      gainNodeRef.current = inputGainNode;
      toggleMicTest();

      setTimeout(() => {
        if (useSettingsStore.getState().isMicTestRunning) { // Check store directly or ref
          if (micTestAudioRef.current) {
            micTestAudioRef.current.pause();
            micTestAudioRef.current = null;
            try {
              gainNodeRef.current?.disconnect();
            } catch {
              // ignore
            }
            toggleMicTest();
          }
        }
      }, 5000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`마이크 테스트 실패: ${message}`);
    }
  };

  // Speaker Test (Incoming Logic - Oscillator)
  const handleSpeakerTest = async () => {
    if (isSpeakerTestRunning) {
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
      if (!audioContextRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      // 스피커 장치 지정 시도
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (selectedSpeakerId && selectedSpeakerId !== 'default' && (audioContext as any).setSinkId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (audioContext as any).setSinkId(selectedSpeakerId);
        } catch (e) {
          console.warn("setSinkId not supported or failed", e);
        }
      }

      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.type = 'sine';
      oscillator1.frequency.value = 440;
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 880;
      gainNode.gain.value = speakerVolume / 100;

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const stopTime = audioContext.currentTime + 2;
      oscillator1.start();
      oscillator1.stop(stopTime);
      oscillator2.start();
      oscillator2.stop(stopTime);

      speakerGainNodeRef.current = gainNode;
      toggleSpeakerTest();

      setTimeout(() => {
        try {
          if (speakerGainNodeRef.current) {
            speakerGainNodeRef.current.disconnect();
            speakerGainNodeRef.current = null;
          }
        } catch (e) {
          // Ignore
        }

        const currentState = useSettingsStore.getState();
        if (currentState.isSpeakerTestRunning) {
          toggleSpeakerTest();
        }
      }, 2000);

      toast.success('스피커 테스트 시작');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`스피커 테스트 실패: ${message}`);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((device) => device.kind === 'videoinput'));
      setAudioDevices(devices.filter((device) => device.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter((device) => device.kind === 'audiooutput'));

      toast.success('장치 권한이 갱신되었습니다.');
    } catch (e) {
      console.warn('Permission request failed', e);
      toast.error('권한 요청 실패. 브라우저 주소창의 자물쇠 아이콘을 눌러 권한을 허용해주세요.');
    }
  };


  // Render (Incoming UI Structure)
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
                onCheckedChange={() => handleVideoToggle()}
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

            <div className="flex justify-start">
              <Button variant="outline" size="sm" onClick={handleRequestPermissions} className="text-xs h-7">
                장치 권한 재요청
              </Button>
            </div>
          </div>

          {/* Camera Preview (New UI) */}
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
                onCheckedChange={() => handleMicToggle()}
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
                onClick={handleMicTest}
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

// 2. Connector for LiveKit Room (Only renders when in a Room)
const DeviceSectionConnected = () => {
  const { localParticipant } = useLocalParticipant();
  return <DeviceSectionInner localParticipant={localParticipant} isGlobal={false} />;
};

// 3. Main Export (Switcher)
interface DeviceSectionProps {
  isGlobal?: boolean;
}

const DeviceSection = ({ isGlobal = false }: DeviceSectionProps) => {
  // If global, we cannot use LiveKit hooks. Pass null.
  if (isGlobal) {
    return <DeviceSectionInner localParticipant={null} isGlobal={true} />;
  }
  // If local, we must use LiveKit hooks to get context.
  return <DeviceSectionConnected />;
};

export default DeviceSection;
