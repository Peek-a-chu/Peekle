'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useExtensionCheck } from '@/hooks/useExtensionCheck';
import { UserProfile, ExtensionStatus } from '../types';
import { CCProfileHeader } from './CCProfileHeader';
import { CCProfileStatsRow } from './CCProfileStatsRow';
import {
  checkNickname as checkNicknameApi,
  checkBojId as checkBojIdApi,
  getPresignedUrl,
  updateUserProfile,
} from '@/api/userApi';
import ActivityStreak from '@/domains/home/components/ActivityStreak';
import LearningTimeline from '@/domains/home/components/LearningTimeline';
import { useAuthStore } from '@/store/auth-store';
import { ConfirmModal } from '@/components/common/Modal';
import { toast } from 'sonner';

import { CCExtensionGuide } from './CCExtensionGuide';

import { ActivityStreakData, TimelineItemData } from '@/domains/home/mocks/dashboardMocks';

interface Props {
  user: UserProfile;
  isMe: boolean;
  initialStreak?: ActivityStreakData[];
  initialTimeline?: TimelineItemData[];
  initialDate?: string;
}

interface ValidateResponse {
  success?: boolean;
  data?: {
    valid?: boolean;
  };
}

const TABS = {
  OVERVIEW: '개요',
  EXTENSION: '확장 프로그램',
} as const;

type TabKey = (typeof TABS)[keyof typeof TABS];

