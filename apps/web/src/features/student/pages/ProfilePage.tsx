import {
  updateStudentProfileSchema,
  type ProjectEntry,
  type CertificationEntry,
  type AchievementEntry,
  type UpdateStudentProfileDto,
} from '@career-portal/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  Briefcase,
  Check,
  Code,
  Globe,
  GraduationCap,
  Link,
  Plus,
  Save,
  Trash2,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { getAcademicPrograms } from '@/features/academic/services/academic-api';

import {
  useBatches,
  useDepartments,
  useProfileCompletion,
  useStudentProfile,
  useUpdateProfile,
} from '../api/student-api';
import { ProfileCompletionWidget } from '../components/ProfileCompletionWidget';
import { SkillsManager } from '../components/SkillsManager';
import { Badge, Button, Skeleton } from '@/shared/components/ui';

export function ProfilePage(): React.JSX.Element {
  const { data: profile, isLoading: profileLoading } = useStudentProfile();
  const { data: completion, isLoading: completionLoading } = useProfileCompletion();
  const { data: departments } = useDepartments();
  const { data: batches } = useBatches();
  const updateProfileMutation = useUpdateProfile();

  const [activeTab, setActiveTab] = useState<'academic' | 'about' | 'skills' | 'projects' | 'certifications'>('academic');

  // Academic Master Data: Institutional Department statically locked to CSE
  const cseDept = departments?.find((d) => d.code === 'CSE') || departments?.[0];
  const { data: academicPrograms } = useQuery({
    queryKey: ['academic', 'programs-all'],
    queryFn: getAcademicPrograms,
  });

  const availablePrograms = (academicPrograms ?? []).filter(
    (p) => !cseDept || p.departmentId === cseDept.id || p.isActive,
  );

  // Projects, Certs, Achievements state
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [careerInterestsInput, setCareerInterestsInput] = useState('');
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [selectedStreamCode, setSelectedStreamCode] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateStudentProfileDto>({
    resolver: zodResolver(updateStudentProfileSchema),
  });

  const watchedProgramId = watch('programId');
  const selectedProgram = availablePrograms.find((p) => p.id === watchedProgramId);

  useEffect(() => {
    if (cseDept) {
      setValue('departmentId', cseDept.id);
    }
  }, [cseDept, setValue]);

  useEffect(() => {
    if (profile) {
      reset({
        rollNumber: profile.rollNumber,
        departmentId: cseDept?.id || profile.departmentId,
        programId: profile.programId,
        batchId: profile.batchId,
        cgpa: profile.cgpa ?? undefined,
        bio: profile.bio ?? '',
        linkedinUrl: profile.linkedinUrl ?? '',
        githubUrl: profile.githubUrl ?? '',
        portfolioUrl: profile.portfolioUrl ?? '',
      });
      setProjects(profile.projects);
      setCertifications(profile.certifications);
      setAchievements(profile.achievements);
      setCareerInterests(profile.careerInterests);

      // Check if profile has saved stream in careerInterests
      const foundStreamTag = (profile.careerInterests || []).find((ci) => ci.startsWith('Stream: '));
      if (foundStreamTag) {
        const streamMatch = foundStreamTag.match(/\(([^)]+)\)$/);
        setSelectedStreamCode(streamMatch?.[1] ? streamMatch[1] : foundStreamTag.replace('Stream: ', '').trim());
      }
    }
  }, [profile, reset, cseDept]);

  const handleStreamChange = (streamCode: string) => {
    setSelectedStreamCode(streamCode);
    setCareerInterests((prev) => {
      const filtered = prev.filter((item) => !item.startsWith('Stream: '));
      if (!streamCode) return filtered;
      const streamObj = selectedProgram?.streams?.find((s) => s.code === streamCode);
      const tag = streamObj ? `Stream: ${streamObj.name} (${streamObj.code})` : `Stream: ${streamCode}`;
      return [...filtered, tag];
    });
  };

  const onSubmit = async (data: UpdateStudentProfileDto) => {
    const finalDeptId = cseDept?.id || data.departmentId || profile?.departmentId;
    await updateProfileMutation.mutateAsync({
      ...data,
      departmentId: finalDeptId,
      projects,
      certifications,
      achievements,
      careerInterests,
    });
    setSaveSuccess(true);
    setTimeout(() => { setSaveSuccess(false); }, 3000);
  };

  // ── Project Helpers ──
  const addEmptyProject = () => {
    setProjects([
      ...projects,
      {
        title: '',
        description: '',
        technologies: [],
        link: '',
        githubUrl: '',
        isCurrent: false,
      },
    ]);
  };

  const updateProject = <K extends keyof ProjectEntry,>(index: number, field: K, value: ProjectEntry[K]) => {
    const updated = [...projects];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setProjects(updated);
    }
  };

  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  // ── Certification Helpers ──
  const addEmptyCert = () => {
    setCertifications([
      ...certifications,
      {
        name: '',
        issuer: '',
        issueDate: '',
        credentialUrl: '',
      },
    ]);
  };

  const updateCert = <K extends keyof CertificationEntry,>(index: number, field: K, value: CertificationEntry[K]) => {
    const updated = [...certifications];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setCertifications(updated);
    }
  };

  const removeCert = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  // ── Career Interests Helpers ──
  const addCareerInterest = () => {
    if (!careerInterestsInput.trim()) return;
    if (!careerInterests.includes(careerInterestsInput.trim())) {
      setCareerInterests([...careerInterests, careerInterestsInput.trim()]);
    }
    setCareerInterestsInput('');
  };

  const removeCareerInterest = (interest: string) => {
    setCareerInterests(careerInterests.filter((i) => i !== interest));
  };

  if (profileLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1536px] mx-auto space-y-8 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-xs">
            {profile?.fullName.charAt(0).toUpperCase() ?? 'S'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{profile?.fullName ?? 'Student Profile'}</h1>
              {profile?.isPlacementEligible ? (
                <Badge variant="success">Placement Eligible</Badge>
              ) : (
                <Badge variant="secondary">Non-placement track</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile?.rollNumber ? `Roll No: ${profile.rollNumber}` : 'Set your academic credentials'} ·{' '}
              {profile?.department?.name ?? 'Department not set'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => { void (handleSubmit(onSubmit))(); }}
          loading={updateProfileMutation.isPending}
          className="gap-2 self-start sm:self-auto"
        >
          {saveSuccess ? (
            <>
              <Check className="h-4 w-4" /> Changes Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left 2 Columns: Edit Form & Sections ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 border-b border-border pb-2">
            {[
              { id: 'academic', label: 'Academic Details', icon: GraduationCap },
              { id: 'about', label: 'Personal & Social', icon: User },
              { id: 'skills', label: 'Skills', icon: BookOpen },
              { id: 'projects', label: 'Projects', icon: Briefcase },
              { id: 'certifications', label: 'Certifications', icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as typeof activeTab); }}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Academic Details */}
          {activeTab === 'academic' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5"
            >
              <h3 className="text-base font-semibold text-foreground">Academic Information</h3>
              <p className="text-xs text-muted-foreground">
                Official institution enrollment data required for placement eligibility checks
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fixed CSE Department Institutional Banner */}
                <div className="sm:col-span-2 rounded-xl border border-primary/30 bg-primary/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Academic Department</span>
                    </div>
                    <span className="text-[11px] font-semibold text-primary bg-primary/20 px-2.5 py-0.5 rounded-full border border-primary/30">
                      Static Institutional Scope
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-foreground">
                    {cseDept?.name || 'Computer Science and Engineering'} ({cseDept?.code || 'CSE'})
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Portal enrollment and career tracks are dedicated to the Computer Science & Engineering department.
                  </p>
                  <input type="hidden" {...register('departmentId')} value={cseDept?.id || profile?.departmentId || ''} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Roll Number / Student ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('rollNumber')}
                    placeholder="e.g. 2022CSE045"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {errors.rollNumber && (
                    <p className="mt-1 text-xs text-destructive">{errors.rollNumber.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Current CGPA (0 - 10)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    {...register('cgpa', { valueAsNumber: true })}
                    placeholder="e.g. 8.75"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {errors.cgpa && <p className="mt-1 text-xs text-destructive">{errors.cgpa.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Academic Degree Course <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('programId')}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Select Degree Course --</option>
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.degreeLevel})
                      </option>
                    ))}
                  </select>
                  {errors.programId && <p className="mt-1 text-xs text-destructive">{errors.programId.message}</p>}
                </div>

                {selectedProgram && selectedProgram.streams && selectedProgram.streams.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Stream / Specialization
                    </label>
                    <select
                      value={selectedStreamCode}
                      onChange={(e) => { handleStreamChange(e.target.value); }}
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Select Stream / Specialization --</option>
                      {selectedProgram.streams.filter((s) => s.isActive).map((s) => (
                        <option key={s.id} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Graduation Batch <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('batchId')}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Select Batch Year --</option>
                    {batches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        Class of {b.graduationYear}
                      </option>
                    ))}
                  </select>
                  {errors.batchId && <p className="mt-1 text-xs text-destructive">{errors.batchId.message}</p>}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Personal & Social Links */}
          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5"
            >
              <h3 className="text-base font-semibold text-foreground">Personal & Professional Links</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Professional Bio</label>
                  <textarea
                    rows={4}
                    {...register('bio')}
                    placeholder="Summarize your background, interests, and engineering goals in 2-3 sentences..."
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                      <Link className="h-3.5 w-3.5 text-primary" />
                      LinkedIn Profile
                    </label>
                    <input
                      {...register('linkedinUrl')}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-foreground" />
                      GitHub Profile
                    </label>
                    <input
                      {...register('githubUrl')}
                      placeholder="https://github.com/..."
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                      Portfolio Website
                    </label>
                    <input
                      {...register('portfolioUrl')}
                      placeholder="https://yourportfolio.dev"
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Career Interests Tag Input */}
                <div className="pt-2">
                  <label className="block text-xs font-medium text-foreground mb-1">Career Interests & Target Roles</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={careerInterestsInput}
                      onChange={(e) => { setCareerInterestsInput(e.target.value); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCareerInterest();
                        }
                      }}
                      placeholder="e.g. Full Stack Developer, ML Engineer, Cloud Architect (Press Enter)"
                      className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={addCareerInterest}
                      className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {careerInterests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-muted border border-border/60 px-2.5 py-1 text-xs text-foreground"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => { removeCareerInterest(interest); }}
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Skills Manager */}
          {activeTab === 'skills' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <SkillsManager skills={profile?.skills || []} />
            </motion.div>
          )}

          {/* Tab 4: Projects */}
          {activeTab === 'projects' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Featured Projects</h3>
                  <p className="text-xs text-muted-foreground">Showcase technical depth, architecture, and impact</p>
                </div>
                <button
                  type="button"
                  onClick={addEmptyProject}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Project
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No projects added yet.</p>
                  <button
                    type="button"
                    onClick={addEmptyProject}
                    className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add your first project
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => { removeProject(idx); }}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Project Title</label>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) => { updateProject(idx, 'title', e.target.value); }}
                            placeholder="e.g. Distributed Task Queue"
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Technologies (comma separated)</label>
                          <input
                            type="text"
                            value={proj.technologies.join(', ')}
                            onChange={(e) =>
                              { updateProject(
                                idx,
                                'technologies',
                                e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                              ); }
                            }
                            placeholder="e.g. Go, Redis, Docker, gRPC"
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-foreground mb-1">Description & Impact</label>
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) => { updateProject(idx, 'description', e.target.value); }}
                          placeholder="Describe the architecture, your contribution, and quantifiable metrics..."
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Live Demo / Project URL</label>
                          <input
                            type="text"
                            value={proj.link || ''}
                            onChange={(e) => { updateProject(idx, 'link', e.target.value); }}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">GitHub Repo URL</label>
                          <input
                            type="text"
                            value={proj.githubUrl || ''}
                            onChange={(e) => { updateProject(idx, 'githubUrl', e.target.value); }}
                            placeholder="https://github.com/..."
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 5: Certifications */}
          {activeTab === 'certifications' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Certifications & Credentials</h3>
                  <p className="text-xs text-muted-foreground">Industry certifications verified by external providers</p>
                </div>
                <button
                  type="button"
                  onClick={addEmptyCert}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Certification
                </button>
              </div>

              {certifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No certifications added yet.</p>
                  <button
                    type="button"
                    onClick={addEmptyCert}
                    className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add your first certification
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {certifications.map((cert, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => { removeCert(idx); }}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition cursor-pointer"
                        title="Delete certification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Certification Name</label>
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) => { updateCert(idx, 'name', e.target.value); }}
                            placeholder="e.g. AWS Certified Solutions Architect"
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Issuing Organization</label>
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) => { updateCert(idx, 'issuer', e.target.value); }}
                            placeholder="e.g. Amazon Web Services, Google Cloud"
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Issue Date</label>
                          <input
                            type="month"
                            value={cert.issueDate || ''}
                            onChange={(e) => { updateCert(idx, 'issueDate', e.target.value); }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Credential URL</label>
                          <input
                            type="url"
                            value={cert.credentialUrl || ''}
                            onChange={(e) => { updateCert(idx, 'credentialUrl', e.target.value); }}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ── Right Column: Sticky Profile Readiness Widget ── */}
        <div className="space-y-6">
          <div className="sticky top-6">
            <ProfileCompletionWidget
              completion={completion}
              isLoading={completionLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
