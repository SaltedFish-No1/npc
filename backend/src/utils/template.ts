type Primitive = string | number | boolean | null | undefined;

type TemplateValue = Primitive | TemplateContext | TemplateValue[];

interface TemplateContext {
  [key: string]: TemplateValue;
}

const lookup = (ctx: TemplateContext, path: string): TemplateValue => {
  return path.split('.').reduce<TemplateValue>((acc, key) => {
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
