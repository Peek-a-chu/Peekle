import Image from 'next/image';
import { UserProfile } from '../types';
import { UserIcon } from '@/components/UserIcon';

// import defaultProfileImg from '@/assets/icons/profile.png'; // Remove static import

interface Props {
  user: UserProfile;
  isMe: boolean;
  isEditing: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onUploadImage?: () => void;
  onDeleteImage?: () => void;
  editNickname?: string;
  setEditNickname?: (value: string) => void;
  nicknameValidation?: {
    status: 'idle' | 'checking' | 'valid' | 'invalid' | 'error';
    message: string;
  };
  editBojId?: string;
  setEditBojId?: (value: string) => void;
  bojIdValidation?: {
    status: 'idle' | 'checking' | 'valid' | 'invalid' | 'error';
    message: string;
  };
}

export function CCProfileHeader({ user, isMe, isEditing, onEditStart, onEditCancel, onEditSave, onUploadImage, onDeleteImage, editNickname, setEditNickname, nicknameValidation, editBojId, setEditBojId, bojIdValidation }: Props) {
  const isExtensionLinked = !!user.bojId;

  // 기본 이미지 생성

  const getValidationColor = () => {
    if (!nicknameValidation) return '';
    switch (nicknameValidation.status) {
      case 'valid': return 'text-green-500';
      case 'invalid':
      case 'error': return 'text-red-500';
      case 'checking': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  const getInputBorderColor = () => {
    if (!nicknameValidation) return 'border-primary/50';
    switch (nicknameValidation.status) {
      case 'valid': return 'border-green-500 focus:border-green-500';
      case 'invalid':
      case 'error': return 'border-red-500 focus:border-red-500';
      default: return 'border-primary/50 focus:border-primary';
    }
  };

  const getBojInputBorderColor = () => {
    if (!bojIdValidation) return 'border-muted-foreground/50';
    switch (bojIdValidation.status) {
      case 'valid': return 'border-green-500 focus:border-green-500';
      case 'invalid':
      case 'error': return 'border-red-500 focus:border-red-500';
      default: return 'border-muted-foreground/50 focus:border-primary';
    }
  };

  const getBojValidationColor = () => {
    if (!bojIdValidation) return '';
    switch (bojIdValidation.status) {
      case 'valid': return 'text-green-500';
      case 'invalid':
      case 'error': return 'text-red-500';
      case 'checking': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Profile Image (Placeholder based on nickname) */}
        <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center shrink-0 overflow-hidden group">
          {/* 프로필 상세 페이지에서는 항상 고해상도 이미지(profileImg)를 우선 사용 */}
          {/* profileImg가 없으면 썸네일(profileImgThumb) -> 둘 다 없으면 기본 이미지(DiceBear) */}
          <UserIcon
            src={user.profileImg || user.profileImgThumb}
            nickname={user.nickname}
            size={80}
            className="w-full h-full"
          />

          {/* Edit Overlay */}
          {isEditing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-4 transition-opacity">
              <button
                onClick={onUploadImage}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition ring-1 ring-white/50"
                title="이미지 변경"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              </button>

              <button
                onClick={onDeleteImage}
                className="p-2 rounded-full bg-white/20 hover:bg-red-500/80 text-white transition ring-1 ring-white/50"
                title="이미지 삭제"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
              </button>

            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2">
          {isEditing && setEditNickname ? (
            <div className="relative">
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                className={`text-3xl font-bold bg-transparent border-b text-foreground focus:outline-none w-full max-w-[200px] transition-colors ${getInputBorderColor()}`}
                placeholder="닉네임"
                maxLength={12}
              />
              {nicknameValidation && nicknameValidation.message && (
                <p className={`absolute top-full left-0 mt-1 text-xs whitespace-nowrap ${getValidationColor()}`}>
                  {nicknameValidation.status === 'checking' && (
                    <span className="inline-block w-2.5 h-2.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin mr-1.5 align-middle" />
                  )}
                  {nicknameValidation.message}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{user.nickname}</h1>
              {user.league && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {user.league}
                </span>
              )}
            </div>
          )}


          {isEditing && setEditBojId ? (
            <div className="flex items-center gap-2 mt-6 relative">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">BOJ ID:</span>
              <div className="relative">
                <input
                  type="text"
                  value={editBojId}
                  onChange={(e) => setEditBojId(e.target.value)}
                  className={`text-sm bg-transparent border-b text-foreground focus:outline-none w-full max-w-[150px] transition-colors ${getBojInputBorderColor()}`}
                  placeholder="Baekjoon"
                />
                {bojIdValidation && bojIdValidation.message && (
                  <p className={`absolute top-full left-0 mt-1 text-xs whitespace-nowrap ${getBojValidationColor()}`}>
                    {bojIdValidation.status === 'checking' && (
                      <span className="inline-block w-2 pb-0.5 align-middle">
                        <div className="w-2 h-2 border border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                      </span>
                    )}
                    {bojIdValidation.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {isExtensionLinked ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 border border-green-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium">BOJ 연동됨</span>
                  <span className="text-black/20 dark:text-white/20">|</span>
                  <span className="font-bold">{user.bojId}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  <span>연동 안됨</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isMe && (
          isEditing ? (
            <>
              <button
                onClick={onEditCancel}
                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 transition shadow-sm"
              >
                취소
              </button>
              <button
                onClick={onEditSave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
              >
                저장
              </button>
            </>
          ) : (
            <button
              onClick={onEditStart}
              className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 transition shadow-sm"
            >
              프로필 수정
            </button>
          )
        )}
      </div>
    </div>
  );
}
