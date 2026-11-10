import { describe, expect, it } from 'vitest';
import { parseResumeText } from './resume-parser';

describe('ResumeParser', () => {
  const sampleResume = `
HARISH P
Computer Science Graduate
Ariyankuppam, Pondicherry, India – 605007 | +91 82703 12263 | harish14may05@gmail.com | linkedin.com/in/harish-p
OBJECTIVE
Motivated Computer Science graduate (B.Sc., Pondicherry University, 2025) seeking a software development or technology internship to apply hands-on skills in programming, OS concepts, database management, and AI/ML. Eager to contribute to real-world projects while growing in a professional environment.
EDUCATION
Master of Science — Computer Science (Pursuing) 2025 – 2027
Pondicherry University, Puducherry, India
Bachelor of Science — Computer Science 2022 – 2025
Pondicherry University, Puducherry, India
TECHNICAL SKILLS
Languages: Python, C, C++, Java, JavaScript, HTML & CSS
Databases: MySQL, Oracle (OODBMS), Firebase (Firestore)
Domains: Operating Systems, Web Development, AI/ML, Agentic Operation, AI Agents, AI Automations
Tools & Platforms: Git & GitHub, Linux/Ubuntu, Antigravity, Automation tools (N8N, Make etc..)
PROJECTS
Agentic Workflow Engine — DOE Framework 2025
Python | Multi-LLM (Claude, Groq, Gemini) | MCP Protocol | SMTP | Playwright | openpyxl
● Designed and built a custom DOE (Directives–Orchestration–Execution) architecture that transforms a standard LLM chatbot into a specialized, task-specific automation agent.
● Directives layer uses plain-English '.md' rule files to define agent behavior; Orchestration layer reads and interprets these rules; Execution layer runs Python scripts to carry out real-world tasks.
● Integrated multiple LLMs (Claude, Groq, Gemini and others) within the orchestration stage, enabling flexible model selection per workflow task.
● Built custom MCP servers, including a WhatsApp MCP Server enabling automated message delivery through agent-triggered workflows.
● Developed a Client Onboarding Email Agent that detects new client registrations and sends personalized scheduling emails based on client profile data.
● Built a Jobs Scraper Agent that scrapes listings across Upwork, LinkedIn, and other platforms, auto-generates tailored proposals, and exports results to a structured Excel report.
CPU Scheduling Simulator — Preemption/Non-preemption 2025
● Implemented 6+ algorithms in C for CPU scheduling (FCFS, SJF, Round Robin, Priority).
● Debugged and resolved concurrency issues in Round Robin queue and VLA memory management under Linux.
Face Detection Web Platform 2024
Next.js 15 | React 19 | TypeScript | face-api.js | NextAuth.js | Firebase | Tailwind CSS | shadcn/ui
● Built a real-time face detection web application using face-api.js with TensorFlow.js models, enabling facial detection, landmark tracking, and face matching directly in the browser.
● Implemented secure user authentication with NextAuth.js and protected routes via middleware, storing user data and detection history in Firebase Firestore.
● Designed a responsive UI with shadcn/ui components and Tailwind CSS, supporting image upload, live webcam capture, and real-time face analysis with confidence scoring.
EXPERIENCE
Mobile App & Website Tester 2024
Freelance / Voluntary
● Improved user experience by analyzing performance metrics and implementing UX improvements.
● Conducted thorough functional and regression testing, identifying and documenting software defects.
● Collaborated with developers to verify bug fixes and ensure quality releases.
CERTIFICATIONS
● AWS AI Practitioner Challenge — Udacity Verified Certificate of Course Completion (June 2026) — View credential
● English Senior Typewriting — 65 WPM certified
ACHIEVEMENTS & ACTIVITIES
● Explored multi-provider API key management strategies for AI tools (Groq, Mistral, Gemini, OpenRouter, Nvidia NIM) within free-tier constraints.
● Actively engaged in coursework across LLM, Automation, AI Development/Integration
LANGUAGES & SOFT SKILLS
Languages: Tamil (Native), English (C1 Advanced, CEFR)
Soft Skills: Fast learner, Problem solving, Self-motivated, Team collaboration, Time management
  `;

  it('correctly parses candidate personal info and contact details', () => {
    const res = parseResumeText(sampleResume, undefined, 'harish_resume.pdf');
    expect(res.fullName).toBe('HARISH P');
    expect(res.email).toBe('harish14may05@gmail.com');
    expect(res.phone).toBe('+91 82703 12263');
    expect(res.location).toContain('Pondicherry');
    expect(res.linkedinUrl).toBe('https://linkedin.com/in/harish-p');
    expect(res.summary).toContain('Motivated Computer Science graduate');
    expect(res.isUploaded).toBe(true);
    expect(res.uploadedFileName).toBe('harish_resume.pdf');
  });

  it('correctly parses education entries with degrees and university', () => {
    const res = parseResumeText(sampleResume);
    expect(res.education.length).toBe(2);
    expect(res.education[0]?.degree).toBe('Master of Science');
    expect(res.education[0]?.fieldOfStudy).toBe('Computer Science');
    expect(res.education[0]?.institution).toContain('Pondicherry University');
    expect(res.education[0]?.isCurrent).toBe(true);

    expect(res.education[1]?.degree).toBe('Bachelor of Science');
    expect(res.education[1]?.institution).toContain('Pondicherry University');
  });

  it('correctly parses technical skills from categories and keywords', () => {
    const res = parseResumeText(sampleResume);
    expect(res.skills).toContain('Python');
    expect(res.skills).toContain('MySQL');
    expect(res.skills).toContain('Git & GitHub');
    expect(res.skills).toContain('AI/ML');
  });

  it('correctly parses projects with titles, technologies, and bullet highlights', () => {
    const res = parseResumeText(sampleResume);
    expect(res.projects.length).toBe(3);

    const doeProj = res.projects[0];
    expect(doeProj?.title).toContain('Agentic Workflow Engine — DOE Framework');
    expect(doeProj?.technologies).toContain('Python');
    expect(doeProj?.technologies).toContain('Playwright');
    expect(doeProj?.highlights.length).toBe(6);

    const faceProj = res.projects[2];
    expect(faceProj?.title).toContain('Face Detection Web Platform');
    expect(faceProj?.technologies).toContain('TypeScript');
    expect(faceProj?.highlights.length).toBe(3);
  });

  it('correctly parses experience and highlights', () => {
    const res = parseResumeText(sampleResume);
    expect(res.experience.length).toBe(1);
    expect(res.experience[0]?.position).toContain('Mobile App & Website Tester');
    expect(res.experience[0]?.company).toContain('Freelance / Voluntary');
    expect(res.experience[0]?.highlights.length).toBe(3);
  });

  it('correctly parses certifications and achievements', () => {
    const res = parseResumeText(sampleResume);
    expect(res.certifications.length).toBe(2);
    expect(res.certifications[0]?.name).toContain('AWS AI Practitioner Challenge');
    expect(res.certifications[0]?.issuer).toContain('Udacity');

    expect(res.achievements.length).toBe(2);
    expect(res.achievements[0]?.title).toContain('Explored multi-provider API key management');
  });

  it('correctly captures custom/additional sections such as LANGUAGES & SOFT SKILLS', () => {
    const res = parseResumeText(sampleResume);
    expect(res.customSections).toBeDefined();
    expect(res.customSections.length).toBeGreaterThanOrEqual(1);

    const langSection = res.customSections.find((s) => /languages/i.test(s.title));
    expect(langSection).toBeDefined();
    expect(langSection?.title).toBe('LANGUAGES & SOFT SKILLS');
    expect(langSection?.items.length).toBe(2);
    expect(langSection?.items[0]).toContain('Tamil (Native)');
    expect(langSection?.items[1]).toContain('Fast learner');
  });
});

