'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { signup as signupApi } from '@/api/authApi';
import { checkNickname as checkNicknameApi, checkBojId as checkBojIdApi } from '@/api/userApi';

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

  const [bojValidation, setBojValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message: string;
  }>({
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    // 토큰 유효성만 확인 (카카오 정보는 사용하지 않음)
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as {
        provider?: string;
        sub?: string;
      };
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
      const data = await checkNicknameApi(value, token || undefined);

      if (data.success && data.data) {
        setValidation({
          status: data.data.available ? 'valid' : 'invalid',
          message: data.data.message,
        });
      }
    } catch {
      setValidation({ status: 'invalid', message: '서버 연결에 실패했습니다.' });
    }
  }, [token]);

  // 디바운스된 닉네임 체크
  useEffect(() => {
    const timer = setTimeout(() => {
      void checkNickname(nickname);
    }, 300);

    return () => clearTimeout(timer);
  }, [nickname, checkNickname]);

  // BOJ ID 유효성 검사 (디바운스)
  const checkBojId = useCallback(async (value: string) => {
    // 빈 값은 허용 (체크 안함, status: idle/valid 취급을 위해 idle로 둠)
    if (!value.trim()) {
      setBojValidation({ status: 'idle', message: '' });
      return;
    }

    setBojValidation({ status: 'checking', message: '확인 중...' });

    try {
      const data = await checkBojIdApi(value, token || undefined);

      if (data.success && data.data) {
        setBojValidation({
          status: data.data.valid ? 'valid' : 'invalid',
          message: data.data.message,
        });
      }
    } catch {
      setBojValidation({ status: 'invalid', message: '서버 연결에 실패했습니다.' });
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkBojId(bojId);
    }, 500);

    return () => clearTimeout(timer);
  }, [bojId, checkBojId]);

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

    // BOJ ID가 입력되어 있는데 유효하지 않으면 차단
    if (bojId.trim() && bojValidation.status !== 'valid') {
      setError('백준 아이디를 확인해주세요.');
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

  const getBojValidationColor = () => {
    switch (bojValidation.status) {
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

  const getBojInputBorderColor = () => {
    switch (bojValidation.status) {
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
          <div className="text-center space-y-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              회원가입
            </h1>
            <p className="text-slate-500 text-[15px]">
              힐끔힐끔코딩에서 사용할 정보를 입력해주세요
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
                className={`w-full h-11 px-4 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${getBojInputBorderColor()}`}
              />
              {bojValidation.message && (
                <p className={`mt-1.5 text-sm ${getBojValidationColor()}`}>
                  {bojValidation.status === 'checking' && (
                    <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin mr-1.5 align-middle" />
                  )}
                  {bojValidation.message}
                </p>
              )}
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                validation.status !== 'valid' ||
                (!!bojId.trim() && bojValidation.status !== 'valid')
              }
              className="w-full h-[52px] bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '가입 중...' : '가입 완료'}
            </button>
          </form>

          {/* 뒤로 가기 버튼 */}
          <div className="pt-2">
            <Link href="/">
              <button className="w-full h-11 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 transition-colors duration-200 text-sm font-medium group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                <span>메인으로 돌아가기</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
