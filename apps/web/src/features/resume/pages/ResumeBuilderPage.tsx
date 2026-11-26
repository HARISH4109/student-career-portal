import type {
  EducationEntry,
  ExperienceEntry,
  ResumeAchievementEntry,
  ResumeCertificationEntry,
  ResumeContent,
  ResumeProjectEntry,
} from '@career-portal/shared-types';
import { safeHref } from '@/shared/lib/safe-url';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  GraduationCap,
  Layers,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';



import {
  useAnalyzeResume,
  useCreateResume,
  useEnhanceResumeText,
  useResume,
  useUpdateResume,
} from '../api/resume-api';
import { ResumeAnalysisModal } from '../components/ResumeAnalysisModal';
import { downloadResumeJson, downloadResumePdf } from '../utils/resume-exporter';

import { useSkillsCatalog, useStudentProfile } from '@/features/student/api/student-api';
import { ApiClientError } from '@/shared/lib/api-client';

function cleanAIText(text: string | null | undefined): string {
  if (!text) return '';
  let cleaned = text.trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json|markdown)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // Strip json markers
  cleaned = cleaned.replace(/^\{?\s*["']?enhancedText["']?\s*:\s*["']?/i, '');
  cleaned = cleaned.replace(/^["']?enhancedText["']?\s*:\s*["']?/i, '');
  // Strip conversational preambles
  cleaned = cleaned.replace(/^(?:here\s+(?:is|are)\s+(?:the\s+)?(?:enhanced|improved|rewritten|revised|updated)?\s*(?:text|version|description|summary|bullet points|bullets)?\s*:?\s*)/i, '');
  cleaned = cleaned.replace(/^(?:enhanced|improved|rewritten|revised|updated)\s*(?:text|version|description|summary)?\s*:?\s*/i, '');
  cleaned = cleaned.replace(/^(?:here\s+it\s+is\s*:?\s*)/i, '');
  cleaned = cleaned.replace(/^(?:description|overview|summary|highlights)\s*:\s*/i, '');
  // Strip trailing JSON artifacts
  cleaned = cleaned.replace(/["']\s*,\s*["']?(?:bulletPoints|keyChanges)["']?[\s\S]*$/i, '');
  cleaned = cleaned.replace(/["']\s*\}\s*$/, '');
  cleaned = cleaned.replace(/\s*\}\s*$/, '');
  // Strip enclosing quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Strip leading bullet character if in a paragraph
  cleaned = cleaned.replace(/^[•*\s-]+/, '');
  return cleaned.trim();
}

export function ResumeBuilderPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const { data: existingResume, isLoading: resumeLoading } = useResume(id || '');
  const { data: studentProfile } = useStudentProfile();
  const { data: catalogSkills } = useSkillsCatalog();
  const createMutation = useCreateResume();
  const updateMutation = useUpdateResume();
  const analyzeMutation = useAnalyzeResume();
  const enhanceTextMutation = useEnhanceResumeText();

  const [title, setTitle] = useState('My Resume');
  const [templateId, setTemplateId] = useState('modern');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enhancingKey, setEnhancingKey] = useState<string | null>(null);
  const [enhanceNotification, setEnhanceNotification] = useState<{ id: string; message: string } | null>(null);

  // Resume Content State
  const [content, setContent] = useState<ResumeContent>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    summary: '',
    education: [],
    experience: [],
    skills: [],
    projects: [],
    certifications: [],
    achievements: [],
    customSections: [],
  });

  const [activeSection, setActiveSection] = useState<
    'basics' | 'education' | 'experience' | 'skills' | 'projects' | 'certifications' | 'custom'
  >('basics');

  const [skillsInput, setSkillsInput] = useState('');
  const [analysisModal, setAnalysisModal] = useState<{ open: boolean; data?: Awaited<ReturnType<typeof analyzeMutation.mutateAsync>> }>({
    open: false,
  });

  // Track initialization so background query refetches don't wipe unsaved user edits
  const initializedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNew && existingResume) {
      if (initializedIdRef.current !== existingResume.id) {
        initializedIdRef.current = existingResume.id;
        setTitle(existingResume.title || 'My Resume');
        setTemplateId(existingResume.templateId || 'modern');
        setIsPrimary(existingResume.isPrimary);
        setContent({
          fullName: existingResume.content.fullName || '',
          email: existingResume.content.email || '',
          phone: existingResume.content.phone || '',
          location: existingResume.content.location || '',
          linkedinUrl: existingResume.content.linkedinUrl || '',
          githubUrl: existingResume.content.githubUrl || '',
          portfolioUrl: existingResume.content.portfolioUrl || '',
          summary: existingResume.content.summary || '',
          education: existingResume.content.education,
          experience: existingResume.content.experience,
          skills: existingResume.content.skills,
          projects: existingResume.content.projects,
          certifications: existingResume.content.certifications,
          achievements: existingResume.content.achievements || [],
          customSections: existingResume.content.customSections || [],
        });
      }
    } else if (isNew && studentProfile && initializedIdRef.current !== 'new') {
      initializedIdRef.current = 'new';
      // Auto-populate initial resume from student profile
      setContent({
        fullName: studentProfile.fullName || '',
        email: studentProfile.email || '',
        phone: studentProfile.phone || '',
        location: '',
        linkedinUrl: studentProfile.linkedinUrl || '',
        githubUrl: studentProfile.githubUrl || '',
        portfolioUrl: studentProfile.portfolioUrl || '',
        summary: studentProfile.bio || '',
        education: [
          {
            institution: 'University Campus',
            degree: studentProfile.program?.name || 'B.Tech',
            fieldOfStudy: studentProfile.department?.name || 'Computer Science',
            startDate: '2022',
            endDate: String(studentProfile.batch?.graduationYear || '2026'),
            isCurrent: true,
            grade: studentProfile.cgpa ? `${String(studentProfile.cgpa)} CGPA` : '',
            description: '',
          },
        ],
        experience: [],
        skills: studentProfile.skills.map((s) => s.name),
        projects: studentProfile.projects.map((p) => ({
          title: p.title,
          role: '',
          technologies: p.technologies,
          link: p.link || '',
          githubUrl: p.githubUrl || '',
          description: p.description,
          highlights: [],
        })),
        certifications: studentProfile.certifications.map((c) => ({
          name: c.name,
          issuer: c.issuer,
          issueDate: c.issueDate || '',
          expiryDate: '',
          credentialUrl: c.credentialUrl || '',
        })),
        customSections: [],
        achievements: studentProfile.achievements.map((a) => ({
          title: a.title,
          description: a.description || '',
          date: a.date || '',
        })),
      });
    }
  }, [existingResume, studentProfile, isNew]);

  // ── Save Handler ──
  const handleSave = async () => {
    setErrorMessage(null);
    try {
      if (isNew) {
        const created = await createMutation.mutateAsync({
          title,
          templateId,
          content,
          isPrimary,
        });
        setSaveSuccess(true);
        void navigate(`/dashboard/resumes/${created.id}/edit`, { replace: true });
      } else if (id) {
        await updateMutation.mutateAsync({
          id,
          dto: {
            title,
            templateId,
            content,
            isPrimary,
          },
        });
        setSaveSuccess(true);
        setTimeout(() => { setSaveSuccess(false); }, 3000);
      }
    } catch (err) {
      console.error('Failed to save resume:', err);
      const serverDetails = err instanceof ApiClientError ? err.payload.error.details : undefined;
      if (serverDetails && typeof serverDetails === 'object') {
        const issues = Object.entries(serverDetails)
          .map(([key, msgs]) => `${key}: ${(msgs).join(', ')}`)
          .join(' | ');
        setErrorMessage(`Validation error: ${issues}`);
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to save resume. Please check all required fields.'
        );
      }
    }
  };

  const handleAnalyze = async () => {
    setErrorMessage(null);
    try {
      let targetId = id;
      if (isNew) {
        const created = await createMutation.mutateAsync({
          title,
          templateId,
          content,
          isPrimary,
        });
        targetId = created.id;
        void navigate(`/dashboard/resumes/${created.id}/edit`, { replace: true });
      } else if (id) {
        await updateMutation.mutateAsync({
          id,
          dto: {
            title,
            templateId,
            content,
            isPrimary,
          },
        });
      }

      if (targetId) {
        const result = await analyzeMutation.mutateAsync(targetId);
        setAnalysisModal({ open: true, data: result });
      }
    } catch (err) {
      console.error('Failed to analyze resume:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to analyze resume'
      );
    }
  };

  // ── AI Enhancer Handlers ──
  const handleEnhanceExperience = async (idx: number) => {
    const exp = content.experience[idx];
    if (!exp) return;
    const draft = (exp.description || '').trim();
    if (!draft) {
      setErrorMessage('Please type a brief draft or notes for this experience description before enhancing with AI.');
      return;
    }
    setEnhancingKey(`exp-${String(idx)}`);
    setErrorMessage(null);
    try {
      const result = await enhanceTextMutation.mutateAsync({
        text: draft,
        sectionType: 'experience',
        context: {
          role: exp.position || 'Software Engineer',
          company: exp.company || 'Tech Company',
          location: exp.location || '',
        },
      });
      {
        const cleanedOverview = cleanAIText(result.enhancedText);
        if (cleanedOverview) {
          updateExperience(idx, 'description', cleanedOverview);
        }
        if (result.bulletPoints.length > 0) {
          const cleanedBullets = result.bulletPoints.map(cleanAIText).filter(Boolean);
          if (cleanedBullets.length > 0) {
            updateExperience(idx, 'highlights', cleanedBullets);
          }
        }
        setEnhanceNotification({ id: `exp-${String(idx)}`, message: result.keyChanges.join(' ') || 'Text updated. Review before saving.' });
        setTimeout(() => { setEnhanceNotification(null); }, 4000);
      }
    } catch (err) {
      console.error('Enhance experience error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to enhance experience description with AI.'
      );
    } finally {
      setEnhancingKey(null);
    }
  };

  const handleEnhanceProject = async (idx: number) => {
    const proj = content.projects[idx];
    if (!proj) return;
    const draft = (proj.description || '').trim();
    if (!draft) {
      setErrorMessage('Please type a brief draft or notes for this project description before enhancing with AI.');
      return;
    }
    setEnhancingKey(`proj-${String(idx)}`);
    setErrorMessage(null);
    try {
      const result = await enhanceTextMutation.mutateAsync({
        text: draft,
        sectionType: 'project',
        context: {
          title: proj.title || 'Technical Project',
          technologies: proj.technologies,
        },
      });
      {
        const cleanedOverview = cleanAIText(result.enhancedText);
        if (cleanedOverview) {
          updateProject(idx, 'description', cleanedOverview);
        }
        if (result.bulletPoints.length > 0) {
          const cleanedBullets = result.bulletPoints.map(cleanAIText).filter(Boolean);
          if (cleanedBullets.length > 0) {
            updateProject(idx, 'highlights', cleanedBullets);
          }
        }
        setEnhanceNotification({ id: `proj-${String(idx)}`, message: result.keyChanges.join(' ') || 'Text updated. Review before saving.' });
        setTimeout(() => { setEnhanceNotification(null); }, 4000);
      }
    } catch (err) {
      console.error('Enhance project error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to enhance project description with AI.'
      );
    } finally {
      setEnhancingKey(null);
    }
  };

  const handleEnhanceSummary = async () => {
    const draft = (content.summary || '').trim();
    if (!draft) {
      setErrorMessage('Please write a sentence or draft for your summary before enhancing with AI.');
      return;
    }
    setEnhancingKey('summary');
    setErrorMessage(null);
    try {
      const result = await enhanceTextMutation.mutateAsync({
        text: draft,
        sectionType: 'summary',
        context: {
          skills: content.skills,
          fullName: content.fullName || '',
        },
      });
      if (result.enhancedText) {
        const cleanedSummary = cleanAIText(result.enhancedText);
        if (cleanedSummary) {
          updateField('summary', cleanedSummary);
        }
        setEnhanceNotification({ id: 'summary', message: 'Professional summary rewritten for ATS optimization.' });
        setTimeout(() => { setEnhanceNotification(null); }, 4000);
      }
    } catch (err) {
      console.error('Enhance summary error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to enhance summary with AI.'
      );
    } finally {
      setEnhancingKey(null);
    }
  };

  // ── Helper state mutators ──
  const updateField = <K extends keyof ResumeContent,>(field: K, value: ResumeContent[K]) => {
    setContent((prev) => ({ ...prev, [field]: value }));
  };

  // ── Education Helpers ──
  const addEducation = () => {
    setContent((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          institution: '',
          degree: '',
          fieldOfStudy: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          grade: '',
          description: '',
        },
      ],
    }));
  };

  const updateEducation = <K extends keyof EducationEntry,>(index: number, field: K, value: EducationEntry[K]) => {
    const updated = [...content.education];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setContent((prev) => ({ ...prev, education: updated }));
    }
  };

  const removeEducation = (index: number) => {
    setContent((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // ── Experience Helpers ──
  const addExperience = () => {
    setContent((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          company: '',
          position: '',
          location: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
          highlights: [],
        },
      ],
    }));
  };

  const updateExperience = <K extends keyof ExperienceEntry,>(index: number, field: K, value: ExperienceEntry[K]) => {
    setContent((prev) => {
      const updated = [...prev.experience];
      const current = updated[index];
      if (current) {
        updated[index] = { ...current, [field]: value };
      }
      return { ...prev, experience: updated };
    });
  };

  /** Atomic toggle for isCurrent — sets isCurrent and clears endDate in one state update */
  const toggleExperienceCurrent = (index: number, checked: boolean) => {
    setContent((prev) => {
      const updated = [...prev.experience];
      const current = updated[index];
      if (current) {
        updated[index] = { ...current, isCurrent: checked, endDate: checked ? '' : current.endDate };
      }
      return { ...prev, experience: updated };
    });
  };

  const removeExperience = (index: number) => {
    setContent((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const addExperienceHighlight = (expIndex: number) => {
    const updated = [...content.experience];
    const current = updated[expIndex];
    if (current) {
      updated[expIndex] = {
        ...current,
        highlights: [...(current.highlights), ''],
      };
      setContent((prev) => ({ ...prev, experience: updated }));
    }
  };

  const updateExperienceHighlight = (expIndex: number, hlIndex: number, text: string) => {
    const updated = [...content.experience];
    const current = updated[expIndex];
    if (current) {
      const updatedHighlights = [...current.highlights];
      updatedHighlights[hlIndex] = text;
      updated[expIndex] = { ...current, highlights: updatedHighlights };
      setContent((prev) => ({ ...prev, experience: updated }));
    }
  };

  const removeExperienceHighlight = (expIndex: number, hlIndex: number) => {
    const updated = [...content.experience];
    const current = updated[expIndex];
    if (current) {
      updated[expIndex] = {
        ...current,
        highlights: current.highlights.filter((_, i) => i !== hlIndex),
      };
      setContent((prev) => ({ ...prev, experience: updated }));
    }
  };

  // ── Project Helpers ──
  const addProject = () => {
    setContent((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          title: '',
          role: '',
          technologies: [],
          link: '',
          githubUrl: '',
          description: '',
          highlights: [],
        },
      ],
    }));
  };

  const updateProject = <K extends keyof ResumeProjectEntry,>(index: number, field: K, value: ResumeProjectEntry[K]) => {
    const updated = [...content.projects];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setContent((prev) => ({ ...prev, projects: updated }));
    }
  };

  const removeProject = (index: number) => {
    setContent((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const addProjectHighlight = (projIndex: number) => {
    setContent((prev) => {
      const updated = [...prev.projects];
      const current = updated[projIndex];
      if (current) {
        updated[projIndex] = {
          ...current,
          highlights: [...(current.highlights), ''],
        };
      }
      return { ...prev, projects: updated };
    });
  };

  const updateProjectHighlight = (projIndex: number, hlIndex: number, text: string) => {
    setContent((prev) => {
      const updated = [...prev.projects];
      const current = updated[projIndex];
      if (current) {
        const highlights = [...(current.highlights)];
        highlights[hlIndex] = text;
        updated[projIndex] = { ...current, highlights };
      }
      return { ...prev, projects: updated };
    });
  };

  const removeProjectHighlight = (projIndex: number, hlIndex: number) => {
    setContent((prev) => {
      const updated = [...prev.projects];
      const current = updated[projIndex];
      if (current) {
        const highlights = (current.highlights).filter((_, i) => i !== hlIndex);
        updated[projIndex] = { ...current, highlights };
      }
      return { ...prev, projects: updated };
    });
  };

  // ── Skills Helpers ──
  const addSkill = (skillNames?: string[]) => {
    const toAdd = skillNames || skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (toAdd.length === 0) return;

    setContent((prev) => {
      const existing = new Set(prev.skills);
      const newSkills = [...prev.skills];
      for (const skill of toAdd) {
        if (!existing.has(skill)) {
          newSkills.push(skill);
          existing.add(skill);
        }
      }
      return { ...prev, skills: newSkills };
    });
    setSkillsInput('');
  };

  const removeSkill = (skill: string) => {
    setContent((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const importSkillsFromProfile = () => {
    if (!studentProfile?.skills) return;
    const profileSkillNames = studentProfile.skills.map((s) => s.name);
    addSkill(profileSkillNames);
  };

  // ── Certifications Helpers ──
  const addCertification = () => {
    setContent((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          name: '',
          issuer: '',
          issueDate: '',
          expiryDate: '',
          credentialUrl: '',
        },
      ],
    }));
  };

  const updateCertification = <K extends keyof ResumeCertificationEntry,>(index: number, field: K, value: ResumeCertificationEntry[K]) => {
    const updated = [...content.certifications];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setContent((prev) => ({ ...prev, certifications: updated }));
    }
  };

  const removeCertification = (index: number) => {
    setContent((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  // ── Achievements Helpers ──
  const addAchievement = () => {
    setContent((prev) => ({
      ...prev,
      achievements: [
        ...prev.achievements,
        {
          title: '',
          description: '',
          date: '',
        },
      ],
    }));
  };

  const updateAchievement = <K extends keyof ResumeAchievementEntry,>(index: number, field: K, value: ResumeAchievementEntry[K]) => {
    const updated = [...content.achievements];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setContent((prev) => ({ ...prev, achievements: updated }));
    }
  };

  // ── Custom Sections Helpers ──
  const addCustomSection = () => {
    setContent((prev) => ({
      ...prev,
      customSections: [
        ...(prev.customSections || []),
        {
          id: `custom-${Date.now()}`,
          title: 'Additional Section',
          content: '',
          items: [],
        },
      ],
    }));
  };

  const updateCustomSection = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...(content.customSections || [])];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setContent((prev) => ({ ...prev, customSections: updated }));
    }
  };

  const removeCustomSection = (index: number) => {
    setContent((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).filter((_, i) => i !== index),
    }));
  };

  const addCustomSectionItem = (secIdx: number, itemText = '') => {
    setContent((prev) => {
      const updated = [...(prev.customSections || [])];
      const current = updated[secIdx];
      if (current) {
        updated[secIdx] = {
          ...current,
          items: [...(current.items || []), itemText],
        };
      }
      return { ...prev, customSections: updated };
    });
  };

  const updateCustomSectionItem = (secIdx: number, itemIdx: number, text: string) => {
    setContent((prev) => {
      const updated = [...(prev.customSections || [])];
      const current = updated[secIdx];
      if (current) {
        const items = [...(current.items || [])];
        items[itemIdx] = text;
        updated[secIdx] = { ...current, items };
      }
      return { ...prev, customSections: updated };
    });
  };

  const removeCustomSectionItem = (secIdx: number, itemIdx: number) => {
    setContent((prev) => {
      const updated = [...(prev.customSections || [])];
      const current = updated[secIdx];
      if (current) {
        updated[secIdx] = {
          ...current,
          items: (current.items || []).filter((_, i) => i !== itemIdx),
        };
      }
      return { ...prev, customSections: updated };
    });
  };

  const removeAchievement = (index: number) => {
    setContent((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
  };

  // ── Resume Validation / Completeness Scoring ("Super Builder") ──
  const computeValidation = () => {
    const issues: { section: string; field: string; severity: 'error' | 'warning' | 'info' }[] = [];
    let filled = 0;
    const total = 14; // total checkpoints

    // Basics
    if (content.fullName.trim()) filled++; else issues.push({ section: 'Basics', field: 'Full Name is missing', severity: 'error' });
    if (content.email.trim()) filled++; else issues.push({ section: 'Basics', field: 'Email is missing', severity: 'error' });
    if (content.phone?.trim()) filled++; else issues.push({ section: 'Basics', field: 'Phone number is missing — recruiters need to contact you', severity: 'warning' });
    if (content.location?.trim()) filled++; else issues.push({ section: 'Basics', field: 'Location is missing — helps with regional hiring filters', severity: 'info' });
    if (content.linkedinUrl?.trim()) filled++; else issues.push({ section: 'Basics', field: 'LinkedIn URL is missing — highly recommended', severity: 'warning' });

    // Summary
    if (content.summary.trim().length >= 50) filled++;
    else if (content.summary.trim().length > 0) { filled += 0.5; issues.push({ section: 'Summary', field: 'Professional summary is too short (aim for 50+ characters)', severity: 'warning' }); }
    else issues.push({ section: 'Summary', field: 'Professional summary is missing', severity: 'error' });

    // Education
    if (content.education.length > 0) {
      filled++;
      content.education.forEach((edu, i) => {
        if (!edu.institution.trim()) issues.push({ section: 'Education', field: `Entry ${String(i + 1)}: Institution is missing`, severity: 'error' });
        if (!edu.degree.trim()) issues.push({ section: 'Education', field: `Entry ${String(i + 1)}: Degree is missing`, severity: 'error' });
        if (!edu.startDate?.trim()) issues.push({ section: 'Education', field: `Entry ${String(i + 1)}: Start date is missing`, severity: 'warning' });
        if (!edu.endDate?.trim() && !edu.isCurrent) issues.push({ section: 'Education', field: `Entry ${String(i + 1)}: End date is missing`, severity: 'warning' });
      });
    } else issues.push({ section: 'Education', field: 'No education entries — add at least one', severity: 'error' });

    // Experience
    if (content.experience.length > 0) {
      filled++;
      content.experience.forEach((exp, i) => {
        if (!exp.company.trim()) issues.push({ section: 'Experience', field: `Entry ${String(i + 1)}: Company name is missing`, severity: 'error' });
        if (!exp.position.trim()) issues.push({ section: 'Experience', field: `Entry ${String(i + 1)}: Position title is missing`, severity: 'error' });
        if (!exp.description?.trim() && (exp.highlights.filter(Boolean).length === 0)) {
          issues.push({ section: 'Experience', field: `Entry ${String(i + 1)}: Add description or bullet points`, severity: 'warning' });
        }
        if (!exp.startDate?.trim()) issues.push({ section: 'Experience', field: `Entry ${String(i + 1)}: Start date is missing`, severity: 'warning' });
      });
    } else issues.push({ section: 'Experience', field: 'No experience entries — even internships count.', severity: 'info' });

    // Skills
    if (content.skills.length >= 5) filled += 2;
    else if (content.skills.length > 0) { filled++; issues.push({ section: 'Skills', field: `Only ${String(content.skills.length)} skill(s) — add at least 5 for ATS matching`, severity: 'warning' }); }
    else issues.push({ section: 'Skills', field: 'No skills added — this is critical for ATS', severity: 'error' });

    // Projects
    if (content.projects.length > 0) {
      filled++;
      content.projects.forEach((proj, i) => {
        if (!proj.title.trim()) issues.push({ section: 'Projects', field: `Entry ${String(i + 1)}: Project title is missing`, severity: 'error' });
        if (!proj.description?.trim()) issues.push({ section: 'Projects', field: `Entry ${String(i + 1)}: Description is missing`, severity: 'warning' });
        if (proj.technologies.length === 0) issues.push({ section: 'Projects', field: `Entry ${String(i + 1)}: Add technologies used`, severity: 'info' });
      });
    } else issues.push({ section: 'Projects', field: 'No projects — showcase your technical work', severity: 'info' });

    // Certifications
    if (content.certifications.length > 0) {
      filled++;
      content.certifications.forEach((cert, i) => {
        if (!cert.name.trim()) issues.push({ section: 'Certifications', field: `Entry ${String(i + 1)}: Cert name is missing`, severity: 'error' });
        if (!cert.credentialUrl?.trim()) issues.push({ section: 'Certifications', field: `Entry ${String(i + 1)}: Add credential URL for verification`, severity: 'info' });
      });
    } else issues.push({ section: 'Certifications', field: 'No certifications — consider adding relevant ones', severity: 'info' });

    // Achievements
    if (content.achievements.length > 0) filled++;
    else issues.push({ section: 'Achievements', field: 'No achievements — hackathons, awards, or honors?', severity: 'info' });

    const score = Math.round((filled / total) * 100);
    return { score, issues };
  };

  const validation = computeValidation();

  if (!isNew && resumeLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-slate-500">Loading resume builder…</p>
        </div>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 shadow-xs">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Unable to save resume</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => { setErrorMessage(null); }}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Top Command Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border pb-4 bg-card p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/resumes"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); }}
              className="text-lg font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none"
              placeholder="Resume Name"
            />
            <p className="text-xs text-muted-foreground">Structured Resume Editor with Real-Time Live Preview</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Template Selector */}
          <select
            value={templateId}
            onChange={(e) => { setTemplateId(e.target.value); }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:border-primary"
          >
            <option value="modern">Modern Minimal</option>
            <option value="classic">Executive Classic</option>
            <option value="technical">Technical Focus</option>
          </select>

          {/* Primary Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-foreground px-2">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => { setIsPrimary(e.target.checked); }}
              className="rounded border-border text-primary focus:ring-primary"
            />
            Primary Resume
          </label>

          <button
            type="button"
            onClick={() => { void (handleAnalyze)(); }}
            disabled={analyzeMutation.isPending || isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-60 transition cursor-pointer"
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            )}
            {analyzeMutation.isPending ? 'Analyzing...' : 'AI Score'}
          </button>

          <button
            type="button"
            onClick={() => { void (handleSave)(); }}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 transition cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saveSuccess ? 'Saved' : 'Save Resume'}
          </button>

          <button
            type="button"
            onClick={() => { downloadResumePdf({ title, content, templateId }); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 hover:bg-muted border border-border px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition cursor-pointer"
            title="Download formatted resume as PDF"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Two-Pane Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT PANE: Form Sections ── */}
        <div className="space-y-5">
          {/* Section Selector Tabs */}
          <div className="flex overflow-x-auto gap-1.5 bg-muted/20 border border-border p-1.5 rounded-xl">
            {[
              { id: 'basics', label: 'Basics & Summary', icon: User },
              { id: 'education', label: 'Education', icon: GraduationCap },
              { id: 'experience', label: 'Experience', icon: Briefcase },
              { id: 'skills', label: 'Skills', icon: BookOpen },
              { id: 'projects', label: 'Projects', icon: Briefcase },
              { id: 'certifications', label: 'Certs & Awards', icon: Award },
              { id: 'custom', label: 'Additional Sections', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveSection(tab.id as typeof activeSection); }}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition cursor-pointer ${isActive ? 'bg-primary/20 text-primary border border-primary/30 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Section 1: Basics & Summary */}
          {activeSection === 'basics' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Personal Info & Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={content.fullName}
                    onChange={(e) => { updateField('fullName', e.target.value); }}
                    placeholder="e.g. Alex Johnson"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={content.email}
                    onChange={(e) => { updateField('email', e.target.value); }}
                    placeholder="alex@university.edu"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={content.phone || ''}
                    onChange={(e) => { updateField('phone', e.target.value); }}
                    placeholder="+1 (555) 019-2834"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Location / City</label>
                  <input
                    type="text"
                    value={content.location || ''}
                    onChange={(e) => { updateField('location', e.target.value); }}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={content.linkedinUrl || ''}
                    onChange={(e) => { updateField('linkedinUrl', e.target.value); }}
                    placeholder="https://linkedin.com/in/alex"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">GitHub Profile</label>
                  <input
                    type="text"
                    value={content.githubUrl || ''}
                    onChange={(e) => { updateField('githubUrl', e.target.value); }}
                    placeholder="https://github.com/alex"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Portfolio Website</label>
                  <input
                    type="text"
                    value={content.portfolioUrl || ''}
                    onChange={(e) => { updateField('portfolioUrl', e.target.value); }}
                    placeholder="https://alexjohnson.dev"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-700">Professional Summary</label>
                  <button
                    type="button"
                    onClick={() => { void (handleEnhanceSummary)(); }}
                    disabled={enhancingKey === 'summary'}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-muted/40 hover:bg-muted px-2.5 py-1 rounded-lg border border-border disabled:opacity-60 transition-colors shadow-xs"
                    title="Improve and polish with AI action verbs and ATS keywords"
                  >
                    {enhancingKey === 'summary' ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                    {enhancingKey === 'summary' ? 'Enhancing...' : 'Enhance with AI'}
                  </button>
                </div>
                {enhanceNotification?.id === 'summary' && (
                  <div className="mb-2 text-[11px] font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#B9903B] shrink-0" />
                    {enhanceNotification.message}
                  </div>
                )}
                <textarea
                  rows={3}
                  value={content.summary}
                  onChange={(e) => { updateField('summary', e.target.value); }}
                  placeholder="2-3 sentences highlighting technical expertise, project experience, and placement goals..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Section 2: Education */}
          {activeSection === 'education' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Education Details</h3>
                  <p className="text-xs text-slate-500">Degree, major, university, and graduation year</p>
                </div>
                <button
                  type="button"
                  onClick={addEducation}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Education
                </button>
              </div>

              {content.education.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-xs text-slate-500">No education entries yet.</p>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add Education
                  </button>
                </div>
              ) : (
                content.education.map((edu, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => { removeEducation(idx); }}
                      className="absolute right-3 top-3 text-slate-400 hover:text-red-600"
                      title="Remove education"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Institution / University *</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => { updateEducation(idx, 'institution', e.target.value); }}
                          placeholder="e.g. Stanford University"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Degree *</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => { updateEducation(idx, 'degree', e.target.value); }}
                          placeholder="e.g. Bachelor of Technology (B.Tech)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Major / Field of Study</label>
                        <input
                          type="text"
                          value={edu.fieldOfStudy || ''}
                          onChange={(e) => { updateEducation(idx, 'fieldOfStudy', e.target.value); }}
                          placeholder="e.g. Computer Science and Engineering"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">CGPA / Grade</label>
                        <input
                          type="text"
                          value={edu.grade || ''}
                          onChange={(e) => { updateEducation(idx, 'grade', e.target.value); }}
                          placeholder="e.g. 8.8 / 10 or 3.8 GPA"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Start Date</label>
                        <input
                          type="text"
                          value={edu.startDate || ''}
                          onChange={(e) => { updateEducation(idx, 'startDate', e.target.value); }}
                          placeholder="e.g. Aug 2022"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">End Date / Graduation Year</label>
                        <input
                          type="text"
                          value={edu.endDate || ''}
                          onChange={(e) => { updateEducation(idx, 'endDate', e.target.value); }}
                          placeholder="e.g. May 2026 or Present"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Section 3: Experience */}
          {activeSection === 'experience' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Work Experience & Internships</h3>
                  <p className="text-xs text-slate-500">Add internships, freelance, or full-time roles</p>
                </div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Experience
                </button>
              </div>

              {content.experience.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-xs text-slate-500">No work experience added yet.</p>
                  <button
                    type="button"
                    onClick={addExperience}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add Experience
                  </button>
                </div>
              ) : (
                content.experience.map((exp, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => { removeExperience(idx); }}
                      className="absolute right-3 top-3 text-slate-400 hover:text-red-600"
                      title="Remove experience"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Company / Organization *</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => { updateExperience(idx, 'company', e.target.value); }}
                          placeholder="e.g. Microsoft, Google, Acme Corp"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Role / Position *</label>
                        <input
                          type="text"
                          value={exp.position}
                          onChange={(e) => { updateExperience(idx, 'position', e.target.value); }}
                          placeholder="e.g. Software Engineering Intern"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Location</label>
                        <input
                          type="text"
                          value={exp.location || ''}
                          onChange={(e) => { updateExperience(idx, 'location', e.target.value); }}
                          placeholder="e.g. San Francisco, CA (or Remote)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Start Date</label>
                          <input
                            type="text"
                            value={exp.startDate || ''}
                            onChange={(e) => { updateExperience(idx, 'startDate', e.target.value); }}
                            placeholder="e.g. May 2024"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">End Date</label>
                          <input
                            type="text"
                            value={exp.isCurrent ? 'Present' : (exp.endDate || '')}
                            disabled={exp.isCurrent}
                            onChange={(e) => { updateExperience(idx, 'endDate', e.target.value); }}
                            placeholder="e.g. Aug 2024"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id={`current-job-${String(idx)}`}
                        checked={exp.isCurrent}
                        onChange={(e) => { toggleExperienceCurrent(idx, e.target.checked); }}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <label htmlFor={`current-job-${String(idx)}`} className="text-[11px] text-slate-600 cursor-pointer">
                        I am currently working in this role
                      </label>
                      {exp.isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Present
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-slate-700">Description & Overview</label>
                        <button
                          type="button"
                          onClick={() => { void (handleEnhanceExperience(idx)); }}
                          disabled={enhancingKey === `exp-${String(idx)}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-muted/40 hover:bg-muted px-2.5 py-1 rounded-lg border border-border disabled:opacity-60 transition-colors shadow-xs"
                          title="Improve and polish with AI action verbs, technical depth, and quantifiable metrics"
                        >
                          {enhancingKey === `exp-${String(idx)}` ? (
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-primary" />
                          )}
                          {enhancingKey === `exp-${String(idx)}` ? 'Enhancing...' : 'Enhance with AI'}
                        </button>
                      </div>
                      {enhanceNotification?.id === `exp-${String(idx)}` && (
                        <div className="mb-2 text-[11px] font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#B9903B] shrink-0" />
                          {enhanceNotification.message}
                        </div>
                      )}
                      <textarea
                        rows={2}
                        value={exp.description || ''}
                        onChange={(e) => { updateExperience(idx, 'description', e.target.value); }}
                        placeholder="Built scalable backend services using Node.js and PostgreSQL, improving throughput by 30%..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Bullet Highlights */}
                    <div className="space-y-2 pt-1 border-t border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-slate-700">Bullet Points / Key Impacts</label>
                        <button
                          type="button"
                          onClick={() => { addExperienceHighlight(idx); }}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          + Add Bullet Point
                        </button>
                      </div>
                      {exp.highlights.map((hl, hlIdx) => (
                        <div key={hlIdx} className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">•</span>
                          <input
                            type="text"
                            value={hl}
                            onChange={(e) => { updateExperienceHighlight(idx, hlIdx, e.target.value); }}
                            placeholder="Engineered X using Y leading to Z% improvement"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => { removeExperienceHighlight(idx, hlIdx); }}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Section 4: Skills */}
          {activeSection === 'skills' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Technical Skills for this Resume</h3>
                  <p className="text-xs text-slate-500">Skills targeted to match job descriptions and pass ATS filters</p>
                </div>
                {studentProfile?.skills && studentProfile.skills.length > 0 && (
                  <button
                    type="button"
                    onClick={importSkillsFromProfile}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Import from Profile ({studentProfile.skills.length})
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => { setSkillsInput(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="e.g. React, Node.js, Python, Docker (comma separated, press Enter)"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => { addSkill(); }}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Add
                </button>
              </div>

              {/* Suggestions from catalog */}
              {catalogSkills && catalogSkills.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-slate-500">Quick-Add Popular Skills:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {catalogSkills
                      .filter((s) => !content.skills.includes(s.name))
                      .slice(0, 12)
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { addSkill([s.name]); }}
                          className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-primary/15 hover:text-primary border border-border transition"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          {s.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Skills Tags List */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700">
                    Selected Skills ({content.skills.length})
                  </span>
                  {content.skills.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setContent((prev) => ({ ...prev, skills: [] })); }}
                      className="text-[11px] text-slate-400 hover:text-red-600"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {content.skills.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-xl">
                    No skills added to this resume. Type skills above or import from your profile.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {content.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 shadow-2xs"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => { removeSkill(skill); }}
                          className="text-primary hover:text-destructive"
                          title="Remove skill"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Projects */}
          {activeSection === 'projects' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Featured Projects</h3>
                  <p className="text-xs text-slate-500">Showcase technical depth, architecture, and impact</p>
                </div>
                <button
                  type="button"
                  onClick={addProject}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Project
                </button>
              </div>

              {content.projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-xs text-slate-500">No projects added yet.</p>
                  <button
                    type="button"
                    onClick={addProject}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add Project
                  </button>
                </div>
              ) : (
                content.projects.map((proj, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => { removeProject(idx); }}
                      className="absolute right-3 top-3 text-slate-400 hover:text-red-600"
                      title="Remove project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Project Title *</label>
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => { updateProject(idx, 'title', e.target.value); }}
                          placeholder="e.g. Campus Placement Portal"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Tech Stack (comma separated)</label>
                        <input
                          type="text"
                          value={proj.technologies.join(', ')}
                          onChange={(e) => {
                            updateProject(
                              idx,
                              'technologies',
                              e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                            );
                          }
                          }
                          placeholder="e.g. React, Node.js, PostgreSQL, Docker"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Live Demo Link</label>
                        <input
                          type="text"
                          value={proj.link || ''}
                          onChange={(e) => { updateProject(idx, 'link', e.target.value); }}
                          placeholder="https://myproject.dev"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">GitHub Repo</label>
                        <input
                          type="text"
                          value={proj.githubUrl || ''}
                          onChange={(e) => { updateProject(idx, 'githubUrl', e.target.value); }}
                          placeholder="https://github.com/myname/repo"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-slate-700">Description & Architecture</label>
                        <button
                          type="button"
                          onClick={() => { void (handleEnhanceProject(idx)); }}
                          disabled={enhancingKey === `proj-${String(idx)}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-muted/40 hover:bg-muted px-2.5 py-1 rounded-lg border border-border disabled:opacity-60 transition-colors shadow-xs"
                          title="Improve and polish project description with architectural approach and quantifiable impact"
                        >
                          {enhancingKey === `proj-${String(idx)}` ? (
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-primary" />
                          )}
                          {enhancingKey === `proj-${String(idx)}` ? 'Enhancing...' : 'Enhance with AI'}
                        </button>
                      </div>
                      {enhanceNotification?.id === `proj-${String(idx)}` && (
                        <div className="mb-2 text-[11px] font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#B9903B] shrink-0" />
                          {enhanceNotification.message}
                        </div>
                      )}
                      <textarea
                        rows={2}
                        value={proj.description || ''}
                        onChange={(e) => { updateProject(idx, 'description', e.target.value); }}
                        placeholder="Built microservices architecture supporting 10,000+ concurrent requests with 99.9% uptime..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Bullet Highlights */}
                    <div className="space-y-2 pt-1 border-t border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-slate-700">Bullet Points / Key Accomplishments</label>
                        <button
                          type="button"
                          onClick={() => { addProjectHighlight(idx); }}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          + Add Bullet Point
                        </button>
                      </div>
                      {proj.highlights.map((hl, hlIdx) => (
                        <div key={hlIdx} className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">•</span>
                          <input
                            type="text"
                            value={hl}
                            onChange={(e) => { updateProjectHighlight(idx, hlIdx, e.target.value); }}
                            placeholder="Architected X with Y reducing latency by Z%"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => { removeProjectHighlight(idx, hlIdx); }}
                            className="text-slate-400 hover:text-red-500 transition p-1"
                            title="Remove bullet point"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Section 6: Certifications & Awards */}
          {activeSection === 'certifications' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              {/* Certifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Certifications</h3>
                  <button
                    type="button"
                    onClick={addCertification}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Certification
                  </button>
                </div>
                {content.certifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No certifications added.</p>
                ) : (
                  content.certifications.map((cert, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => { removeCertification(idx); }}
                        className="absolute right-3 top-3 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Certification Name *</label>
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) => { updateCertification(idx, 'name', e.target.value); }}
                            placeholder="e.g. AWS Certified Developer Associate"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Issuing Organization *</label>
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) => { updateCertification(idx, 'issuer', e.target.value); }}
                            placeholder="e.g. Amazon Web Services"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Issue Date</label>
                          <input
                            type="text"
                            value={cert.issueDate || ''}
                            onChange={(e) => { updateCertification(idx, 'issueDate', e.target.value); }}
                            placeholder="e.g. Jan 2024"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Expiry Date</label>
                          <input
                            type="text"
                            value={cert.expiryDate || ''}
                            onChange={(e) => { updateCertification(idx, 'expiryDate', e.target.value); }}
                            placeholder="e.g. Jan 2027 (or 'No Expiry')"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="pr-6">
                        <label className="block text-[10px] font-medium text-slate-700 mb-0.5">
                          <span className="inline-flex items-center gap-1">
                            <LinkIcon className="h-3 w-3 text-slate-500" />
                            Credential Verification URL
                          </span>
                        </label>
                        <input
                          type="url"
                          value={cert.credentialUrl || ''}
                          onChange={(e) => { updateCertification(idx, 'credentialUrl', e.target.value); }}
                          placeholder="https://www.credly.com/badges/... or verification link"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                        {safeHref(cert.credentialUrl) && (
                          <a
                            href={safeHref(cert.credentialUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <ExternalLink className="h-3 w-3" /> Open credential link
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Achievements */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Honors & Achievements</h3>
                  <button
                    type="button"
                    onClick={addAchievement}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Achievement
                  </button>
                </div>
                {content.achievements.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No honors or achievements added.</p>
                ) : (
                  content.achievements.map((ach, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => { removeAchievement(idx); }}
                        className="absolute right-3 top-3 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Title *</label>
                          <input
                            type="text"
                            value={ach.title}
                            onChange={(e) => { updateAchievement(idx, 'title', e.target.value); }}
                            placeholder="e.g. 1st Place - National Hackathon 2024"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Date</label>
                          <input
                            type="text"
                            value={ach.date || ''}
                            onChange={(e) => { updateAchievement(idx, 'date', e.target.value); }}
                            placeholder="e.g. Mar 2024"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="pr-6">
                        <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Description</label>
                        <textarea
                          rows={2}
                          value={ach.description || ''}
                          onChange={(e) => { updateAchievement(idx, 'description', e.target.value); }}
                          placeholder="Describe the achievement, its significance, and your contribution..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* Section 7: Custom / Additional Sections */}
          {activeSection === 'custom' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Additional & Custom Sections</h3>
                  <p className="text-xs text-slate-500">
                    Custom sections extracted from uploaded resumes or additional headings (e.g. Languages & Soft Skills, Publications, Extracurriculars)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCustomSection}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Section
                </button>
              </div>

              {(!content.customSections || content.customSections.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-xs text-slate-500">No additional sections added yet.</p>
                  <button
                    type="button"
                    onClick={addCustomSection}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add Custom Section
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {content.customSections.map((sec, secIdx) => (
                    <div key={sec.id || `custom-sec-${secIdx}`} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => { removeCustomSection(secIdx); }}
                        className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1"
                        title="Delete Section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="pr-8">
                        <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Section Title *</label>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => { updateCustomSection(secIdx, 'title', e.target.value); }}
                          placeholder="e.g. Languages & Soft Skills, Publications, Leadership"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="pr-8">
                        <label className="block text-[10px] font-medium text-slate-700 mb-0.5">Summary / Overview (optional)</label>
                        <textarea
                          rows={2}
                          value={sec.content || ''}
                          onChange={(e) => { updateCustomSection(secIdx, 'content', e.target.value); }}
                          placeholder="General description or overview paragraph for this section..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2 pr-8">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-medium text-slate-700">Bullet Points / Items</label>
                          <button
                            type="button"
                            onClick={() => { addCustomSectionItem(secIdx, ''); }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-3 w-3" /> Add Item
                          </button>
                        </div>
                        {sec.items && sec.items.length > 0 ? (
                          <div className="space-y-1.5">
                            {sec.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs">•</span>
                                <input
                                  type="text"
                                  value={item}
                                  onChange={(e) => { updateCustomSectionItem(secIdx, itemIdx, e.target.value); }}
                                  placeholder="e.g. Tamil (Native), English (C1 Advanced) or Leadership activity..."
                                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => { removeCustomSectionItem(secIdx, itemIdx); }}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No bullet items yet. Click &apos;+ Add Item&apos; to add points.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Resume Completeness Validator (Super Builder) ── */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`h-5 w-5 ${validation.score >= 80 ? 'text-emerald-700 dark:text-emerald-400' : validation.score >= 50 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'}`} />
                <div>
                  <h3 className="text-sm font-semibold tracking-normal text-foreground">Resume Health Check</h3>
                  <p className="text-[10px] text-muted-foreground">Senior-level validation for a professional resume</p>
                </div>
              </div>
              <div className={`text-lg font-bold font-mono tabular-nums ${validation.score >= 80 ? 'text-emerald-700 dark:text-emerald-400' : validation.score >= 50 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                {validation.score}%
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${validation.score >= 80 ? 'bg-emerald-500' : validation.score >= 50 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                style={{ width: `${String(validation.score)}%` }}
              />
            </div>

            {/* Issue list */}
            {validation.issues.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {validation.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-lg px-3 py-1.5 text-[11px] border ${issue.severity === 'error'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                      : issue.severity === 'warning'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : 'bg-primary/10 text-primary border-primary/20'
                      }`}
                  >
                    {issue.severity === 'error' ? (
                      <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-700 dark:text-rose-400" />
                    ) : issue.severity === 'warning' ? (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                    )}
                    <div>
                      <span className="font-semibold">{issue.section}:</span> {issue.field}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Your resume is complete and well-structured! Ready for submission.
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Live Rendered Resume Preview ── */}
        <div className="sticky top-6">
          <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden flex flex-col">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Live Resume Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { downloadResumePdf({ title, content, templateId }); }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 transition cursor-pointer"
                  title="Print or Save as PDF"
                >
                  <Download className="h-3 w-3" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => { downloadResumeJson({ title, content, templateId }); }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-muted/20 hover:bg-muted/40 px-2 py-1 rounded-lg border border-border transition cursor-pointer"
                  title="Export structured JSON"
                >
                  JSON
                </button>
                <span className="text-[11px] text-muted-foreground tracking-normal font-mono">
                  {templateId}
                </span>
              </div>
            </div>

            {/* Rendered Document Sheet with dynamic template styling */}
            {(() => {
              const isClassic = templateId === 'classic';
              const isTechnical = templateId === 'technical';

              const sectionTitleClass = isClassic
                ? 'text-xs font-serif font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 text-center'
                : isTechnical
                  ? 'text-xs font-mono font-bold tracking-normal text-teal-700 border-b-2 border-teal-600 pb-1 flex items-center gap-1.5'
                  : 'text-xs font-sans font-bold tracking-normal text-blue-600 border-b-2 border-blue-200 pb-1';

              return (
                <div
                  className={`p-8 space-y-5 min-h-[600px] max-h-[750px] overflow-y-auto bg-white text-xs leading-relaxed transition-colors ${isClassic
                    ? 'font-serif text-slate-900 bg-stone-50/30'
                    : isTechnical
                      ? 'font-sans text-slate-800 border-t-4 border-teal-600'
                      : 'font-sans text-slate-800 border-t-4 border-blue-600'
                    }`}
                >
                  {/* Document Header */}
                  <div
                    className={`pb-4 space-y-1 ${isClassic
                      ? 'border-b-2 border-slate-900 text-center'
                      : isTechnical
                        ? 'border-b-2 border-teal-600 text-left'
                        : 'border-b border-slate-200 text-center'
                      }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <h2
                        className={`tracking-tight ${isClassic
                          ? 'font-serif text-2xl font-bold uppercase text-slate-900 w-full text-center'
                          : isTechnical
                            ? 'font-mono text-xl font-bold text-slate-900'
                            : 'font-sans text-2xl font-black text-slate-900 w-full text-center'
                          }`}
                      >
                        {content.fullName || 'Your Full Name'}
                      </h2>
                      {isTechnical && (
                        <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                          DEV_PROFILE
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex flex-wrap gap-2 text-[11px] ${isClassic
                        ? 'justify-center font-serif text-slate-700'
                        : isTechnical
                          ? 'justify-start font-mono text-slate-600'
                          : 'justify-center font-sans text-slate-600'
                        }`}
                    >
                      {content.email && <span>{content.email}</span>}
                      {content.phone && <span>· {content.phone}</span>}
                      {content.location && <span>· {content.location}</span>}
                    </div>
                    <div
                      className={`flex flex-wrap gap-2 text-[11px] pt-0.5 ${isClassic
                        ? 'justify-center font-serif text-blue-900 underline'
                        : isTechnical
                          ? 'justify-start font-mono text-teal-700'
                          : 'justify-center font-sans text-blue-600'
                        }`}
                    >
                      {content.linkedinUrl && <span>LinkedIn</span>}
                      {content.githubUrl && <span>· GitHub</span>}
                      {content.portfolioUrl && <span>· Portfolio</span>}
                    </div>
                  </div>

                  {/* Summary */}
                  {content.summary && (
                    <div className="space-y-1">
                      <h4 className={sectionTitleClass}>
                        {isTechnical && <span className="text-teal-500 font-mono">&gt;</span>} Summary
                      </h4>
                      <p className={`text-[11px] ${isClassic ? 'font-serif text-slate-800' : 'text-slate-700'}`}>
                        {content.summary}
                      </p>
                    </div>
                  )}

                  {/* Education */}
                  {content.education.length > 0 && (
                    <div className="space-y-2">
                      <h4 className={sectionTitleClass}>
                        {isTechnical && <span className="text-teal-500 font-mono">&gt;</span>} Education
                      </h4>
                      {content.education.map((edu, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div>
                            <p className={`font-semibold text-slate-900 ${isTechnical ? 'font-mono' : ''}`}>
                              {edu.institution || 'University'}
                            </p>
                            <p className={isClassic ? 'font-serif italic text-slate-700' : 'text-slate-600'}>
                              {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-[11px] ${isTechnical ? 'font-mono text-slate-500' : isClassic ? 'font-serif italic text-slate-500' : 'text-slate-500'}`}>
                              {edu.startDate ? `${edu.startDate} - ` : ''}
                              {edu.endDate || (edu.isCurrent ? 'Present' : '')}
                            </p>
                            {edu.grade && <p className="font-medium text-slate-700">{edu.grade}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Experience */}
                  {content.experience.length > 0 && (
                    <div className="space-y-3">
                      <h4 className={sectionTitleClass}>
                        {isTechnical && <span className="text-teal-500 font-mono">&gt;</span>} Experience
                      </h4>
                      {content.experience.map((exp, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <span className={`font-semibold text-slate-900 ${isTechnical ? 'font-mono' : ''}`}>
                              {exp.position || 'Role'} · {exp.company || 'Company'}
                              {exp.location ? ` (${exp.location})` : ''}
                            </span>
                            <span className={`text-[11px] ${isTechnical ? 'font-mono text-slate-500' : isClassic ? 'font-serif italic text-slate-500' : 'text-slate-500'}`}>
                              {exp.startDate ? `${exp.startDate} - ` : ''}
                              {exp.isCurrent ? 'Present' : (exp.endDate || '')}
                            </span>
                          </div>
                          {exp.description && <p className="text-slate-700 text-[11px]">{exp.description}</p>}
                          {exp.highlights.filter(Boolean).length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700 pl-1">
                              {exp.highlights.filter(Boolean).map((hl, hIdx) => (
                                <li key={hIdx}>{hl}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Projects */}
                  {content.projects.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className={sectionTitleClass}>
                        {isTechnical && <span className="text-teal-500 font-mono">&gt;</span>} Projects
                      </h4>
                      {content.projects.map((proj, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className={`font-semibold text-slate-900 ${isTechnical ? 'font-mono text-teal-900' : ''}`}>
                              {proj.title || 'Project'}
                            </span>
                            {proj.technologies.length > 0 && (
                              <span className={`text-[10px] ${isTechnical ? 'font-mono bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200' : 'font-mono text-slate-500'}`}>
                                [{proj.technologies.join(', ')}]
                              </span>
                            )}
                          </div>
                          {proj.description && <p className="text-slate-700 text-[11px]">{proj.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills */}
                  {content.skills.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className={sectionTitleClass}>
                        {isTechnical && <span className="text-teal-500 font-mono">&gt;</span>} Technical Skills
                      </h4>
                      {isTechnical ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {content.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="font-mono text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : isClassic ? (
                        <p className="font-serif text-slate-800 text-[11px] leading-relaxed">
                          {content.skills.join('  ·  ')}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {content.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="font-sans text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Certifications */}
                  {content.certifications.length > 0 && (
                    <div className="space-y-2">
                      <h4 className={sectionTitleClass}>
                        {isTechnical && <span className="text-teal-500 font-mono">&gt;</span>} Certifications
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                        {content.certifications.map((c, i) => (
                          <li key={`c-${String(i)}`}>
                            <span className="font-medium">{c.name}</span> — {c.issuer}
                            {c.issueDate && <span className="text-slate-500"> ({c.issueDate}{c.expiryDate ? ` – ${c.expiryDate}` : ''})</span>}
                            {c.credentialUrl && (
                              <span className="ml-1 text-blue-600">[Verify ↗]</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Achievements */}
                  {content.achievements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className={sectionTitleClass}>
                        {isTechnical && <span className="text-teal-500 font-mono">&gt;</span>} Honors & Achievements
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                        {content.achievements.map((a, i) => (
                          <li key={`a-${String(i)}`}>
                            <span className="font-medium">{a.title}</span>
                            {a.date && <span className="text-slate-500"> ({a.date})</span>}
                            {a.description && <p className="ml-4 text-[10px] text-slate-600">{a.description}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Additional / Custom Sections */}
                  {content.customSections && content.customSections.length > 0 && (
                    <div className="space-y-3">
                      {content.customSections.map((sec, i) => (
                        <div key={sec.id || `preview-custom-${i}`} className="space-y-1.5">
                          <h4 className={sectionTitleClass}>
                            {isTechnical && <span className="text-teal-500 font-mono">&gt;</span>} {sec.title || 'Additional Section'}
                          </h4>
                          {sec.content && (
                            <p className={`text-[11px] whitespace-pre-line ${isClassic ? 'font-serif text-slate-800' : 'text-slate-700'}`}>
                              {sec.content}
                            </p>
                          )}
                          {sec.items && sec.items.filter(Boolean).length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700">
                              {sec.items.filter(Boolean).map((item, itemIdx) => (
                                <li key={itemIdx}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      <ResumeAnalysisModal
        isOpen={analysisModal.open}
        onClose={() => { setAnalysisModal({ open: false }); }}
        analysis={analysisModal.data}
        resumeTitle={title}
      />
    </div>
  );
}
