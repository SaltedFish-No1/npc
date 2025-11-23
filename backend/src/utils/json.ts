export const trimCodeFence = (text: string) => text.replace(/```json/gi, '').replace(/```/g, '').trim();

export const normalizeJsonNumbers = (text: string) => text.replace(/(:\s*)\+(\d+(?:\.\d+)?)/g, '$1$2');
