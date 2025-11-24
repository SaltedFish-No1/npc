/**
 * 文件：backend/src/utils/json.ts
 * 功能描述：JSON 文本清洗工具（去除代码块、规范化正号数字） | Description: JSON text sanitizers for code fences and plus-sign numbers
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：纯函数，无外部依赖
 */
/**
 * 功能：去除 ```json/``` 包裹的代码块并修剪空白
 * Description: Trim ```json``` code fences and whitespace
 * @param {string} text - 原始文本 | Raw text
 * @returns {string} 清洗后的文本 | Cleaned text
 */
export const trimCodeFence = (text: string) => text.replace(/```json/gi, '').replace(/```/g, '').trim();

/**
 * 功能：规范化 JSON 数字，移除冒号后的正号
 * Description: Normalize JSON numbers by removing plus sign after colon
 * @param {string} text - 文本 | Text
 * @returns {string} 规范化后的文本 | Normalized text
 */
export const normalizeJsonNumbers = (text: string) => text.replace(/(:\s*)\+(\d+(?:\.\d+)?)/g, '$1$2');
