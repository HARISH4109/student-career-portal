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
  Loader2,
  Plus,
  Save,
  Trash2,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  useBatches,
  useDepartments,
  useProfileCompletion,
  usePrograms,
  useStudentProfile,
  useUpdateProfile,
} from '../api/student-api';
import { ProfileCompletionWidget } from '../components/ProfileCompletionWidget';
import { SkillsManager } from '../components/SkillsManager';

export function ProfilePage(): React.JSX.Element {
  const { data: profile, isLoading: profileLoading } = useStudentProfile();
  const { data: completion, isLoading: completionLoading } = useProfileCompletion();
  const { data: departments } = useDepartments();
  const { data: batches } = useBatches();
  const updateProfileMutation = useUpdateProfile();

  const [activeTab, setActiveTab] = useState<'academic' | 'about' | 'skills' | 'projects' | 'certifications'>('academic');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const { data: programs } = usePrograms(selectedDeptId || profile?.departmentId);

  // Projects, Certs, Achievements state
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [careerInterestsInput, setCareerInterestsInput] = useState('');
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateStudentProfileDto>({
    resolver: zodResolver(updateStudentProfileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        rollNumber: profile.rollNumber,
        departmentId: profile.departmentId,
        programId: profile.programId,
        batchId: profile.batchId,
        cgpa: profile.cgpa ?? undefined,
        bio: profile.bio ?? '',
        linkedinUrl: profile.linkedinUrl ?? '',
        githubUrl: profile.githubUrl ?? '',
        portfolioUrl: profile.portfolioUrl ?? '',
      });
      setSelectedDeptId(profile.departmentId);
      setProjects(profile.projects);
      setCertifications(profile.certifications);
      setAchievements(profile.achievements);
      setCareerInterests(profile.careerInterests);
    }
  }, [profile, reset]);

  const onSubmit = async (data: UpdateStudentProfileDto) => {
    await updateProfileMutation.mutateAsync({
      ...data,
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
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading student profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-md">
            {profile?.fullName.charAt(0).toUpperCase() ?? 'S'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{profile?.fullName ?? 'Student Profile'}</h1>
              {profile?.isPlacementEligible ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  Placement Eligible
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  Non-placement track
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {profile?.rollNumber ? `Roll No: ${profile.rollNumber}` : 'Set your academic credentials'} ·{' '}
              {profile?.department?.name ?? 'Department not set'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { void (handleSubmit(onSubmit))(); }}
          disabled={updateProfileMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {updateProfileMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveSuccess ? (
            <Check className="h-4 w-4 text-emerald-300" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveSuccess ? 'Changes Saved!' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left 2 Columns: Edit Form & Sections ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2">
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
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
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
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
            >
              <h3 className="text-base font-semibold text-slate-900">Academic Information</h3>
              <p className="text-xs text-slate-500">
                Official institution enrollment data required for placement eligibility checks
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Roll Number / Student ID</label>
                  <input
                    {...register('rollNumber')}
                    placeholder="e.g. 2022CSE045"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  {errors.rollNumber && (
                    <p className="mt-1 text-xs text-red-600">{errors.rollNumber.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Current CGPA (0 - 10)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    {...register('cgpa', { valueAsNumber: true })}
                    placeholder="e.g. 8.75"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  {errors.cgpa && <p className="mt-1 text-xs text-red-600">{errors.cgpa.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                  <select
                    {...register('departmentId')}
                    onChange={(e) => {
                      void register('departmentId').onChange(e);
                      setSelectedDeptId(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select Department --</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Academic Program</label>
                  <select
                    {...register('programId')}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select Program --</option>
                    {programs?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.degreeLevel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Graduation Batch</label>
                  <select
                    {...register('batchId')}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select Batch Year --</option>
                    {batches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        Class of {b.graduationYear}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Personal & Social Links */}
          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
            >
              <h3 className="text-base font-semibold text-slate-900">Personal & Professional Links</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Professional Bio</label>
                  <textarea
                    rows={4}
                    {...register('bio')}
                    placeholder="Summarize your background, interests, and engineering goals in 2-3 sentences..."
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                      <Link className="h-3.5 w-3.5 text-blue-600" />
                      LinkedIn Profile
                    </label>
                    <input
                      {...register('linkedinUrl')}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-slate-800" />
                      GitHub Profile
                    </label>
                    <input
                      {...register('githubUrl')}
                      placeholder="https://github.com/..."
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-emerald-600" />
                      Portfolio Website
                    </label>
                    <input
                      {...register('portfolioUrl')}
                      placeholder="https://yourportfolio.dev"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Career Interests Tag Input */}
                <div className="pt-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Career Interests & Target Roles</label>
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
                      className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCareerInterest}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {careerInterests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => { removeCareerInterest(interest); }}
                          className="text-slate-400 hover:text-red-600"
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
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <SkillsManager skills={profile?.skills || []} />
            </motion.div>
          )}

          {/* Tab 4: Projects */}
          {activeTab === 'projects' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Featured Projects</h3>
                  <p className="text-xs text-slate-500">Showcase technical depth, architecture, and impact</p>
                </div>
                <button
                  type="button"
                  onClick={addEmptyProject}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Project
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-500">No projects added yet.</p>
                  <button
                    type="button"
                    onClick={addEmptyProject}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add your first project
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => { removeProject(idx); }}
                        className="absolute right-3 top-3 text-slate-400 hover:text-red-600 transition"
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Project Title</label>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) => { updateProject(idx, 'title', e.target.value); }}
                            placeholder="e.g. Distributed Task Queue"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Technologies (comma separated)</label>
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
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Description & Impact</label>
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) => { updateProject(idx, 'description', e.target.value); }}
                          placeholder="Describe the architecture, your contribution, and quantifiable metrics..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Live Demo / Project URL</label>
                          <input
                            type="text"
                            value={proj.link || ''}
                            onChange={(e) => { updateProject(idx, 'link', e.target.value); }}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">GitHub Repo URL</label>
                          <input
                            type="text"
                            value={proj.githubUrl || ''}
                            onChange={(e) => { updateProject(idx, 'githubUrl', e.target.value); }}
                            placeholder="https://github.com/..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
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
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Certifications & Credentials</h3>
                  <p className="text-xs text-slate-500">Industry certifications verified by external providers</p>
                </div>
                <button
                  type="button"
                  onClick={addEmptyCert}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Certification
                </button>
              </div>

              {certifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-500">No certifications added yet.</p>
                  <button
                    type="button"
                    onClick={addEmptyCert}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add your first certification
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {certifications.map((cert, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => { removeCert(idx); }}
                        className="absolute right-3 top-3 text-slate-400 hover:text-red-600 transition"
                        title="Delete certification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Certification Name</label>
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) => { updateCert(idx, 'name', e.target.value); }}
                            placeholder="e.g. AWS Certified Solutions Architect"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Issuing Organization</label>
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) => { updateCert(idx, 'issuer', e.target.value); }}
                            placeholder="e.g. Amazon Web Services, Google Cloud"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Issue Date</label>
                          <input
                            type="month"
                            value={cert.issueDate || ''}
                            onChange={(e) => { updateCert(idx, 'issueDate', e.target.value); }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Credential URL</label>
                          <input
                            type="url"
                            value={cert.credentialUrl || ''}
                            onChange={(e) => { updateCert(idx, 'credentialUrl', e.target.value); }}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
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
