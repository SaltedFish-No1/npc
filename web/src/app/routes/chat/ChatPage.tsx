/**
 * 文件：web/src/app/routes/chat/ChatPage.tsx
 * 功能描述：聊天页面路由组件，渲染聊天功能模块 | Description: Chat route component rendering chat feature
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 ChatFeature 组件
 */
import ChatFeature from '@/features/chat/ChatFeature';

/**
 * 功能：返回聊天页面组件
 * Description: Return chat page component
 */
export default function ChatPage() {
  return <ChatFeature />;
}
