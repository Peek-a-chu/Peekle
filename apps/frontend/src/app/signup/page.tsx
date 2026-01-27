'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
import { signup as signupApi } from '@/app/api/authApi';
import { checkNickname as checkNicknameApi } from '@/app/api/userApi';

interface NicknameValidation {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  message: string;
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [nickname, setNickname] = useState('');
  const [bojId, setBojId] = useState('');
  const [validation, setValidation] = useState<NicknameValidation>({
    status: 'idle',
    message: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    // 토큰 유효성만 확인 (카카오 정보는 사용하지 않음)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.provider || !payload.sub) {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  }, [token, router]);

  // 닉네임 유효성 검사 (디바운스 적용)
  const checkNickname = useCallback(async (value: string) => {
    if (!value.trim()) {
      setValidation({ status: 'idle', message: '' });
      return;
    }

    setValidation({ status: 'checking', message: '확인 중...' });

    try {
      const data = await checkNicknameApi(value);

      if (data.success && data.data) {
        setValidation({
          status: data.data.available ? 'valid' : 'invalid',
          message: data.data.message,
        });
      }
    } catch {
      setValidation({ status: 'invalid', message: '서버 연결에 실패했습니다.' });
    }
  }, []);

  // 디바운스된 닉네임 체크
  useEffect(() => {
    const timer = setTimeout(() => {
      checkNickname(nickname);
    }, 300);

    return () => clearTimeout(timer);
  }, [nickname, checkNickname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('인증 정보가 없습니다. 다시 로그인해주세요.');
      router.push('/login');
      return;
    }

    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    if (validation.status !== 'valid') {
      setError('닉네임을 확인해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await signupApi(token, nickname, bojId);

      if (data.success) {
        router.push('/home');
      } else {
        setError(data.error?.message || '회원가입에 실패했습니다.');
      }
    } catch {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationColor = () => {
    switch (validation.status) {
      case 'valid':
        return 'text-green-500';
      case 'invalid':
        return 'text-red-500';
      case 'checking':
        return 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  };

  const getInputBorderColor = () => {
    switch (validation.status) {
      case 'valid':
        return 'border-green-300 focus:ring-green-200 focus:border-green-400';
      case 'invalid':
        return 'border-red-300 focus:ring-red-200 focus:border-red-400';
      default:
        return 'border-slate-200 focus:ring-pink-200 focus:border-pink-300';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
      <div className="w-full max-w-[440px] px-4">
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-10 space-y-6">
          {/* X 버튼 */}
          <Link href="/">
            <button className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-primary hover:bg-pink-50/80 transition-all duration-200 group">
              <X className="w-5 h-5" />
            </button>
          </Link>

          <div className="text-center space-y-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              회원가입
            </h1>
            <p className="text-slate-500 text-[15px]">
              힐끔힐끔코딩에서 사용할 정보를 입력해주세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                닉네임 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="2~12자 한글/영문/숫자"
                className={`w-full h-11 px-4 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${getInputBorderColor()}`}
                maxLength={12}
              />
              {validation.message && (
                <p className={`mt-1.5 text-sm ${getValidationColor()}`}>
                  {validation.status === 'checking' && (
                    <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin mr-1.5 align-middle" />
                  )}
                  {validation.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                백준 아이디 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                value={bojId}
                onChange={(e) => setBojId(e.target.value)}
                placeholder="백준 아이디를 입력하세요"
                className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || validation.status !== 'valid'}
              className="w-full h-[52px] bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '가입 중...' : '가입 완료'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
