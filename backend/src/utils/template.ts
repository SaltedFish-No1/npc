/**
 * 文件：backend/src/utils/template.ts
 * 功能描述：简单占位符模板渲染（支持点路径） | Description: Simple placeholder template rendering with dot-path lookup
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：纯函数，无外部依赖
 */
type Primitive = string | number | boolean | null | undefined;

type TemplateValue = Primitive | TemplateContext | TemplateValue[];

interface TemplateContext {
  [key: string]: TemplateValue;
}

/**
 * 功能：按点路径在上下文中查找值
 * Description: Lookup value from context by dot-separated path
 */
const lookup = (ctx: TemplateContext, path: string): TemplateValue => {
  return path.split('.').reduce<TemplateValue>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as TemplateContext)[key];
    }
    return '';
  }, ctx);
};

/**
 * 功能：渲染模板，将 `{{key}}` 替换为上下文值，空值返回空字符串
 * Description: Render template replacing `{{key}}` with context value, empty becomes ''
 * @param {string} template - 模板文本 | Template text
 * @param {TemplateContext} ctx - 上下文对象 | Context object
 * @returns {string} 渲染结果 | Rendered result
 */
export const renderTemplate = (template: string, ctx: TemplateContext): string => {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const value = lookup(ctx, key);
    return value == null ? '' : String(value);
  });
};
