'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, Volume2, Circle } from 'lucide-react';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';
import { toast } from 'sonner';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalParticipant } from 'livekit-client';

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
  const { localParticipant } = useLocalParticipant();
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
  useEffect(() => {
    let mounted = true;

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

            // 오디오 권한 요청 (스피커 라벨 포함)
            if (hasEmptyAudioLabel) {
              try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              } catch (e) {
                console.warn('[DeviceSection] Failed to get audio permission:', e);
              }
            }

            // 비디오 권한 요청
            if (hasEmptyVideoLabel) {
              try {
                videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
              } catch (e) {
                console.warn('[DeviceSection] Failed to get video permission:', e);
              }
            }

            // 스트림이 활성화된 상태에서 다시 목록 조회 (활성 스트림이 있으면 권한이 확실함)
            if (audioStream || videoStream) {
              devices = await navigator.mediaDevices.enumerateDevices();
            }

            // 조회 후 스트림 정리
            if (audioStream) {
              audioStream.getTracks().forEach((track) => track.stop());
            }
            if (videoStream) {
              videoStream.getTracks().forEach((track) => track.stop());
            }
          } catch (err) {
            console.warn('[DeviceSection] Permission check error:', err);
          }
        }

        if (!mounted) return;

        const videoInputs = devices.filter((device) => device.kind === 'videoinput');
        const audioInputs = devices.filter((device) => device.kind === 'audioinput');
        const audioOutputs = devices.filter((device) => device.kind === 'audiooutput');

        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);
        setAudioOutputDevices(audioOutputs);
      } catch (error) {
        console.error('[DeviceSection] Failed to enumerate devices:', error);
      } finally {
        if (mounted) {
          setHasCheckedDevices(true);
        }
      }
    };

    getDevices();

    // 장치 변경 감지
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      mounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  // 실제 마이크 입력 레벨
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 오디오 제어용 refs
  const gainNodeRef = useRef<GainNode | null>(null);
  const micTestDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerGainNodeRef = useRef<GainNode | null>(null);

  // 마이크 레벨 측정 (LiveKit 또는 로컬 스트림 사용)
  useEffect(() => {
    let localStream: MediaStream | null = null;
    let stopped = false;

    const startMetering = async () => {
      try {
        let stream: MediaStream | null = null;
        let isLocal = false;

        // 1. LiveKit (활성 트랙)
        if (localParticipant && !isMuted) {
           // LiveKit LocalParticipant uses camelCase for tracks in some versions, or trackPublications
           // But 'audioTracks' is correct for LocalParticipant in livekit-client
           // Let's use getAudioTracks() if possible or access via property safely
           // Actually, LocalParticipant extends Participant which has audioTracks: Map<string, TrackPublication>
           // Checking updated LiveKit types...
           const trackReq = Array.from(localParticipant.audioTrackPublications.values()).find(t => t.track?.kind === 'audio');
           if (trackReq?.track?.mediaStreamTrack) {
               stream = new MediaStream([trackReq.track.mediaStreamTrack]);
           }
        }

        // 2. getUserMedia (없으면 직접 요청 - 레벨 미터용)
        if (!stream) {
           try {
             stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: selectedMicId !== 'default' ? { exact: selectedMicId } : undefined }
             });
             isLocal = true;
             localStream = stream; // cleanup을 위해 저장
           } catch (e) {
             console.warn('[DeviceSection] Failed to get local mic stream for metering:', e);
           }
        }

        if (stopped) {
            // 이미 언마운트됨
            if (isLocal && stream) stream.getTracks().forEach(t => t.stop());
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

        // AudioContext 생성
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const source = audioContext.createMediaStreamSource(stream);

        // GainNode 생성 (입력 볼륨 제어)
        if (!gainNodeRef.current) {
          gainNodeRef.current = audioContext.createGain();
        }

        const gainNode = gainNodeRef.current;
        gainNode.gain.value = micVolume / 100;

        if (!analyserRef.current) {
          analyserRef.current = audioContext.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          dataArrayRef.current = new Uint8Array(
            new ArrayBuffer(analyserRef.current.frequencyBinCount),
          );
        }

        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;

        source.connect(gainNode);
        gainNode.connect(analyser);

        const updateLevel = () => {
          if (!analyser || !dataArray) return;
          analyser.getByteFrequencyData(dataArray as any);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalizedLevel = Math.min(100, (average / 255) * 100);
          setMicLevel(normalizedLevel);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();

        // Cleanup function for this execution
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            try {
                source.disconnect();
                gainNode.disconnect();
            } catch(e) {}
        };
      } catch (error) {
        console.error('[DeviceSection] Failed to setup audio metering:', error);
        setMicLevel(0);
      }
    };

    const cleanupPromise = startMetering();

    return () => {
      stopped = true;
      if (localStream) {
          localStream.getTracks().forEach(t => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // AudioContext는 전역 ref로 유지되므로 닫지 않음 (다른 테스트에서 재사용)
    };
  }, [isMuted, micVolume, selectedMicId, localParticipant]);

  // 입력 볼륨 변경 시 GainNode에 적용
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micVolume / 100;
    }
  }, [micVolume]);

  // 출력 볼륨 변경 시 스피커 볼륨 적용
  useEffect(() => {
    if (speakerGainNodeRef.current) {
      speakerGainNodeRef.current.gain.value = speakerVolume / 100;
    }
  }, [speakerVolume]);

  // 마이크/카메라 토글 핸들러
  const handleMicToggle = async () => {
    if (!currentUserId || !me) return;

    // Optimistic Update
    const newMuted = !isMuted;
    updateParticipant(currentUserId, { isMuted: newMuted });

    // Toggle Mute (Socket)
    updateStatus(newMuted, isVideoOff);

    // LiveKit 오디오 토글
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!newMuted);
    }
  };

  const handleVideoToggle = async () => {
    if (!currentUserId || !me) return;

    // Optimistic Update
    const newVideoOff = !isVideoOff;
    updateParticipant(currentUserId, { isVideoOff: newVideoOff });

    // Toggle Video (Socket)
    updateStatus(isMuted, newVideoOff);

    // LiveKit 비디오 토글
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!newVideoOff);
    }
  };

  // 카메라 미리보기 핸들러
  const handleCameraPreview = async () => {
    if (isPreviewOn) {
      if (streamRef.current) {
        // LiveKit 스트림이 아닌 경우에만 트랙 중지 (로컬 생성 스트림인 경우)
        // track id 비교 등으로 확인 가능하나, 간단히 stop() 호출. 
        // 주의: LiveKit 트랙을 여기서 stop하면 송출도 멈출 수 있음.
        // 따라서 localParticipant track이 아닌 경우에만 stop해야 함.
        
        let isLiveKitTrack = false;
        if (localParticipant) {
             const trackReq = Array.from(localParticipant.videoTrackPublications.values()).find(t => t.track?.kind === 'video');
             if (trackReq?.track?.mediaStreamTrack?.id === streamRef.current.getVideoTracks()[0]?.id) {
                 isLiveKitTrack = true;
             }
        }
        
        if (!isLiveKitTrack) {
             streamRef.current.getTracks().forEach((track) => track.stop());
        }
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsPreviewOn(false);
      return;
    }

    try {
      let stream: MediaStream | null = null;

      // 1. LiveKit 스트림 재사용 시도 (카메라가 켜져있을 때만)
      if (localParticipant && !isVideoOff) {
        // Array.from() to iterate map values
        const trackReq = Array.from(localParticipant.videoTrackPublications.values()).find(t => t.track?.kind === 'video');
        if (trackReq && trackReq.track && trackReq.track.mediaStreamTrack) {
           stream = new MediaStream([trackReq.track.mediaStreamTrack]);
           console.log('[DeviceSection] Reusing LiveKit stream for preview');
        }
      }

      // 2. LiveKit 스트림이 없거나 사용할 수 없으면 새로 요청
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedCameraId !== 'default' ? { exact: selectedCameraId } : undefined,
          },
        });
        console.log('[DeviceSection] Created new stream for preview');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsPreviewOn(true);
      toast.success('카메라 미리보기가 시작되었습니다.');
    } catch (error: any) {
      console.error('[DeviceSection] Failed to start camera preview:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
      } else if (error.name === 'NotFoundError') {
        toast.error('카메라를 찾을 수 없습니다.');
      } else {
        toast.error('카메라 미리보기를 시작할 수 없습니다.');
      }
    }
  };

  // 마이크 테스트: 마이크 입력을 스피커로 출력
  const handleMicTest = async () => {
    if (isMicTestRunning) {
      // 테스트 중지
      if (micTestAudioRef.current) {
        micTestAudioRef.current.pause();
        micTestAudioRef.current.srcObject = null;
        micTestAudioRef.current = null;
      }
      if (micTestDestinationRef.current) {
        try {
          micTestDestinationRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        micTestDestinationRef.current = null;
      }
      toggleMicTest();
      return;
    }

    try {
      let stream: MediaStream | null = null;

      // 1. LiveKit 스트림 확인 (Muted가 아닌 경우)
      if (localParticipant && !isMuted) {
         const trackReq = Array.from(localParticipant.audioTrackPublications.values()).find(t => t.track?.kind === 'audio');
         if (trackReq?.track?.mediaStreamTrack) {
             stream = new MediaStream([trackReq.track.mediaStreamTrack]);
         }
      }

      // 2. getUserMedia 확인 (LiveKit 스트림이 없거나 Muted 상태일 때 하드웨어 직접 테스트)
      if (!stream) {
         stream = await navigator.mediaDevices.getUserMedia({
             audio: {
                 deviceId: selectedMicId !== 'default' ? { exact: selectedMicId } : undefined
             }
         });
      }

      if (!stream) {
        toast.error('오디오 스트림을 찾을 수 없습니다.');
        return;
      }

      const audioTracks = stream.getAudioTracks();

      if (audioTracks.length === 0) {
        toast.error('마이크 트랙을 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
        return;
      }

      // AudioContext 생성 및 resume
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // AudioContext가 suspended 상태면 resume
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // 마이크 입력을 스피커로 연결
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();

      // GainNode로 볼륨 제어 (입력 볼륨 적용)
      const inputGainNode = audioContext.createGain();
      inputGainNode.gain.value = micVolume / 100;

      // 출력 볼륨도 적용
      const outputGainNode = audioContext.createGain();
      outputGainNode.gain.value = speakerVolume / 100;

      source.connect(inputGainNode);
      inputGainNode.connect(outputGainNode);
      outputGainNode.connect(destination);

      // MediaStream을 Audio 요소로 재생
      const audio = new Audio();
      audio.srcObject = destination.stream;
      audio.volume = 1.0; // 이미 gainNode에서 제어하므로 1.0으로 설정

      // 재생 시도
      try {
        await audio.play();
      } catch (playError: any) {
        // 재생 실패 시 더 구체적인 에러 메시지
        console.error('[DeviceSection] Audio play failed:', playError);
        if (playError.name === 'NotAllowedError') {
          toast.error('오디오 재생이 차단되었습니다. 브라우저 설정에서 자동 재생을 허용해주세요.');
        } else if (playError.name === 'NotSupportedError') {
          toast.error('오디오 형식을 지원하지 않습니다.');
        } else {
          toast.error('마이크 테스트를 시작할 수 없습니다. 오디오 재생 오류가 발생했습니다.');
        }
        // 정리
        source.disconnect();
        inputGainNode.disconnect();
        outputGainNode.disconnect();
        destination.disconnect();
        return;
      }

      micTestDestinationRef.current = destination;
      micTestAudioRef.current = audio;
      toggleMicTest();
      toast.success('마이크 테스트가 시작되었습니다.');
    } catch (error: any) {
      console.error('[DeviceSection] Failed to start mic test:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      if (errorMessage.includes('permission') || errorMessage.includes('권한')) {
        toast.error('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      } else if (errorMessage.includes('not found') || errorMessage.includes('찾을 수 없')) {
        toast.error('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
      } else {
        toast.error(`마이크 테스트를 시작할 수 없습니다: ${errorMessage}`);
      }
    }
  };

  // 스피커 테스트: 데모 소리 재생
  const handleSpeakerTest = async () => {
    if (isSpeakerTestRunning) {
      // 테스트 중지
      if (speakerTestAudioRef.current) {
        speakerTestAudioRef.current.pause();
        speakerTestAudioRef.current = null;
      }
      if (speakerGainNodeRef.current) {
        try {
          speakerGainNodeRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
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
        if (isSpeakerTestRunning) {
          toggleSpeakerTest();
        }
      }, 2000);

      toast.success('스피커 테스트가 시작되었습니다.');
    } catch (error: any) {
      console.error('[DeviceSection] Failed to start speaker test:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      toast.error(`스피커 테스트를 시작할 수 없습니다: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 카메라 섹션 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-muted-foreground">카메라</label>
          <Button
            variant={isVideoOff ? 'destructive' : 'default'}
            size="sm"
            onClick={handleVideoToggle}
            className="h-8 px-3 text-xs"
          >
            {isVideoOff ? (
              <>
                <VideoOff className="h-3.5 w-3.5 mr-1.5" />
                카메라 켜기
              </>
            ) : (
              <>
                <Video className="h-3.5 w-3.5 mr-1.5" />
                카메라 끄기
              </>
            )}
          </Button>
        </div>
        <div className="relative">
          <select
            value={selectedCameraId}
            onChange={(e) => setCamera(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
          >
            {videoDevices.length > 0 ? (
              videoDevices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-card">
                  {device.label || `카메라 ${index + 1}`}
                </option>
              ))
            ) : (
              <option value="none" disabled className="bg-card text-muted-foreground">
                {hasCheckedDevices ? '연결된 카메라가 없습니다' : '카메라를 찾는 중...'}
              </option>
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <Camera size={14} />
          </div>
        </div>

        {/* 카메라 미리보기 영역 */}
        <div
          onClick={handleCameraPreview}
          className="aspect-video w-full bg-muted/50 rounded-xl border border-border flex flex-col items-center justify-center gap-3 relative overflow-hidden group cursor-pointer hover:bg-muted/70 transition-colors"
        >
          {isPreviewOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                <Camera size={32} />
              </div>
              <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                클릭하여 카메라 미리보기
              </span>
            </>
          )}

          {(!isVideoOff || isPreviewOn) && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full pointer-events-none">
              <Circle size={8} className="fill-red-500 text-red-500 animate-pulse" />
              <span className="text-[10px] text-white font-bold opacity-80 uppercase tracking-wider">
                Preview Active
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 마이크 섹션 */}
      <section className="space-y-4 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-muted-foreground">마이크</label>
          <Button
            variant={isMuted ? 'destructive' : 'default'}
            size="sm"
            onClick={handleMicToggle}
            className="h-8 px-3 text-xs"
          >
            {isMuted ? (
              <>
                <MicOff className="h-3.5 w-3.5 mr-1.5" />
                마이크 켜기
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 mr-1.5" />
                마이크 끄기
              </>
            )}
          </Button>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <select
              value={selectedMicId}
              onChange={(e) => setMic(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
            >
              {audioDevices.length > 0 ? (
                audioDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId} className="bg-card">
                    {device.label || `마이크 ${index + 1}`}
                  </option>
                ))
              ) : (
                <option value="none" disabled className="bg-card text-muted-foreground">
                  {hasCheckedDevices ? '연결된 마이크가 없습니다' : '마이크를 찾는 중...'}
                </option>
              )}
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
          {/* 실시간 마이크 레벨 미터 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium text-muted-foreground">현재 입력 레벨</span>
              <span className="text-[10px] font-black text-foreground">
                {Math.round(micLevel)}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-75',
                  micLevel > 70 ? 'bg-green-500' : micLevel > 40 ? 'bg-yellow-500' : 'bg-primary',
                )}
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleMicTest}
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
              {audioOutputDevices.length > 0 ? (
                audioOutputDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId} className="bg-card">
                    {device.label || `스피커 ${index + 1}`}
                  </option>
                ))
              ) : (
                <option value="none" disabled className="bg-card text-muted-foreground">
                  {hasCheckedDevices ? '연결된 스피커가 없습니다' : '스피커를 찾는 중...'}
                </option>
              )}
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
          onClick={handleSpeakerTest}
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
    </div>
  );
};

export default DeviceSection;
