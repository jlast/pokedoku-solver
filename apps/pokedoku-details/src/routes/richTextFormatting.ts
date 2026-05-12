// FormatRange is [formattingFlag, startIndex, length]
// Flags: bold=1, italic=2, superscript=32
export type RichTextFormatRange = [number, number, number];

const RICH_TEXT_BOLD = 1;
const RICH_TEXT_ITALIC = 2;
const RICH_TEXT_SUPERSCRIPT = 32;

export const richTextBold = (length: number): RichTextFormatRange => [
  RICH_TEXT_BOLD,
  0,
  length,
];

export const richTextSuperscript = (length: number): RichTextFormatRange => [
  RICH_TEXT_SUPERSCRIPT,
  0,
  length,
];

export const richTextItalic = (length: number): RichTextFormatRange => [
  RICH_TEXT_ITALIC,
  0,
  length,
];
