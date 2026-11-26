import type { ResumeContent } from '@career-portal/shared-types';
import { safeHref } from '@/shared/lib/safe-url';

/**
 * Escapes HTML characters to prevent XSS in print preview window.
 */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates a clean, print-optimized HTML string for any resume content.
 */
export function generateResumeHtml(
  title: string,
  content: ResumeContent,
  templateId = 'modern',
): string {
  const isClassic = templateId === 'classic';
  const isTechnical = templateId === 'technical';
  const isModern = !isClassic && !isTechnical;

  const accentColor = isClassic ? '#1e3a8a' : isTechnical ? '#0d9488' : '#2563eb';
  const headingFont = isClassic
    ? "'Georgia', 'Times New Roman', serif"
    : isTechnical
      ? "'Courier New', Courier, monospace"
      : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const bodyFont = isClassic
    ? "'Georgia', 'Times New Roman', serif"
    : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(content.fullName || title)} - Resume</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${bodyFont};
      font-size: 10.5pt;
      line-height: 1.45;
      color: #1e293b;
      background: #ffffff;
      padding: 0;
    }
    a {
      color: ${accentColor};
      text-decoration: none;
    }
    .header {
      text-align: ${isTechnical ? 'left' : 'center'};
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: ${isClassic ? '2.5px double #0f172a' : isTechnical ? '2.5px solid #0d9488' : '2px solid #e2e8f0'};
    }
    .header h1 {
      font-family: ${headingFont};
      font-size: ${isClassic ? '22pt' : isTechnical ? '20pt' : '23pt'};
      font-weight: 700;
      color: #0f172a;
      letter-spacing: ${isClassic ? '1px' : isTechnical ? '0px' : '-0.5px'};
      text-transform: ${isClassic ? 'uppercase' : 'none'};
      margin-bottom: 6px;
    }
    .contact-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: ${isTechnical ? 'flex-start' : 'center'};
      gap: 10px;
      font-size: 9pt;
      color: #475569;
      ${isTechnical ? "font-family: 'Courier New', Courier, monospace;" : ''}
    }
    .contact-row span:not(:last-child)::after {
      content: " ·";
      color: #94a3b8;
    }
    .section {
      margin-bottom: 13px;
    }
    .section-title {
      font-family: ${headingFont};
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: ${isClassic ? '1.5px' : '0.8px'};
      color: ${accentColor};
      border-bottom: ${isTechnical ? '2px solid #0d9488' : isModern ? '2px solid #bfdbfe' : '1px solid #cbd5e1'};
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .entry {
      margin-bottom: 9px;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .entry-title {
      font-weight: 600;
      font-size: 10.5pt;
      color: #0f172a;
      ${isTechnical ? "font-family: 'Courier New', Courier, monospace;" : ''}
    }
    .entry-subtitle {
      font-size: 9.5pt;
      color: #475569;
      ${isClassic ? 'font-style: italic;' : ''}
    }
    .entry-date {
      font-size: 9pt;
      color: #64748b;
      white-space: nowrap;
      ${isClassic ? 'font-style: italic;' : isTechnical ? "font-family: 'Courier New', Courier, monospace;" : ''}
    }
    .entry-desc {
      font-size: 9.5pt;
      color: #334155;
      margin-top: 2px;
    }
    ul.highlights {
      margin-top: 3px;
      padding-left: 18px;
      font-size: 9.5pt;
      color: #334155;
    }
    ul.highlights li {
      margin-bottom: 2px;
    }
    .skills-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-pill {
      font-size: 9pt;
      ${isTechnical
        ? "font-family: 'Courier New', Courier, monospace; background: #f0fdfa; color: #115e59; border: 1px solid #99f6e4; padding: 2px 7px; border-radius: 3px; font-weight: 600;"
        : isClassic
          ? "background: #f8fafc; color: #1e293b; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 2px; font-family: 'Georgia', serif;"
          : "background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; padding: 2px 10px; border-radius: 9999px; font-weight: 500;"
      }
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(content.fullName || 'Resume')}</h1>
    <div class="contact-row">
      ${content.email ? `<span>${escapeHtml(content.email)}</span>` : ''}
      ${content.phone ? `<span>${escapeHtml(content.phone)}</span>` : ''}
      ${content.location ? `<span>${escapeHtml(content.location)}</span>` : ''}
      ${safeHref(content.linkedinUrl) ? `<span><a href="${escapeHtml(safeHref(content.linkedinUrl))}">LinkedIn</a></span>` : ''}
      ${safeHref(content.githubUrl) ? `<span><a href="${escapeHtml(safeHref(content.githubUrl))}">GitHub</a></span>` : ''}
      ${safeHref(content.portfolioUrl) ? `<span><a href="${escapeHtml(safeHref(content.portfolioUrl))}">Portfolio</a></span>` : ''}
    </div>
  </div>

  ${content.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="entry-desc">${escapeHtml(content.summary)}</div>
  </div>
  ` : ''}

  
  <div class="section">
    <div class="section-title">Education</div>
    ${content.education.map((edu) => `
      <div class="entry">
        <div class="entry-header">
          <div>
            <span class="entry-title">${escapeHtml(edu.institution || 'University')}</span>
            <div class="entry-subtitle">${escapeHtml(edu.degree || '')}${edu.fieldOfStudy ? ` in ${escapeHtml(edu.fieldOfStudy)}` : ''}</div>
          </div>
          <div class="entry-date">
            ${escapeHtml(edu.startDate || '')} ${edu.startDate && (edu.endDate || edu.isCurrent) ? '–' : ''} ${edu.isCurrent ? 'Present' : escapeHtml(edu.endDate || '')}
            ${edu.grade ? `<br><span style="font-weight:600;color:#0f172a;">${escapeHtml(edu.grade)}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('')}
  </div>
  

  
  <div class="section">
    <div class="section-title">Experience</div>
    ${content.experience.map((exp) => `
      <div class="entry">
        <div class="entry-header">
          <div>
            <span class="entry-title">${escapeHtml(exp.position || 'Role')}</span>
            <span class="entry-subtitle"> · ${escapeHtml(exp.company || 'Company')}${exp.location ? ` (${escapeHtml(exp.location)})` : ''}</span>
          </div>
          <div class="entry-date">
            ${escapeHtml(exp.startDate || '')} ${exp.startDate && (exp.endDate || exp.isCurrent) ? '–' : ''} ${exp.isCurrent ? 'Present' : escapeHtml(exp.endDate || '')}
          </div>
        </div>
        ${exp.description ? `<div class="entry-desc">${escapeHtml(exp.description)}</div>` : ''}
        
          <ul class="highlights">
            ${exp.highlights.filter(Boolean).map((h) => `<li>${escapeHtml(h)}</li>`).join('')}
          </ul>
        
      </div>
    `).join('')}
  </div>
  

  
  <div class="section">
    <div class="section-title">Projects</div>
    ${content.projects.map((proj) => `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">${escapeHtml(proj.title || 'Project')}</span>
          
            <span style="font-size: 8.5pt; font-family: monospace; color: #64748b;">
              [${escapeHtml(proj.technologies.join(', '))}]
            </span>
          
        </div>
        ${proj.description ? `<div class="entry-desc">${escapeHtml(proj.description)}</div>` : ''}
        
          <ul class="highlights">
            ${proj.highlights.filter(Boolean).map((h) => `<li>${escapeHtml(h)}</li>`).join('')}
          </ul>
        
        ${proj.link || proj.githubUrl ? `
          <div style="font-size: 8.5pt; margin-top: 2px;">
            ${safeHref(proj.link) ? `<a href="${escapeHtml(safeHref(proj.link))}">Live Demo ↗</a> ` : ''}
            ${safeHref(proj.githubUrl) ? `<a href="${escapeHtml(safeHref(proj.githubUrl))}">GitHub ↗</a>` : ''}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
  

  
  <div class="section">
    <div class="section-title">Technical Skills</div>
    <div class="skills-pills">
      ${content.skills.map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('')}
    </div>
  </div>
  

  
  <div class="section">
    <div class="section-title">Certifications</div>
    <ul class="highlights">
      ${content.certifications.map((c) => `
        <li>
          <strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.issuer || '')}
          ${c.issueDate ? ` (${escapeHtml(c.issueDate)})` : ''}
          ${safeHref(c.credentialUrl) ? ` <a href="${escapeHtml(safeHref(c.credentialUrl))}">[Verify]</a>` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
  

  
  <div class="section">
    <div class="section-title">Honors & Achievements</div>
    <ul class="highlights">
      ${content.achievements.map((a) => `
        <li>
          <strong>${escapeHtml(a.title)}</strong>${a.date ? ` (${escapeHtml(a.date)})` : ''}
          ${a.description ? ` — ${escapeHtml(a.description)}` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
  
  ${content.customSections && content.customSections.length > 0 ? content.customSections.map((cs) => `
  <div class="section">
    <div class="section-title">${isTechnical ? '&gt; ' : ''}${escapeHtml(cs.title)}</div>
    ${cs.items && cs.items.length > 0 ? `
      <ul class="highlights">
        ${cs.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    ` : `
      <div class="entry-desc" style="white-space: pre-line;">${escapeHtml(cs.content)}</div>
    `}
  </div>
  `).join('') : ''}
</body>
</html>`;
}

/**
 * Triggers the browser's native print engine with the resume document.
 * In all modern browsers, this offers a direct 1-click "Save as PDF" option.
 */
export function downloadResumePdf(resume: {
  title: string;
  content: ResumeContent;
  templateId?: string;
}): void {
  const html = generateResumeHtml(resume.title, resume.content, resume.templateId || 'modern');

  // Use an invisible iframe so the current page state is preserved
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: open print window directly
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.documentElement.replaceWith(new DOMParser().parseFromString(html, 'text/html').documentElement);
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 300);
    }
    return;
  }

  doc.documentElement.replaceWith(new DOMParser().parseFromString(html, 'text/html').documentElement);

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Clean up iframe after print dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 350);
}

/**
 * Exports the structured resume JSON for backup or re-importing.
 */
export function downloadResumeJson(resume: {
  title: string;
  content: ResumeContent;
  templateId?: string;
  version?: number;
}): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(resume, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const cleanTitle = (resume.title || 'resume').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadAnchor.setAttribute('download', `${cleanTitle}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
