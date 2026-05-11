import 'server-only';

import { CCGameLobbyPage } from './CCGameLobbyPage';

export const dynamic = 'force-dynamic';

export default function GamesPage(): React.ReactNode {
  return <CCGameLobbyPage />;
}
