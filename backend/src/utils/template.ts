type Primitive = string | number | boolean | null | undefined;

type TemplateContext = Record<string, Primitive | TemplateContext>;

const lookup = (ctx: TemplateContext, path: string): Primitive | TemplateContext => {
  return path.split('.').reduce<Primitive | TemplateContext>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as TemplateContext)[key];
    }
    return '';
  }, ctx);
};

export const renderTemplate = (template: string, ctx: TemplateContext): string => {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const value = lookup(ctx, key);
    return value == null ? '' : String(value);
  });
};
