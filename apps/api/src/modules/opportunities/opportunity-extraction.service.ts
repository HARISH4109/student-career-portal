import { extractedOpportunitySchema, type ExtractedOpportunityDto } from '@career-portal/shared-types';

import { extractPdfText } from './pdf-source';

import { env } from '@/config/env';
import { logger } from '@/infrastructure/logger';
import { InternalError, ValidationError } from '@/shared/errors/app-error';

/**
 * Normalises arbitrary payloads returned from n8n into our standard schema shape:
 * - Unwraps n8n wrappers: [ { json: ... } ], { data: ... }, { output: ... }
 * - Normalises case: "JOB" -> "job", "ONSITE (PAN India)" -> "onsite"
 * - Parses numeric strings: "₹6,25,000" -> 625000
 * - Parses comma-separated strings: "Java, Python" -> ["Java", "Python"]
 */
export function normalizeN8nPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  let target: unknown = Array.isArray(raw) && raw.length > 0 ? raw[0] : raw;
  if (!isRecord(target)) return target;
  for (const key of ['json', 'data', 'output', 'body']) {
    if (isRecord(target[key]) && (key === 'json' || !target.title)) target = target[key];
    if (!isRecord(target)) return target;
  }
  const normalized: Record<string, unknown> = { ...target };

  // 1. Normalize type ('JOB', 'job', 'INTERNSHIP', 'internship')
  if (typeof normalized.type === 'string') {
    const t = normalized.type.toLowerCase().trim();
    normalized.type = t.includes('intern') ? 'internship' : 'job';
  } else if (!normalized.type) {
    normalized.type = 'job';
  }

  // 2. Normalize workMode ('ONSITE', 'ONSITE (PAN India)', 'remote', 'hybrid')
  if (typeof normalized.workMode === 'string') {
    const wm = normalized.workMode.toLowerCase();
    if (wm.includes('remote')) normalized.workMode = 'remote';
    else if (wm.includes('hybrid')) normalized.workMode = 'hybrid';
    else normalized.workMode = 'onsite';
  } else {
    normalized.workMode = 'onsite';
  }

  // 3. Helper to parse salary / stipend numeric strings or "unpaid" / "Not Provided"
  const salaryMultiplier = (text: string): number => /\b(crore|cr)\b/i.test(text) ? 10_000_000 : /\b(lakh|lakhs|lac|lacs|lpa)\b/i.test(text) ? 100_000 : /\d\s*k\b|\bthousand\b/i.test(text) ? 1_000 : 1;
  const parseSalary = (val: unknown): number | null => {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (
        lower.includes('unpaid') ||
        lower === '0' ||
        lower === 'nil' ||
        lower === 'none' ||
        lower === 'free'
      ) {
        return 0;
      }
      if (
        lower.includes('not provided') ||
        lower.includes('not specified') ||
        lower.includes('not disclosed') ||
        lower.includes('undisclosed') ||
        lower.includes('competitive') ||
        lower.includes('best in industry') ||
        lower.includes('as per') ||
        lower === 'null' ||
        lower === 'n/a' ||
        lower === '-' ||
        lower === ''
      ) {
        return null;
      }
      const cleaned = val.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num * salaryMultiplier(val);
    }
    return null;
  };

  normalized.salaryMin = parseSalary(normalized.salaryMin);
  normalized.salaryMax = parseSalary(normalized.salaryMax);

  // If a general salary/stipend string was provided instead:
  const generalSalary = normalized.salary || normalized.stipend || normalized.compensation;
  if (generalSalary != null && normalized.salaryMin == null && normalized.salaryMax == null) {
    if (typeof generalSalary === 'number') {
      normalized.salaryMin = generalSalary;
    } else if (typeof generalSalary === 'string') {
      const sLower = generalSalary.trim().toLowerCase();
      if (
        sLower.includes('unpaid') ||
        sLower === '0' ||
        sLower === 'nil' ||
        sLower === 'none' ||
        sLower === 'free'
      ) {
        normalized.salaryMin = 0;
        normalized.salaryMax = 0;
      } else if (
        sLower.includes('not provided') ||
        sLower.includes('not specified') ||
        sLower.includes('not disclosed') ||
        sLower.includes('undisclosed') ||
        sLower.includes('competitive') ||
        sLower.includes('best in industry') ||
        sLower.includes('as per') ||
        sLower === 'null' ||
        sLower === 'n/a' ||
        sLower === '-' ||
        sLower === ''
      ) {
        normalized.salaryMin = null;
        normalized.salaryMax = null;
      } else {
        const matches = generalSalary.match(/[0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?/g);
        if (matches && matches.length >= 2 && matches[0] && matches[1]) {
          const n1 = parseFloat(matches[0].replace(/,/g, ''));
          const n2 = parseFloat(matches[1].replace(/,/g, ''));
          if (!isNaN(n1) && !isNaN(n2)) {
            normalized.salaryMin = Math.min(n1, n2) * salaryMultiplier(generalSalary);
            normalized.salaryMax = Math.max(n1, n2) * salaryMultiplier(generalSalary);
          }
        } else if (matches && matches.length === 1 && matches[0]) {
          const n = parseFloat(matches[0].replace(/,/g, ''));
          if (!isNaN(n)) normalized.salaryMin = n * salaryMultiplier(generalSalary);
        }
      }
    }
  }

  // Fallback: If still null, check if title or description explicitly mentions unpaid/no stipend
  if (normalized.salaryMin == null && normalized.salaryMax == null) {
    const textToCheck = `${typeof normalized.title === 'string' ? normalized.title : ''} ${typeof normalized.description === 'string' ? normalized.description : ''}`.toLowerCase();
    if (/\b(unpaid|no stipend|without stipend|zero stipend|non-paid)\b/i.test(textToCheck)) {
      normalized.salaryMin = 0;
      normalized.salaryMax = 0;
    }
  }

  const parseNum = (val: unknown): number | null => {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  normalized.confidenceScore = parseNum(normalized.confidenceScore);
  if (typeof normalized.confidenceScore === 'number' && normalized.confidenceScore > 0 && normalized.confidenceScore <= 1) {
    normalized.confidenceScore *= 100;
  }

  // 4. Normalize deadline (handle strings like "Not Specified" -> null)
  if (typeof normalized.applicationDeadline === 'string') {
    const d = normalized.applicationDeadline.trim();
    if (
      d.toLowerCase().includes('not') ||
      d.toLowerCase().includes('none') ||
      d.toLowerCase().includes('n/a') ||
      d.length < 4
    ) {
      normalized.applicationDeadline = null;
    }
  }

  // 5. Normalize skills (array or comma-separated string)
  if (typeof normalized.skills === 'string') {
    normalized.skills = normalized.skills
      .split(/[,;\n]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
  } else if (!Array.isArray(normalized.skills)) {
    normalized.skills = [];
  }

  // 6. Normalize eligibility
  if (!normalized.eligibility || typeof normalized.eligibility !== 'object') {
    normalized.eligibility = {};
  }
  const elig: Record<string, unknown> = isRecord(normalized.eligibility) ? { ...normalized.eligibility } : {};

  if (typeof elig.minCgpa === 'string') {
    elig.minCgpa = parseNum(elig.minCgpa);
  }

  if (typeof elig.departmentCodes === 'string') {
    elig.departmentCodes = elig.departmentCodes
      .split(/[,;\n]/)
      .map((d: string) => d.trim().toUpperCase())
      .filter(Boolean);
  } else if (!Array.isArray(elig.departmentCodes)) {
    elig.departmentCodes = [];
  }

  if (typeof elig.allowedBatches === 'string') {
    elig.allowedBatches = elig.allowedBatches
      .split(/[,;\n]/)
      .map((b: string) => parseInt(b.replace(/[^0-9]/g, ''), 10))
      .filter((n: number) => !isNaN(n));
  } else if (Array.isArray(elig.allowedBatches)) {
    elig.allowedBatches = elig.allowedBatches
      .map((b: unknown) => (typeof b === 'number' ? b : parseInt(String(b).replace(/[^0-9]/g, ''), 10)))
      .filter((n: number) => !isNaN(n));
  } else {
    elig.allowedBatches = [];
  }

  normalized.eligibility = elig;

  // 7. Normalize applyUrl & applicationEmail
  const rawApplyUrl = normalized.applyUrl || normalized.applicationLink || normalized.apply_url || normalized.application_link;
  normalized.applyUrl = typeof rawApplyUrl === 'string' && rawApplyUrl.trim() && !['null', 'n/a', 'none', 'not specified'].includes(rawApplyUrl.trim().toLowerCase())
    ? rawApplyUrl.trim()
    : null;

  const rawEmail = normalized.applicationEmail || normalized.contactEmail || normalized.submittingEmail || normalized.application_email || normalized.email;
  normalized.applicationEmail = typeof rawEmail === 'string' && rawEmail.trim() && !['null', 'n/a', 'none', 'not specified'].includes(rawEmail.trim().toLowerCase())
    ? rawEmail.trim()
    : null;

  return normalized;
}

/**
 * Calls the external n8n AI extraction webhook to parse opportunity data
 * from a URL, image flyer, or raw text, then normalises the response into an
 * ExtractedOpportunityDto for the frontend to autofill.
 *
 * The webhook URL is read from `N8N_EXTRACTION_WEBHOOK_URL` in `.env`
 * so it can be rotated without touching code.
 */
export class OpportunityExtractionService {
  async extract(
    sourceType: 'url' | 'text' | 'image' | 'pdf',
    content: string,
    fileName?: string,
    mimeType?: string,
  ): Promise<ExtractedOpportunityDto> {
    const webhookUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
    if (sourceType === 'pdf') {
      content = await extractPdfText(content);
      sourceType = 'text';
    }

    if (!webhookUrl) {
      throw new InternalError(
        'AI Extraction is not configured. Set N8N_EXTRACTION_WEBHOOK_URL in your .env file.',
      );
    }

    logger.info(
      { sourceType, contentLength: content.length, fileName, mimeType },
      'Calling n8n extraction agent',
    );

    let rawResponse: unknown;

    try {
      // Build webhook payload: provide aliases so any n8n node configuration can read the input
      const isBase64Data = sourceType === 'image' && content.includes('base64,');
      const imageBase64 = isBase64Data ? content.split('base64,')[1] : undefined;

      const payload = {
        sourceType,
        content,
        // Common alias properties:
        text: content,
        prompt: content,
        url: sourceType === 'url' ? content : undefined,
        imageUrl: sourceType === 'image' ? content : undefined,
        dataUrl: sourceType === 'image' ? content : undefined,
        imageBase64,
        image: imageBase64,
        fileName,
        mimeType,
        file: {
          name: fileName,
          mimeType,
          data: imageBase64,
          dataUrl: content,
        },
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (env.N8N_WEBHOOK_SECRET) {
        headers['X-Webhook-Secret'] = env.N8N_WEBHOOK_SECRET;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180_000), // 3 minute timeout for AI vision processing
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        logger.error(
          { status: response.status, body: errorText },
          'n8n webhook returned non-OK status',
        );
        throw new InternalError(
          `AI extraction failed (HTTP ${String(response.status)}). The extraction agent may be offline. Please try again.`,
        );
      }

      rawResponse = await response.json();
    } catch (error) {
      if (error instanceof InternalError) throw error;

      logger.error({ err: error }, 'n8n webhook request failed');
      throw new InternalError(
        'Could not reach the AI extraction agent. Please check if your n8n server is running and the webhook URL is correct in .env.',
      );
    }

    logger.info({ rawResponse }, 'Raw n8n extraction response');

    // Normalise arbitrary n8n wrappers & formats
    const normalized = normalizeN8nPayload(rawResponse);
    logger.info({ normalized }, 'Normalised n8n extraction response');

    // Validate against schema
    const parsed = extractedOpportunitySchema.safeParse(normalized);

    if (!parsed.success) {
      logger.error(
        { errors: parsed.error.flatten().fieldErrors, normalized, rawResponse },
        'n8n response did not match expected schema',
      );
      throw new ValidationError(
        'AI extracted data is incomplete or invalid. Please try with a different source or enter details manually.',
        parsed.error.flatten().fieldErrors,
      );
    }

    logger.info(
      { title: parsed.data.title, company: parsed.data.companyName, confidence: parsed.data.confidenceScore },
      'Extraction successful and validated',
    );

    return parsed.data;
  }
}