export function CCProfileView({ user, isMe, initialStreak, initialTimeline, initialDate }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>(TABS.OVERVIEW);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialDate || new Date().toISOString().split('T')[0],
  );

  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Optimistic UI State
  const [optimisticUser, setOptimisticUser] = useState<UserProfile>(user);

  // Sync optimistic user with real user data when it updates (e.g. after refresh)
  useEffect(() => {
    setOptimisticUser(user);
  }, [user]);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  // Image State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mainImageToUpload, setMainImageToUpload] = useState<File | null>(null); // 112x112
  const [thumbToUpload, setThumbToUpload] = useState<File | null>(null); // 36x36 thumbnail
  const [isProfileImageDeleted, setIsProfileImageDeleted] = useState(false);
  // Text State
  const [editNickname, setEditNickname] = useState(user.nickname);
  const [editBojId, setEditBojId] = useState(user.bojId || '');
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const nickChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nicknameValidation, setNicknameValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const [bojIdValidation, setBojIdValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  // Modal State
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  // Extension State
  const { isInstalled, extensionToken, isChecking, checkInstallation } = useExtensionCheck();
  const [status, setStatus] = useState<ExtensionStatus>('NOT_INSTALLED');
  const [isLoading, setIsLoading] = useState(true);

  const handleEditStart = () => {
    setIsEditing(true);
    // Initialize states
    setPreviewImage(optimisticUser.profileImg || null);
    setIsProfileImageDeleted(false);
    setMainImageToUpload(null);
    setThumbToUpload(null);
    setEditNickname(optimisticUser.nickname);
    setEditBojId(optimisticUser.bojId || '');
    setNicknameValidation({ status: 'idle', message: '' });
    setBojIdValidation({ status: 'idle', message: '' });
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setPreviewImage(null);
    setMainImageToUpload(null);
    setThumbToUpload(null);
    setIsProfileImageDeleted(false);
    setEditNickname('');
    setEditBojId('');
    setNicknameValidation({ status: 'idle', message: '' });
  };

  // 닉네임 유효성 검사 (디바운스 적용)
  const checkNickname = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setNicknameValidation({ status: 'idle', message: '' });
        return;
      }

      // 원래 닉네임과 같으면 통과 (변경 없음)
      if (value === user.nickname) {
        setNicknameValidation({ status: 'valid', message: '' });
        return;
      }

      setNicknameValidation({ status: 'checking', message: '확인 중...' });

      try {
        const data = await checkNicknameApi(value);

        if (data.success && data.data) {
          setNicknameValidation({
            status: data.data.available ? 'valid' : 'invalid',
            message: data.data.message,
          });
        }
      } catch {
        setNicknameValidation({ status: 'invalid', message: '서버 연결에 실패했습니다.' });
      }
    },
    [user.nickname],
  );

  // 디바운스된 닉네임 체크
  useEffect(() => {
    if (!isEditing) return;

    // 원래 닉네임과 같으면 즉시 valid 처리하고 API 호출 안함
    if (editNickname === user.nickname) {
      setNicknameValidation({ status: 'valid', message: '' });
      return;
    }

    const timer = setTimeout(() => {
      void checkNickname(editNickname);
    }, 300);

    return () => clearTimeout(timer);
  }, [editNickname, isEditing, checkNickname, user.nickname]);

  // BOJ ID 유효성 검사 (디바운스 적용)
  const checkBojId = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setBojIdValidation({ status: 'idle', message: '' });
        return;
      }

      // 기존 ID와 같으면 패스 (변경 없음)
      if (value === user.bojId) {
        setBojIdValidation({ status: 'valid', message: '' });
        return;
      }

      setBojIdValidation({ status: 'checking', message: '확인 중...' });

      try {
        const data = await checkBojIdApi(value);

        if (data.success && data.data) {
          setBojIdValidation({
            status: data.data.valid ? 'valid' : 'invalid',
            message: data.data.message,
          });
        }
      } catch {
        setBojIdValidation({ status: 'invalid', message: '서버 연결에 실패했습니다.' });
      }
    },
    [user.bojId],
  );

  // 디바운스된 BOJ ID 체크
  useEffect(() => {
    if (!isEditing) return;

    if (editBojId === (user.bojId || '')) {
      setBojIdValidation({ status: 'valid', message: '' });
      return;
    }

    // 빈 값일 때 처리
    if (!editBojId.trim()) {
      setBojIdValidation({ status: 'idle', message: '' });
      return;
    }

    const timer = setTimeout(() => {
      void checkBojId(editBojId);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [editBojId, isEditing, checkBojId, user.bojId]);

  const handleUploadImageTrigger = () => {
    document.getElementById('profile-image-input')?.click();
  };

  const resizeImage = (
    file: File,
    width: number,
    height: number,
    filenamePrefix: string,
  ): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 이미지 비율 유지하면서 중앙 크롭 또는 채우기 (여기서는 단순 resize 예시, 필요시 크롭 로직 추가 가능)
          // 112x112, 36x36 은 정사각형이므로 간단하게 drawImage로 꽉 채움 (왜곡 될 수 있음, 개선 가능)
          // 개선: object-cover 효과 구현
          const scale = Math.max(width / img.width, height / img.height);
          const x = (width / scale - img.width) / 2;
          const y = (height / scale - img.height) / 2;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const resizedFile = new File([blob], `${filenamePrefix}_${file.name}`, {
                type: file.type,
              });
              resolve(resizedFile);
            } else {
              resolve(file);
            }
          }, file.type);
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File Type Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('jpg, png, jpeg, webp 파일만 업로드 가능합니다.');
      return;
    }

    setIsProfileImageDeleted(false);

    // 1. Create Main Image (112x112)
    const mainImg = await resizeImage(file, 112, 112, 'main');
    setMainImageToUpload(mainImg);

    // 2. Create Thumbnail (36x36)
    const thumbImg = await resizeImage(file, 36, 36, 'thumb');
    setThumbToUpload(thumbImg);

    // 3. Create preview from Main Image (better quality than thumb)
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(mainImg);
  };

  const handleDeleteImage = () => {
    setPreviewImage(null);
    setMainImageToUpload(null);
    setThumbToUpload(null);
    setIsProfileImageDeleted(true);
  };

  // --- Optimistic UI Update ---
  const handleEditSave = async () => {
    // 1. Snapshot previous state for rollback
    const previousUser = { ...optimisticUser };

    // 2. Data Validation
    if (editNickname !== user.nickname && nicknameValidation.status !== 'valid') {
      toast.error('닉네임을 확인해주세요.');
      return;
    }

    if (editBojId !== (user.bojId || '') && bojIdValidation.status !== 'valid') {
      toast.error('백준 아이디를 확인해주세요.');
      return;
    }

    try {
      // 3. Apply Optimistic Update Immediately
      // Determine image to show: previewImage (if uploaded/changed) -> or null (if deleted) -> or original
      let nextProfileImg = optimisticUser.profileImg;
      if (isProfileImageDeleted) {
        nextProfileImg = undefined; // Deleted
      } else if (previewImage) {
        nextProfileImg = previewImage; // Uploaded/Changed (Data URL)
      }

      const nextUser = {
        ...optimisticUser,
        nickname: editNickname,
        bojId: editBojId || optimisticUser.bojId,
        profileImg: nextProfileImg,
        // We might want to clear thumb or set it same as profile for preview purposes
        profileImgThumb: nextProfileImg, // for immediate preview, using same img is fine
      };

      setOptimisticUser(nextUser);
      setIsEditing(false); // Close edit mode immediately
      toast.success('프로필이 업데이트되었습니다.');

      // --- Background Sync ---

      let uploadedImageUrl = undefined;
      let uploadedImageThumbUrl = undefined;

      // 4. Upload images if exist
      if (mainImageToUpload && thumbToUpload) {
        // --- A. Upload Main Image (112x112) ---
        const presignMainRes = await fetch(`/api/users/me/profile-image/presigned-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: mainImageToUpload.name,
            contentType: mainImageToUpload.type,
          }),
        });

        if (!presignMainRes.ok) throw new Error('Failed to get presigned url for main image');
        const mainData = (await presignMainRes.json()).data;

        await fetch(mainData.presignedUrl, {
          method: 'PUT',
          body: mainImageToUpload,
          headers: { 'Content-Type': mainImageToUpload.type },
        });

        uploadedImageUrl = mainData.publicUrl;

        // --- B. Upload Thumbnail (36x36) ---
        const presignThumbRes = await fetch(`/api/users/me/profile-image/presigned-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: thumbToUpload.name,
            contentType: thumbToUpload.type,
          }),
        });

        if (!presignThumbRes.ok) throw new Error('Failed to get presigned url for thumbnail');
        const thumbData = (await presignThumbRes.json()).data;

        await fetch(thumbData.presignedUrl, {
          method: 'PUT',
          body: thumbToUpload,
          headers: { 'Content-Type': thumbToUpload.type },
        });

        uploadedImageThumbUrl = thumbData.publicUrl;
      }

      // 5. Update Profile API Call
      const updatePayload: any = {};

      // Text fields
      if (editNickname !== user.nickname) {
        updatePayload.nickname = editNickname;
      }
      if (editBojId !== (user.bojId || '')) {
        updatePayload.bojId = editBojId;
      }

      // Image fields
      if (uploadedImageUrl) {
        updatePayload.profileImg = uploadedImageUrl;
        updatePayload.profileImgThumb = uploadedImageThumbUrl || uploadedImageUrl;
      }

      if (isProfileImageDeleted) {
        updatePayload.isProfileImageDeleted = true;
      }

      // Only send checking if there is something to update (though optimistic update already happened)
      if (Object.keys(updatePayload).length > 0) {
        await updateUserProfile(updatePayload);
      }

      // 6. Final Sync
      // Refresh auth store to update sidebar
      await checkAuth();

      // Soft Refresh to get authoritative data from server
      if (updatePayload.nickname && updatePayload.nickname !== user.nickname) {
        router.replace(`/profile/${updatePayload.nickname}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Save failed', error);
      toast.error('프로필 저장에 실패했습니다. 변경사항을 되돌립니다.');

      // Rollback
      setOptimisticUser(previousUser);
      setIsEditing(true); // Re-open edit mode so user can retry
    }
  };

  // 확장 프로그램 상태 체크 및 로깅
  useEffect(() => {
    if (!isMe) return;

    // 아직 확장프로그램 감지 중이면 로딩 유지
    if (isChecking) {
      setIsLoading(true);
      return;
    }

    const checkTokenValidity = async (token: string) => {
      try {
        const res = await fetch(`/api/users/me/validate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json()) as ValidateResponse;

        console.log('Token validation response:', json);

        const isValid = json.data?.valid;

        if (isValid) {
          console.log('✅ [CCProfileView] Extension check valid. Token matched.');
          setStatus('LINKED');
        } else {
          console.warn('❌ [CCProfileView] Token mismatch.');
          setStatus('MISMATCH');
        }
      } catch (e) {
        console.error('Failed to validate token:', e);
        setStatus('MISMATCH');
      } finally {
        setIsLoading(false);
      }
    };

    if (extensionToken) {
      // 3. 응답했고 값 있음 -> 백엔드 검증
      console.log('🔗 [CCProfileView] Checking token validity...');
      void checkTokenValidity(extensionToken);
    } else if (isInstalled) {
      // 2. 응답은 했는데 NULL 인 경우 -> 미연동
      console.log('⚠️ [CCProfileView] Extension Installed but NOT linked.');
      setStatus('INSTALLED');
      setIsLoading(false);
    } else {
      // 1. 응답 없음 (미설치)
      setStatus('NOT_INSTALLED');
      setIsLoading(false);
    }
  }, [isMe, isInstalled, extensionToken, isChecking]);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-8 min-h-screen">
      <div className="p-6 border border-card-border rounded-xl bg-card">
        {/* 1. Header Section */}
        <CCProfileHeader
          user={
            isEditing && previewImage
              ? { ...optimisticUser, profileImg: previewImage }
              : isProfileImageDeleted
                ? { ...optimisticUser, profileImg: undefined, profileImgThumb: undefined }
                : optimisticUser
          }
          isMe={isMe}
          isEditing={isEditing}
          onEditStart={handleEditStart}
          onEditCancel={handleEditCancel}
          onEditSave={handleEditSave}
          onUploadImage={handleUploadImageTrigger}
          onDeleteImage={handleDeleteImage}
          editNickname={editNickname}
          setEditNickname={setEditNickname}
          nicknameValidation={nicknameValidation}
          editBojId={editBojId}
          setEditBojId={setEditBojId}
          bojIdValidation={bojIdValidation}
        />

        <input
          type="file"
          id="profile-image-input"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
        />

        {/* 3. Stats Row */}
        <CCProfileStatsRow user={optimisticUser} />
      </div>

      {/* 4. Tabs (Segmented Control) */}
      <div className="bg-secondary/30 p-1 rounded-xl">
        <div className={`grid gap-1 ${isMe ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {(Object.values(TABS) as string[])
            .filter((tab) => isMe || tab !== TABS.EXTENSION)
            .map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabKey)}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-black/5'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {tab}
                  {isMe && tab === TABS.EXTENSION && !isChecking && (!isInstalled || !extensionToken) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-warning"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                </span>
              </button>
            ))}
        </div>
      </div>

      {/* 5. Content Area */}
      {activeTab === TABS.OVERVIEW && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="border border-card-border rounded-2xl bg-card overflow-hidden">
            {/* 활동 스트릭 */}
            <ActivityStreak
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              nickname={optimisticUser.nickname}
              initialData={initialStreak}
            />

            {/* 학습 타임라인 */}
            <LearningTimeline
              selectedDate={selectedDate}
              showHistoryLink={isMe}
              nickname={optimisticUser.nickname}
              initialData={selectedDate === initialDate ? initialTimeline : undefined}
            />
          </div>
        </div>
      )}

      {activeTab === TABS.EXTENSION && isMe && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <CCExtensionGuide
            user={optimisticUser}
            isInstalled={isInstalled}
            extensionToken={extensionToken}
            checkInstallation={checkInstallation}
            status={status}
            isLoading={isLoading}
            onRegisterBojId={() => {
              setActiveTab(TABS.OVERVIEW);
              handleEditStart();
            }}
          />
        </div>
      )}

      {/* Error Modal */}
      <ConfirmModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        title="알림"
        description={errorModal.message}
        variant="destructive"
      />
    </div>
  );
}
