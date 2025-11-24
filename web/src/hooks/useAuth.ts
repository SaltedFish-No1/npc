/**
 * 文件：web/src/hooks/useAuth.ts
 * 功能描述：匿名鉴权 Hook，负责初始化与订阅用户状态 | Description: Anonymous auth hook that initializes and subscribes to user state
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖前端 auth 服务
 */
import { useEffect, useState } from 'react';
import { AnonymousUser, ensureAuth, subscribeAuth } from '@/services/auth';

/**
 * 功能：返回匿名用户、加载与错误状态
 * Description: Return anonymous user, loading and error state
 */
export const useAuth = () => {
  const [user, setUser] = useState<AnonymousUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const authUser = ensureAuth();
      setUser(authUser);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }

    const unsubscribe = subscribeAuth(setUser);
    return () => {
      unsubscribe();
    };
  }, []);

  return { user, loading, error };
};
