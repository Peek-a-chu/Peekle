import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
  isMe: boolean;
}

export function CCProfileHeader({ user, isMe }: Props) {
  const isExtensionLinked = !!user.bojId;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Avatar (Placeholder based on nickname) */}
        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 shrink-0 border-4 border-white shadow-sm">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.nickname}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            user.nickname.charAt(0).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900">{user.nickname}</h1>

          {/* BOJ Integration Status */}
          <div className="flex items-center gap-2 mt-1">
            {isExtensionLinked ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                BOJ: {user.bojId}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                BOJ 미연동
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isExtensionLinked && isMe && (
          <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition shadow-sm">
            확장프로그램 연동하기
          </button>
        )}
        {isMe && (
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm">
            프로필 수정
          </button>
        )}
      </div>
    </div>
  );
}
