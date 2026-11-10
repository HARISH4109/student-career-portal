import type {
  EducationEntry,
  ExperienceEntry,
  ResumeAchievementEntry,
  ResumeCertificationEntry,
  ResumeContent,
  ResumeCustomSection,
  ResumeProjectEntry,
} from '@career-portal/shared-types';

/**
 * Robust, production-grade parser that converts raw extracted resume text (e.g. from PDF/TXT)
 * into a fully structured ResumeContent model with all original sections and custom sections.
 */
export function parseResumeText(
  rawText: string,
  fallbackStudent?: { user?: { fullName?: string | null; email?: string | null; phone?: string | null } | null },
  fileName?: string,
): ResumeContent {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // ── 1. Contact / Header Info Extraction ──────────────────────────────────
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : (fallbackStudent?.user?.email || 'student@university.edu');

  // Indian (+91 XXXXX XXXXX / 10 digits) and International phone regex
  const phoneMatch = rawText.match(
    /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{4,5}|\+?\d{10,13}/,
  );
  const phone = phoneMatch ? phoneMatch[0].trim() : (fallbackStudent?.user?.phone || '');

  // LinkedIn, GitHub, Portfolio
  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_.-]+/i);
  let linkedinUrl = linkedinMatch ? linkedinMatch[0] : '';
  if (linkedinUrl && !linkedinUrl.startsWith('http')) {
    linkedinUrl = `https://${linkedinUrl}`;
  }

  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_.-]+/i);
  let githubUrl = githubMatch ? githubMatch[0] : '';
  if (githubUrl && !githubUrl.startsWith('http')) {
    githubUrl = `https://${githubUrl}`;
  }

  // Location heuristic: look in the header lines for city/state/country/pincode
  let location = '';
  const headerLines = lines.slice(0, 6);
  for (const hLine of headerLines) {
    const parts = hLine.split(/[|•·]/).map((p) => p.trim());
    for (const part of parts) {
      if (
        part.includes('@') ||
        part.includes('linkedin.com') ||
        part.includes('github.com') ||
        /^\+?\d[\d\s-]{8,}\d$/.test(part)
      ) {
        continue;
      }
      // Check for location indicators (pincode, country, comma-separated place)
      if (
        /\b\d{6}\b/.test(part) ||
        /\b(india|usa|uk|singapore|australia|canada|germany|pondicherry|puducherry|bangalore|bengaluru|chennai|hyderabad|mumbai|delhi|pune|noida)\b/i.test(part) ||
        (part.includes(',') && part.length < 60)
      ) {
        location = part;
        break;
      }
    }
    if (location) break;
  }

  // Candidate Name: first line that is short, not an email, not a URL
  let fullName = fallbackStudent?.user?.fullName || '';
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    if (
      line &&
      line.length < 50 &&
      !line.includes('@') &&
      !line.includes('|') &&
      !line.includes('http') &&
      !/^\+?\d/.test(line) &&
      !/^(objective|summary|education|experience|skills|projects)/i.test(line)
    ) {
      fullName = line;
      break;
    }
  }
  if (!fullName) fullName = 'Student Name';

  // ── 2. Segment Raw Text into Sections by Headings ────────────────────────
  const sectionKeywords = [
    { type: 'summary', regex: /^(objective|summary|professional summary|career objective|about me|profile)$/i },
    { type: 'education', regex: /^(education|academic background|academics|qualifications)$/i },
    { type: 'skills', regex: /^(technical skills|skills|core competencies|areas of expertise|technologies)$/i },
    { type: 'projects', regex: /^(projects|academic projects|key projects|personal projects)$/i },
    { type: 'experience', regex: /^(experience|work experience|professional experience|employment|internships)$/i },
    { type: 'certifications', regex: /^(certifications|certificates|licenses|certifications & licenses)$/i },
    { type: 'achievements', regex: /^(achievements|achievements & activities|honors & awards|awards|honors)$/i },
  ];

  interface SectionBlock {
    title: string;
    type: string; // 'summary' | 'education' | 'skills' | 'projects' | 'experience' | 'certifications' | 'achievements' | 'custom'
    lines: string[];
  }

  const sections: SectionBlock[] = [];
  let currentSection: SectionBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detect if this line is a Section Header:
    // It's short, doesn't end with a period, and matches known patterns or is UPPERCASE
    const isCleanHeading =
      line.length < 50 &&
      !line.startsWith('●') &&
      !line.startsWith('•') &&
      !line.startsWith('-') &&
      !line.startsWith('*') &&
      !line.includes('|') &&
      !line.endsWith('.');

    let detectedType: string | null = null;
    let matchedTitle = line;

    if (isCleanHeading) {
      for (const kw of sectionKeywords) {
        if (kw.regex.test(line)) {
          detectedType = kw.type;
          break;
        }
      }

      // Check if it's an unrecognized Custom Section Header (e.g. "LANGUAGES & SOFT SKILLS", "PUBLICATIONS")
      if (!detectedType && i > 2) {
        // If it's all uppercase or words with & (e.g. "LANGUAGES & SOFT SKILLS", "VOLUNTEERING")
        if (
          (/^[A-Z0-9\s&/-]{3,45}$/.test(line) && line.replace(/[^A-Z]/g, '').length >= 3) ||
          /^(languages|soft skills|publications|volunteering|interests|extracurricular)/i.test(line)
        ) {
          detectedType = 'custom';
          matchedTitle = line;
        }
      }
    }

    if (detectedType) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: matchedTitle,
        type: detectedType,
        lines: [],
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // ── 3. Parse Each Section Specifically ───────────────────────────────────

  // A. Summary / Objective
  let summary = '';
  const summarySec = sections.find((s) => s.type === 'summary');
  if (summarySec && summarySec.lines.length > 0) {
    summary = summarySec.lines
      .map((l) => l.replace(/^(objective|summary):?\s*/i, ''))
      .join(' ')
      .trim();
  }

  // B. Education
  const education: EducationEntry[] = [];
  const eduSec = sections.find((s) => s.type === 'education');
  if (eduSec) {
    const eduLines = eduSec.lines;
    let currentEdu: Partial<EducationEntry> | null = null;

    for (const line of eduLines) {
      // Check if line contains a degree or degree keywords
      const isDegreeLine = /\b(master|bachelor|b\.sc|m\.sc|b\.tech|m\.tech|b\.e|m\.e|bca|mca|ph\.d|diploma|higher secondary|hsc|sslc)\b/i.test(
        line,
      );

      // Check for date range
      const yearMatch = line.match(/\b(19|20)\d{2}\s*[-–—to]+\s*((19|20)\d{2}|present|pursuing|current)\b|\b(19|20)\d{2}\b/i);

      if (isDegreeLine || (yearMatch && (!currentEdu || currentEdu.institution))) {
        if (currentEdu && (currentEdu.degree || currentEdu.institution)) {
          education.push({
            institution: currentEdu.institution || 'University',
            degree: currentEdu.degree || 'Degree',
            fieldOfStudy: currentEdu.fieldOfStudy || '',
            startDate: currentEdu.startDate || '',
            endDate: currentEdu.endDate || '',
            isCurrent: currentEdu.isCurrent || false,
            grade: currentEdu.grade || '',
          });
        }

        const isCurrent = /\b(pursuing|present|current)\b/i.test(line);
        let startDate = '';
        let endDate = '';
        if (yearMatch) {
          const years = yearMatch[0].match(/\b(19|20)\d{2}\b/g);
          if (years && years[0]) startDate = years[0];
          if (years && years[1]) endDate = years[1];
          else if (isCurrent) endDate = 'Present';
        }

        // Clean degree and field of study
        let cleanDegree = line.replace(yearMatch ? yearMatch[0] : '', '').trim();
        cleanDegree = cleanDegree.replace(/\((pursuing|present|current)\)/i, '').trim();

        let degree = cleanDegree;
        let fieldOfStudy = '';
        if (cleanDegree.includes('—')) {
          const parts = cleanDegree.split('—');
          degree = parts[0]?.trim() || '';
          fieldOfStudy = parts[1]?.trim() || '';
        } else if (cleanDegree.includes('-')) {
          const parts = cleanDegree.split('-');
          degree = parts[0]?.trim() || '';
          fieldOfStudy = parts[1]?.trim() || '';
        } else if (cleanDegree.toLowerCase().includes(' in ')) {
          const parts = cleanDegree.split(/ in /i);
          degree = parts[0]?.trim() || '';
          fieldOfStudy = parts[1]?.trim() || '';
        }

        currentEdu = {
          degree: degree || 'Degree',
          fieldOfStudy,
          startDate,
          endDate,
          isCurrent,
        };
      } else if (currentEdu && !currentEdu.institution) {
        // This line is likely the institution name and location
        currentEdu.institution = line;
      } else if (currentEdu) {
        // Grade / description / additional info
        if (/\b(cgpa|gpa|percentage|grade|%)\b/i.test(line)) {
          currentEdu.grade = line;
        } else if (!currentEdu.institution) {
          currentEdu.institution = line;
        }
      }
    }

    if (currentEdu && (currentEdu.degree || currentEdu.institution)) {
      education.push({
        institution: currentEdu.institution || 'University',
        degree: currentEdu.degree || 'Degree',
        fieldOfStudy: currentEdu.fieldOfStudy || '',
        startDate: currentEdu.startDate || '',
        endDate: currentEdu.endDate || '',
        isCurrent: currentEdu.isCurrent || false,
        grade: currentEdu.grade || '',
      });
    }
  }

  // C. Skills
  const skillsSet = new Set<string>();
  const skillsSec = sections.find((s) => s.type === 'skills');
  if (skillsSec) {
    for (const line of skillsSec.lines) {
      // Line format often: "Languages: Python, C, C++, Java"
      const contentPart = line.includes(':') ? line.substring(line.indexOf(':') + 1) : line;
      const tokens = contentPart.split(/[,;|•·]/).map((t) => t.trim()).filter(Boolean);
      for (const token of tokens) {
        const clean = token.replace(/^\(.*\)$/, '').trim();
        if (clean && clean.length < 40 && !clean.toLowerCase().startsWith('etc')) {
          skillsSet.add(clean);
        }
      }
    }
  }

  // Also scan common technical keywords from the full text
  const catalog = [
    'Python', 'C', 'C++', 'Java', 'JavaScript', 'TypeScript', 'HTML & CSS', 'HTML', 'CSS',
    'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'Tailwind CSS', 'Tailwind',
    'MySQL', 'PostgreSQL', 'Oracle', 'Firebase', 'MongoDB', 'Redis', 'SQLite',
    'Git & GitHub', 'Git', 'GitHub', 'Linux', 'Ubuntu', 'Docker', 'Kubernetes', 'AWS', 'GCP',
    'AI/ML', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Agentic Operation', 'AI Agents',
    'N8N', 'Make', 'Antigravity', 'REST API', 'GraphQL', 'Playwright', 'FastAPI',
  ];
  const textLower = rawText.toLowerCase();
  for (const skill of catalog) {
    const rx = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (rx.test(textLower)) {
      skillsSet.add(skill);
    }
  }
  const skills = Array.from(skillsSet);

  // D. Projects
  const projects: ResumeProjectEntry[] = [];
  const projSec = sections.find((s) => s.type === 'projects');
  if (projSec) {
    let currentProj: Partial<ResumeProjectEntry> | null = null;

    for (const line of projSec.lines) {
      const isBullet = /^[●•\-*]/.test(line);
      const isTechLine = line.includes('|') && !isBullet;
      const isHeaderLine = !isBullet && !isTechLine && line.length < 90 && !line.endsWith('.');

      if (isHeaderLine) {
        if (currentProj && currentProj.title) {
          projects.push({
            title: currentProj.title,
            technologies: currentProj.technologies || [],
            highlights: currentProj.highlights || [],
            description: currentProj.description || currentProj.highlights?.[0] || '',
          });
        }

        // Title and year
        const yearMatch = line.match(/\b(19|20)\d{2}\b/);
        const title = line.replace(yearMatch ? yearMatch[0] : '', '').trim();

        currentProj = {
          title: title || line,
          technologies: [],
          highlights: [],
          description: '',
        };
      } else if (isTechLine && currentProj) {
        const techs = line.split('|').map((t) => t.trim()).filter(Boolean);
        currentProj.technologies = [...(currentProj.technologies || []), ...techs];
      } else if (isBullet && currentProj) {
        const cleanBullet = line.replace(/^[●•\-*]\s*/, '').trim();
        currentProj.highlights = [...(currentProj.highlights || []), cleanBullet];
        if (!currentProj.description) {
          currentProj.description = cleanBullet;
        }
      } else if (currentProj) {
        // Additional description line
        if (currentProj.highlights && currentProj.highlights.length > 0) {
          const lastIdx = currentProj.highlights.length - 1;
          currentProj.highlights[lastIdx] = `${currentProj.highlights[lastIdx]} ${line}`;
        } else {
          currentProj.description = `${currentProj.description || ''} ${line}`.trim();
        }
      }
    }

    if (currentProj && currentProj.title) {
      projects.push({
        title: currentProj.title,
        technologies: currentProj.technologies || [],
        highlights: currentProj.highlights || [],
        description: currentProj.description || currentProj.highlights?.[0] || '',
      });
    }
  }

  // E. Experience
  const experience: ExperienceEntry[] = [];
  const expSec = sections.find((s) => s.type === 'experience');
  if (expSec) {
    let currentExp: Partial<ExperienceEntry> | null = null;

    for (const line of expSec.lines) {
      const isBullet = /^[●•\-*]/.test(line);
      const isHeaderLine = !isBullet && line.length < 80 && !line.endsWith('.');

      if (isHeaderLine && !currentExp) {
        // First line: Role / Year
        const yearMatch = line.match(/\b(19|20)\d{2}\b/);
        const role = line.replace(yearMatch ? yearMatch[0] : '', '').trim();

        currentExp = {
          position: role || line,
          startDate: yearMatch ? yearMatch[0] : '',
          highlights: [],
        };
      } else if (isHeaderLine && currentExp && !currentExp.company) {
        // Second line: Company / Nature (e.g. "Freelance / Voluntary")
        currentExp.company = line;
      } else if (isHeaderLine && currentExp && currentExp.company) {
        // Next experience entry begins
        experience.push({
          isCurrent: currentExp.isCurrent ?? false,
          position: currentExp.position || 'Role',
          company: currentExp.company || 'Company',
          startDate: currentExp.startDate || '',
          highlights: currentExp.highlights || [],
          description: currentExp.highlights?.[0] || '',
        });

        const yearMatch = line.match(/\b(19|20)\d{2}\b/);
        const role = line.replace(yearMatch ? yearMatch[0] : '', '').trim();
        currentExp = {
          position: role || line,
          startDate: yearMatch ? yearMatch[0] : '',
          highlights: [],
        };
      } else if (isBullet && currentExp) {
        const cleanBullet = line.replace(/^[●•\-*]\s*/, '').trim();
        currentExp.highlights = [...(currentExp.highlights || []), cleanBullet];
        if (!currentExp.description) currentExp.description = cleanBullet;
      }
    }

    if (currentExp && currentExp.position) {
      experience.push({
        isCurrent: currentExp.isCurrent ?? false,
        position: currentExp.position || 'Role',
        company: currentExp.company || 'Organization',
        startDate: currentExp.startDate || '',
        highlights: currentExp.highlights || [],
        description: currentExp.highlights?.[0] || '',
      });
    }
  }

  // F. Certifications
  const certifications: ResumeCertificationEntry[] = [];
  const certSec = sections.find((s) => s.type === 'certifications');
  if (certSec) {
    for (const line of certSec.lines) {
      const cleanLine = line.replace(/^[●•\-*]\s*/, '').trim();
      if (!cleanLine) continue;

      let name = cleanLine;
      let issuer = 'Certified';
      let issueDate = '';

      if (cleanLine.includes('—') || cleanLine.includes(' - ')) {
        const parts = cleanLine.split(/[—\-]/).map((p) => p.trim());
        name = parts[0] || cleanLine;
        if (parts[1]) issuer = parts[1];
      }

      const dateMatch = cleanLine.match(/\(([^)]*(?:20\d{2}|19\d{2})[^)]*)\)/);
      if (dateMatch) {
        issueDate = dateMatch[1]?.trim() ?? '';
        issuer = issuer.replace(dateMatch[0], '').trim();
      }

      certifications.push({
        name,
        issuer: issuer.replace(/View credential/i, '').trim() || 'Verified Issuer',
        issueDate,
      });
    }
  }

  // G. Achievements & Activities
  const achievements: ResumeAchievementEntry[] = [];
  const achSec = sections.find((s) => s.type === 'achievements');
  if (achSec) {
    for (const line of achSec.lines) {
      const isBullet = /^[●•\-*]/.test(line);
      const cleanLine = line.replace(/^[●•\-*]\s*/, '').trim();
      if (!cleanLine) continue;

      if (!isBullet && achievements.length > 0) {
        const last = achievements[achievements.length - 1];
        if (last) {
          last.title = `${last.title} ${cleanLine}`;
          last.description = `${last.description || last.title} ${cleanLine}`;
        }
      } else {
        achievements.push({
          title: cleanLine,
          description: cleanLine,
        });
      }
    }
  }

  // H. Custom & Extra Sections (e.g. "LANGUAGES & SOFT SKILLS", "PUBLICATIONS", etc.)
  const customSections: ResumeCustomSection[] = [];
  const customBlocks = sections.filter((s) => s.type === 'custom');
  for (const block of customBlocks) {
    const items = block.lines
      .map((l) => l.replace(/^[●•\-*]\s*/, '').trim())
      .filter(Boolean);

    customSections.push({
      title: block.title,
      content: items.join('\n'),
      items,
    });
  }

  return {
    fullName,
    email,
    phone,
    location,
    linkedinUrl,
    githubUrl,
    portfolioUrl: '',
    summary,
    education,
    experience,
    skills,
    projects,
    certifications,
    achievements,
    customSections,
    isUploaded: true,
    uploadedFileName: fileName || 'Uploaded Resume',
  };
}
