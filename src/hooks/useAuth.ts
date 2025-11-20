import { useEffect, useState } from 'react';
import { AnonymousUser, ensureAuth, subscribeAuth } from '@/services/auth';

export const useAuth = () => {
  const [user, setUser] = useState<AnonymousUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    ensureAuth()
      .catch((err) => setError(err))
      .finally(() => setLoading(false));

    const unsubscribe = subscribeAuth(setUser);
    return () => unsubscribe();
  }, []);

  return { user, loading, error };
};
