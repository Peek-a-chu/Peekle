# Modal Components

공통 모달 컴포넌트 사용 가이드

## 컴포넌트 종류

### 1. ConfirmModal (단일 버튼)
확인만 필요한 알림 모달

### 2. ActionModal (이중 버튼)
사용자 확인이 필요한 액션 모달

---

## 사용 예시

### ConfirmModal - 기본 알림

```tsx
import { ConfirmModal } from '@/components/common/Modal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="알림"
      description="작업이 완료되었습니다."
      confirmText="확인"
    />
  );
}
```

### ConfirmModal - 에러 알림 (빨간색 버튼)

```tsx
<ConfirmModal
  isOpen={isErrorOpen}
  onClose={() => setIsErrorOpen(false)}
  title="오류 발생"
  description="파일 업로드에 실패했습니다.\n다시 시도해주세요."
  confirmText="확인"
  variant="destructive"
/>
```

### ActionModal - 삭제 확인

```tsx
import { ActionModal } from '@/components/common/Modal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteItem();
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={handleDelete}
      title="삭제 확인"
      description="정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
      cancelText="취소"
      confirmText="삭제"
      variant="destructive"
      isLoading={isLoading}
    />
  );
}
```

### ActionModal - 일반 확인

```tsx
<ActionModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleSave}
  title="저장 확인"
  description="변경사항을 저장하시겠습니까?"
  cancelText="취소"
  confirmText="저장"
  variant="default"
/>
```

### ActionModal - JSX 컨텐츠

```tsx
<ActionModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelegate}
  title="방장 위임"
  description={
    <>
      <strong>{userName}</strong>님에게 방장을 위임하시겠습니까?
      <br />
      <br />
      위임 후에는 방 설정 및 멤버 관리 권한이 이전됩니다.
    </>
  }
  confirmText="위임하기"
/>
```

---

## Props 설명

### ConfirmModal Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | ✅ | - | 모달 표시 여부 |
| `onClose` | `() => void` | ✅ | - | 모달 닫기 핸들러 |
| `title` | `string` | ✅ | - | 모달 제목 |
| `description` | `string \| ReactNode` | ❌ | - | 모달 설명 (문자열 또는 JSX) |
| `confirmText` | `string` | ❌ | `"확인"` | 확인 버튼 텍스트 |
| `variant` | `'default' \| 'destructive'` | ❌ | `'default'` | 버튼 스타일 |

### ActionModal Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | ✅ | - | 모달 표시 여부 |
| `onClose` | `() => void` | ✅ | - | 모달 닫기 핸들러 |
| `onConfirm` | `() => void` | ✅ | - | 확인 버튼 클릭 핸들러 |
| `title` | `string` | ✅ | - | 모달 제목 |
| `description` | `string \| ReactNode` | ❌ | - | 모달 설명 (문자열 또는 JSX) |
| `cancelText` | `string` | ❌ | `"취소"` | 취소 버튼 텍스트 |
| `confirmText` | `string` | ❌ | `"확인"` | 확인 버튼 텍스트 |
| `variant` | `'default' \| 'destructive'` | ❌ | `'default'` | 확인 버튼 스타일 |
| `isLoading` | `boolean` | ❌ | `false` | 로딩 상태 (버튼 비활성화) |

---

## 버튼 variant

- **`default`**: 기본 파란색 버튼 (일반 확인 액션)
- **`destructive`**: 빨간색 버튼 (삭제, 탈퇴 등 위험한 액션)

---

## 기능

✅ **ESC 키로 닫기 지원**
✅ **배경 클릭으로 닫기 지원**
✅ **로딩 상태 표시** (ActionModal)
✅ **다크모드 지원**
✅ **반응형 디자인**
✅ **키보드 접근성**
