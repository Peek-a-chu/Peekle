import 'server-only';
import { StudyRoomClient } from '@/domains/study/components';

export const dynamic = 'force-dynamic';

export default function StudyRoomPage() {
  return <StudyRoomClient />;
}
