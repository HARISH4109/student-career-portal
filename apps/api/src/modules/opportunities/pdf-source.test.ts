import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { extractPdfText } from './pdf-source';

describe('PDF source extraction', () => {
  it('extracts readable text from an actual PDF', async () => {
    const bytes = await readFile(new URL('../../test/fixtures/opportunity.pdf', import.meta.url));
    expect(await extractPdfText(`data:application/pdf;base64,${bytes.toString('base64')}`)).toContain('Platform Engineer');
  });
  it('rejects invalid PDF data', async () => {
    await expect(extractPdfText('data:application/pdf;base64,aGVsbG8=')).rejects.toThrow('valid PDF');
  });
  it('explains how to recover when a PDF has no text', async () => {
    const bytes = await readFile(new URL('../../test/fixtures/blank.pdf', import.meta.url));
    await expect(extractPdfText(`data:application/pdf;base64,${bytes.toString('base64')}`)).rejects.toThrow('no readable text');
  });
});
