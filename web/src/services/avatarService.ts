import { NPC_API_BASE_URL, NPC_API_KEY } from '@/config/constants';
import { CharacterAvatar } from '@/schemas/chat';

const trimmedBase = NPC_API_BASE_URL.replace(/\/+$/, '');

const ensureConfigured = () => {
  if (!NPC_API_KEY) {
    throw new Error('Missing NPC backend API key. Set VITE_NPC_API_KEY.');
  }
};

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': NPC_API_KEY
};

export const fetchAvatars = async (params?: {
  characterId?: string;
  includeGlobal?: boolean;
  signal?: AbortSignal;
}): Promise<CharacterAvatar[]> => {
  ensureConfigured();
  const qs = new URLSearchParams();
  if (params?.characterId) qs.set('characterId', params.characterId);
  if (params?.includeGlobal === false) qs.set('includeGlobal', 'false');
  const response = await fetch(
    `${trimmedBase}/api/npc/avatars${qs.toString() ? `?${qs.toString()}` : ''}`,
    {
      method: 'GET',
      headers,
      signal: params?.signal,
      credentials: 'omit'
    }
  );
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`NPC avatar fetch failed ${response.status}: ${errorText || response.statusText}`);
  }
  const payload = (await response.json()) as unknown;
  // Minimal runtime validation
  return (payload as CharacterAvatar[]).map((item) => ({
    id: item.id,
    characterId: item.characterId ?? null,
    statusLabel: item.statusLabel,
    imageUrl: item.imageUrl,
    metadata: item.metadata ?? null,
    createdAt: item.createdAt
  }));
};

export const applyAvatarToSession = async (params: {
  sessionId: string;
  avatarId: string;
}): Promise<{ characterState: CharacterAvatarState; sessionId: string; sessionVersion?: number }> => {
  ensureConfigured();
  const response = await fetch(`${trimmedBase}/api/npc/sessions/${params.sessionId}/avatar`, {
    method: 'POST',
    headers,
    credentials: 'omit',
    body: JSON.stringify({ avatarId: params.avatarId })
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Apply avatar failed ${response.status}: ${errorText || response.statusText}`);
  }
  return (await response.json()) as {
    characterState: CharacterAvatarState;
    sessionId: string;
    sessionVersion?: number;
  };
};

type CharacterAvatarState = {
  avatarUrl?: string;
  avatarId?: string;
  avatarLabel?: string;
  stress: number;
  trust: number;
  mode: string;
  name?: string;
};
