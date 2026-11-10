import { ValidationError } from '@/shared/errors/app-error';

export async function extractPdfText(content: string): Promise<string> {
  const match = /^data:application\/pdf;base64,([A-Za-z0-9+/=\s]+)$/.exec(content);
  if (!match?.[1]) throw new ValidationError('Upload a valid PDF file.');
  const data = Buffer.from(match[1], 'base64');
  if (data.length > 15 * 1024 * 1024 || data.subarray(0, 5).toString() !== '%PDF-') {
    throw new ValidationError('Upload a valid PDF no larger than 15 MB.');
  }
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data });
  try {
    const info = await parser.getInfo();
    if (info.total > 50) throw new ValidationError('PDFs must contain at most 50 pages.');
    const result = await parser.getText();
    const text = result.pages.map((page) => page.text).join('\n').trim();
    if (!text) throw new ValidationError('This PDF has no readable text. Upload a page image or paste the opportunity text.');
    return text;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('This PDF could not be read. Use an unlocked PDF, a page image, or pasted text.');
  } finally {
    await parser.destroy();
  }
}
