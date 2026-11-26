import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface WorkflowStation {
  id: string;
  step: string;
  label: string;
  to: string;
}

export const STUDENT_STATIONS: WorkflowStation[] = [
  { id: 'roadmap', step: '01', label: 'Roadmap & Skills', to: '/dashboard/roadmap' },
  { id: 'resume', step: '02', label: 'ATS Resume', to: '/dashboard/resumes' },
  { id: 'preparation', step: '03', label: 'Mock Practice', to: '/dashboard/preparation' },
  { id: 'offer', step: '04', label: 'Land Offer', to: '/dashboard/opportunities' },
];

export const FACULTY_STATIONS: WorkflowStation[] = [
  { id: 'verify', step: '01', label: 'Extract & Verify Drive', to: '/dashboard/opportunities/manage' },
  { id: 'match', step: '02', label: 'Assess & Match', to: '/dashboard/preparation' },
  { id: 'notify', step: '03', label: 'Publish & Notify', to: '/dashboard/notices' },
];

export const ADMIN_STATIONS: WorkflowStation[] = [
  { id: 'programs', step: '01', label: 'Programs & Roles', to: '/dashboard/programs' },
  { id: 'ops', step: '02', label: 'AI & Server Ops', to: '/dashboard/admin' },
  { id: 'security', step: '03', label: 'Audit & Security', to: '/dashboard/analytics' },
];

const STUDENT_STATUS_MESSAGES = [
  '01 • Exploring Career Roadmap & Target Skills with Study Partner...',
  '02 • Typing ATS Resume at Laptop while Mentor Reviews Score (94%)...',
  '03 • Panelist Interviewer & Student in Active Technical Q&A Practice...',
  '04 • High-Fiving Classmates & Celebrating Campus Placement Offer! ✓',
];

const FACULTY_STATUS_MESSAGES = [
  '01 • Placement Officer Stamping Approval on Recruiter Drive Brochure...',
  '02 • Faculty Mentor Matching Qualified Student Cohort to Recruiter Tower...',
  '03 • Faculty Lead Broadcasting Live Drive Alert to Cheering Students! ✓',
];

const ADMIN_STATUS_MESSAGES = [
  '01 • Curriculum Architect & Dean Actively Meshing Academic Gears...',
  '02 • DevOps & Cloud Engineers Monitoring Server Rack & Live Oscilloscope...',
  '03 • Security Officer Engaging Shield & Auditor Stamping 100% Pass! ✓',
];

/**
 * Shared hook to cycle cleanly through sequential active station indices.
 * When hovered, holds on that station for manual inspection.
 */
function useStationCycle(totalStations: number, intervalMs = 3600, hoveredIdx: number | null): number {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (hoveredIdx !== null) return;

    const timer = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % totalStations);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [totalStations, intervalMs, hoveredIdx]);

  return hoveredIdx !== null ? hoveredIdx : activeIdx;
}

/**
 * Lightweight, seamless milestone strip beneath the panoramic stage.
 * Never boxed in; integrates directly into the global banner surface.
 */
function ActionableStationStrip({
  stations,
  activeIdx,
  onHoverStation,
}: {
  stations: WorkflowStation[];
  activeIdx: number;
  onHoverStation: (idx: number | null) => void;
}): React.JSX.Element {
  return (
    <div
      className={`grid gap-2 mt-1.5 ${
        stations.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
      }`}
    >
      {stations.map((station, idx) => {
        const isCurrent = idx === activeIdx;
        const isCompleted = idx < activeIdx;
        return (
          <Link
            key={station.id}
            to={station.to}
            onMouseEnter={() => onHoverStation(idx)}
            onMouseLeave={() => onHoverStation(null)}
            className={`group relative flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-left transition-all border ${
              isCurrent
                ? 'border-[#B9903B]/70 bg-[#B9903B]/10 text-foreground shadow-xs ring-1 ring-[#B9903B]/30'
                : isCompleted
                  ? 'border-[#065F43]/30 bg-[#065F43]/5 text-foreground hover:border-[#065F43]/50'
                  : 'border-border/50 bg-background/50 text-muted-foreground hover:border-border hover:bg-background/80 hover:text-foreground'
            }`}
          >
            <div className="min-w-0 flex items-center gap-1.5">
              {isCompleted ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#10B981] dark:text-emerald-400" />
              ) : (
                <span
                  className={`text-[10px] font-mono font-bold shrink-0 tabular-nums ${
                    isCurrent ? 'text-[#B9903B]' : 'text-muted-foreground/60'
                  }`}
                >
                  {station.step}
                </span>
              )}
              <span className="truncate text-[11px] font-medium leading-tight">
                {station.label}
              </span>
            </div>
            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. STUDENT STICK ANIMATION: Collaborative Multi-Student Journey
 * Zero-flicker architecture:
 *   - Unified ground baseline at y=104 for ALL stations (no floating characters)
 *   - Joint-anchored pivot transforms (transform-origin: 0 0 on local groups)
 *   - Rock-solid stability without class-toggle jumps
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function StudentStickAnimation({
  className = 'w-full',
}: {
  className?: string;
}): React.JSX.Element {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const activeIdx = useStationCycle(4, 3600, hoveredIdx);

  return (
    <div className={`w-full flex flex-col justify-between ${className}`}>
      {/* Stage Top Bar: Real-time Live Action Display */}
      <div className="flex items-center justify-between gap-2 mb-1 px-1 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="truncate font-medium text-foreground text-[11px]">
            {STUDENT_STATUS_MESSAGES[activeIdx]}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-semibold text-[#B9903B] tracking-wide">
          Student Journey • Auto Loop
        </span>
      </div>

      {/* SVG Canvas Stage: Unified Ground Plane at y=104, Stable Zero-Flicker Actions */}
      <svg
        viewBox="0 0 580 120"
        className="w-full h-24 sm:h-28 overflow-visible"
        aria-hidden="true"
      >
        <style>{`
          /* Joint-anchored pivot rotations (transform-origin: 0 0) - Zero jitter, zero detachment */
          @keyframes studArmPoint {
            0%, 100% { transform: rotate(-18deg); }
            50% { transform: rotate(12deg); }
          }
          @keyframes studHeadBob {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(6deg); }
          }
          @keyframes studPartnerNodHead {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-8deg); }
          }
          @keyframes studTypeL {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(12deg); }
          }
          @keyframes studTypeR {
            0%, 100% { transform: rotate(12deg); }
            50% { transform: rotate(-8deg); }
          }
          @keyframes studScreenLight {
            0%, 100% { opacity: 0.25; }
            50% { opacity: 0.85; }
          }
          @keyframes studInterviewTalk {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-18deg); }
          }
          @keyframes studBubblePulse {
            0%, 100% { opacity: 0.7; transform: scale(0.97); }
            50% { opacity: 1; transform: scale(1.04); }
          }
          @keyframes studH5SwingL {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(28deg); }
          }
          @keyframes studH5SwingR {
            0%, 100% { transform: rotate(5deg); }
            50% { transform: rotate(-28deg); }
          }
          @keyframes studDiplomaWave {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-12deg); }
          }
          @keyframes studFlagFlutter {
            0%, 100% { transform: skewY(0deg) scaleX(1); }
            50% { transform: skewY(6deg) scaleX(0.95); }
          }
          @keyframes studSparkPulse {
            0%, 100% { transform: scale(0.7); opacity: 0.3; }
            50% { transform: scale(1.2); opacity: 1; }
          }

          .anim-point-arm { transform-origin: 0 0; animation: studArmPoint 1.8s infinite ease-in-out; }
          .anim-head-bob { transform-origin: 0 0; animation: studHeadBob 2s infinite ease-in-out; }
          .anim-partner-nod { transform-origin: 0 0; animation: studPartnerNodHead 1.4s infinite ease-in-out; }
          .anim-type-l { transform-origin: 0 0; animation: studTypeL 0.28s infinite ease-in-out; }
          .anim-type-r { transform-origin: 0 0; animation: studTypeR 0.28s infinite ease-in-out; }
          .anim-screen-glow { animation: studScreenLight 1.6s infinite ease-in-out; }
          .anim-talk-gesture { transform-origin: 0 0; animation: studInterviewTalk 1.4s infinite ease-in-out; }
          .anim-bubble-q { transform-origin: 12px 6px; animation: studBubblePulse 2s infinite ease-in-out; }
          .anim-bubble-a { transform-origin: 13px 6px; animation: studBubblePulse 2s infinite ease-in-out 0.4s; }
          .anim-h5-l { transform-origin: 0 0; animation: studH5SwingL 1.2s infinite ease-in-out; }
          .anim-h5-r { transform-origin: 0 0; animation: studH5SwingR 1.2s infinite ease-in-out; }
          .anim-diploma-wave { transform-origin: 0 0; animation: studDiplomaWave 1.2s infinite ease-in-out; }
          .anim-flag { transform-origin: 0 0; animation: studFlagFlutter 1.4s infinite ease-in-out; }
          .anim-spark { transform-origin: 0 0; animation: studSparkPulse 1.2s infinite ease-in-out; }
        `}</style>

        {/* Unified Ground Baseline at y=104 */}
        <line x1="20" y1="104" x2="560" y2="104" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.15" />

        {/* Milestone Ground Connectors */}
        <path
          d="M 80 104 L 210 104 M 270 104 L 350 104 M 410 104 L 470 104"
          fill="none"
          stroke="#B9903B"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.35"
        />

        {/* ═══════════════════════════════════════════════════════════════
            STATION 0: Roadmap & Skills Explorer (Center x=75, Feet on ground y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 0 ? 1 : activeIdx > 0 ? 0.85 : 0.45, transition: 'opacity 300ms ease' }}>
          {/* Milestone Signpost */}
          <line x1="38" y1="62" x2="38" y2="104" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
          <polygon points="38,64 62,64 68,69 62,74 38,74" fill="#092749" stroke="#B9903B" strokeWidth="1.2" />
          <text x="41" y="71" fontSize="6" fill="#F4F1EA" fontWeight="700">ROADMAP</text>
          <polygon points="38,76 22,76 16,81 22,86 38,86" fill="var(--card, #fff)" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
          <text x="20" y="83" fontSize="6" fill="currentColor" fontWeight="700">SKILLS</text>

          {/* Student 1: Explorer pointing at signpost - Head at y=68, feet at y=104 */}
          <g transform="translate(68, 68)">
            {/* Head */}
            <g className="anim-head-bob">
              <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
              <polygon points="0,-6 7,-3 0,-1 -7,-3" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
            </g>
            {/* Torso */}
            <line x1="0" y1="5.5" x2="0" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Stable Legs firmly on ground (68+36 = 104) */}
            <line x1="0" y1="22" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Right arm passive */}
            <line x1="0" y1="10" x2="6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            {/* Left arm anchored at shoulder joint (0, 10) - Pointers with zero-flicker rotation */}
            <g transform="translate(0, 10)">
              <g className="anim-point-arm">
                <line x1="0" y1="0" x2="-16" y2="-8" stroke="#B9903B" strokeWidth="2.2" strokeLinecap="round" />
                <polygon points="-16,-8 -13,-11 -12,-6" fill="#B9903B" />
              </g>
            </g>
          </g>

          {/* Student 2: Peer Study Partner holding notebook - Feet at y=104 */}
          <g transform="translate(94, 68)">
            <g className="anim-partner-nod">
              <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            </g>
            <line x1="0" y1="5.5" x2="0" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Holds checklist tablet */}
            <path d="M 0 10 L -6 16 L -12 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <rect x="-16" y="10" width="7" height="9" rx="1" fill="#065F43" />
            <line x1="-14" y1="13" x2="-10" y2="13" stroke="#F4F1EA" strokeWidth="1" />
            <line x1="-14" y1="16" x2="-11" y2="16" stroke="#F4F1EA" strokeWidth="1" />
            <line x1="0" y1="10" x2="6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Persistent completed checkmark */}
          {activeIdx > 0 && <circle cx="68" cy="54" r="5.5" fill="#10B981" />}
        </g>

        {/* ═══════════════════════════════════════════════════════════════
            STATION 1: ATS Resume Lab (Center x=210, Feet on ground y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 1 ? 1 : activeIdx > 1 ? 0.85 : 0.45, transition: 'opacity 300ms ease' }}>
          {/* Study Desk (feet at y=104, desk top at y=88) */}
          <rect x="180" y="88" width="48" height="16" rx="2" fill="currentColor" opacity="0.08" />
          <line x1="184" y1="88" x2="184" y2="104" stroke="currentColor" strokeWidth="1.8" opacity="0.4" />
          <line x1="224" y1="88" x2="224" y2="104" stroke="currentColor" strokeWidth="1.8" opacity="0.4" />
          {/* Laptop on desk */}
          <line x1="202" y1="88" x2="216" y2="88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="216" y1="88" x2="222" y2="74" stroke="#B9903B" strokeWidth="2" strokeLinecap="round" />
          {/* Active Screen Emission Light */}
          <polygon points="222,74 230,70 234,84 216,88" fill="#10B981" opacity="0.3" className="anim-screen-glow" />

          {/* Student 3: Seated typing at laptop - Feet at y=104 (68+36) */}
          <g transform="translate(196, 68)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <line x1="0" y1="5.5" x2="0" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Stable seated legs */}
            <path d="M 0 21 L 9 21 L 9 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Left typing arm anchored at (0, 9) */}
            <g transform="translate(0, 9)">
              <g className="anim-type-l">
                <line x1="0" y1="0" x2="10" y2="5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            </g>
            {/* Right typing arm anchored at (0, 9) */}
            <g transform="translate(0, 9)">
              <g className="anim-type-r">
                <line x1="0" y1="0" x2="14" y2="7" stroke="#B9903B" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* ATS Resume Card with score */}
          <rect x="232" y="64" width="20" height="26" rx="2" fill="var(--card, #fff)" stroke="#B9903B" strokeWidth="1.4" />
          <line x1="235" y1="70" x2="247" y2="70" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
          <line x1="235" y1="74" x2="245" y2="74" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
          <rect x="235" y="80" width="14" height="6" rx="1" fill="#065F43" />
          <text x="236" y="85" fontSize="4.5" fill="#F4F1EA" fontWeight="700">94%</text>

          {/* Student 4: Resume Mentor standing reviewing score - Feet at y=104 */}
          <g transform="translate(262, 68)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <line x1="0" y1="5.5" x2="0" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="-14" y2="8" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {activeIdx > 1 && <circle cx="242" cy="56" r="5.5" fill="#10B981" />}
        </g>

        {/* ═══════════════════════════════════════════════════════════════
            STATION 2: Mock Interview Practice (Center x=350, Feet on ground y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 2 ? 1 : activeIdx > 2 ? 0.85 : 0.45, transition: 'opacity 300ms ease' }}>
          {/* Interview Table (legs down to y=104, table top at y=84) */}
          <rect x="330" y="84" width="46" height="20" rx="2" fill="#065F43" opacity="0.15" />
          <line x1="324" y1="84" x2="382" y2="84" stroke="#065F43" strokeWidth="2" strokeLinecap="round" />
          <line x1="334" y1="84" x2="334" y2="104" stroke="currentColor" strokeWidth="1.8" opacity="0.4" />
          <line x1="372" y1="84" x2="372" y2="104" stroke="currentColor" strokeWidth="1.8" opacity="0.4" />

          {/* Student 5: Corporate Interviewer - Seated feet on ground */}
          <g transform="translate(318, 68)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <circle cx="1.8" cy="-0.5" r="1.3" fill="none" stroke="#B9903B" strokeWidth="1" />
            <line x1="0" y1="5.5" x2="0" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M 0 21 L 8 21 L 8 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="0" y1="9" x2="10" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="9" y="8" width="6" height="8" rx="1" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
          </g>

          {/* Dialogue Speech Bubble 1: Interviewer Q */}
          <g transform="translate(314, 46)">
            <g className="anim-bubble-q">
              <rect x="0" y="0" width="24" height="13" rx="2" fill="#092749" stroke="#B9903B" strokeWidth="1" />
              <text x="3" y="9" fontSize="5.5" fill="#F4F1EA" fontWeight="700">Q &amp; A</text>
            </g>
          </g>

          {/* Dialogue Speech Bubble 2: Student Verified Answer */}
          <g transform="translate(362, 46)">
            <g className="anim-bubble-a">
              <rect x="0" y="0" width="26" height="13" rx="2" fill="#065F43" stroke="#10B981" strokeWidth="1" />
              <text x="3" y="9" fontSize="5.5" fill="#F4F1EA" fontWeight="700">PASS ✓</text>
            </g>
          </g>

          {/* Student 6: Candidate - Seated feet on ground, gesturing while answering */}
          <g transform="translate(388, 68)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <polygon points="0,-6 7,-3 0,-1 -7,-3" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
            <line x1="0" y1="5.5" x2="0" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M 0 21 L -8 21 L -8 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Gesture arm anchored at shoulder (0, 9) */}
            <g transform="translate(0, 9)">
              <g className="anim-talk-gesture">
                <line x1="0" y1="0" x2="-12" y2="-3" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            </g>
            <line x1="0" y1="9" x2="6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {activeIdx > 2 && <circle cx="350" cy="54" r="5.5" fill="#10B981" />}
        </g>

        {/* ═══════════════════════════════════════════════════════════════
            STATION 3: Land Offer Dais & High-Five (Center x=480, Feet on dais y=96)
            FIX: Low 8px award dais so characters match the visual horizon of other stations!
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 3 ? 1 : 0.55, transition: 'opacity 300ms ease' }}>
          {/* Low profile 8px award dais: y=96 to y=104 */}
          <rect x="446" y="96" width="80" height="8" rx="2" fill="#B9903B" opacity={activeIdx === 3 ? 0.35 : 0.15} />
          <line x1="446" y1="96" x2="526" y2="96" stroke="#B9903B" strokeWidth="2" strokeLinecap="round" />

          {/* Victory Flagpole on dais */}
          <line x1="520" y1="36" x2="520" y2="96" stroke="#B9903B" strokeWidth="2.2" strokeLinecap="round" />
          <g transform="translate(520, 36)">
            <polygon points="0,0 26,7 0,14" fill="#B9903B" className="anim-flag" />
          </g>

          {/* Student 7: Placed Student waving raised diploma - Feet on dais y=96 (60+36) */}
          <g transform="translate(466, 60)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <polygon points="0,-6 7,-3 0,-1 -7,-3" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
            <line x1="0" y1="5.5" x2="0" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Stable legs firmly on dais */}
            <line x1="0" y1="21" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="21" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Raised diploma arm anchored at shoulder (0, 9) */}
            <g transform="translate(0, 9)">
              <g className="anim-diploma-wave">
                <line x1="0" y1="0" x2="-12" y2="-12" stroke="#B9903B" strokeWidth="2.2" strokeLinecap="round" />
                <rect x="-16" y="-16" width="8" height="4" rx="1" fill="#F4F1EA" stroke="#B9903B" strokeWidth="0.8" transform="rotate(-20 -12 -14)" />
              </g>
            </g>
            {/* High-five right arm anchored at shoulder (0, 9) */}
            <g transform="translate(0, 9)">
              <g className="anim-h5-l">
                <line x1="0" y1="0" x2="12" y2="-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* Student 8: Placed Classmate high-fiving together - Feet on dais y=96 */}
          <g transform="translate(492, 60)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <polygon points="0,-6 7,-3 0,-1 -7,-3" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
            <line x1="0" y1="5.5" x2="0" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="21" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="21" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* High-five left arm anchored at shoulder (0, 9) */}
            <g transform="translate(0, 9)">
              <g className="anim-h5-r">
                <line x1="0" y1="0" x2="-14" y2="-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            </g>
            <line x1="0" y1="9" x2="8" y2="18" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Contact spark burst between hands */}
          <g transform="translate(478, 59)">
            <g className="anim-spark">
              <polygon points="0,-5 2,-2 5,0 2,2 0,5 -2,2 -5,0 -2,-2" fill="#B9903B" />
              <circle cx="0" cy="0" r="1.8" fill="#10B981" />
            </g>
          </g>

          {activeIdx === 3 && (
            <text x="466" y="90" fontSize="8" fontWeight="800" fill="#B9903B">OFFER ✓</text>
          )}
        </g>
      </svg>

      {/* Actionable Station Milestone Strip */}
      <ActionableStationStrip
        stations={STUDENT_STATIONS}
        activeIdx={activeIdx}
        onHoverStation={setHoveredIdx}
      />
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. FACULTY STICK ANIMATION: Collaborative Placement Operations Team
 * Zero-flicker architecture:
 *   - Unified ground baseline at y=104 for ALL stations
 *   - Joint-anchored pivot transforms (transform-origin: 0 0 on local groups)
 *   - Rock-solid stability without class-toggle jumps
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function FacultyStickAnimation({
  className = 'w-full',
}: {
  className?: string;
}): React.JSX.Element {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const activeIdx = useStationCycle(3, 3600, hoveredIdx);

  return (
    <div className={`w-full flex flex-col justify-between ${className}`}>
      {/* Stage Top Bar: Real-time Live Action Display */}
      <div className="flex items-center justify-between gap-2 mb-1 px-1 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="truncate font-medium text-foreground text-[11px]">
            {FACULTY_STATUS_MESSAGES[activeIdx]}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-semibold text-[#B9903B] tracking-wide">
          Faculty Pipeline • Auto Loop
        </span>
      </div>

      {/* SVG Canvas Stage: Unified Ground Plane at y=104, Stable Zero-Flicker Actions */}
      <svg
        viewBox="0 0 580 120"
        className="w-full h-24 sm:h-28 overflow-visible"
        aria-hidden="true"
      >
        <style>{`
          /* Joint-anchored pivot rotations (transform-origin: 0 0) */
          @keyframes facStampCycle {
            0%, 100% { transform: rotate(-15deg); }
            40% { transform: rotate(12deg); }
            50% { transform: rotate(18deg) translateY(3px); }
            60% { transform: rotate(-15deg); }
          }
          @keyframes facLaserMove {
            0%, 100% { transform: translateY(0); opacity: 0.95; }
            50% { transform: translateY(12px); opacity: 0.35; }
          }
          @keyframes facInkBadge {
            0% { transform: scale(0.6); opacity: 0; }
            30% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
          }
          @keyframes facPointerSweep {
            0%, 100% { transform: rotate(-14deg); }
            50% { transform: rotate(16deg); }
          }
          @keyframes facBarH1 {
            0%, 100% { height: 12px; }
            50% { height: 20px; }
          }
          @keyframes facBarH2 {
            0%, 100% { height: 22px; }
            50% { height: 32px; }
          }
          @keyframes facBarH3 {
            0%, 100% { height: 30px; }
            50% { height: 38px; }
          }
          @keyframes facSoundWave1 {
            0% { r: 6px; opacity: 0.95; }
            100% { r: 24px; opacity: 0; }
          }
          @keyframes facSoundWave2 {
            0% { r: 12px; opacity: 0.95; }
            100% { r: 32px; opacity: 0; }
          }
          @keyframes facCheerArmMove {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-25deg); }
          }

          .anim-fac-stamp { transform-origin: 0 0; animation: facStampCycle 1.4s infinite ease-in-out; }
          .anim-laser { animation: facLaserMove 1.4s infinite ease-in-out; }
          .anim-ink { transform-origin: 0 0; animation: facInkBadge 1.4s infinite ease-in-out; }
          .anim-pointer { transform-origin: 0 0; animation: facPointerSweep 1.8s infinite ease-in-out; }
          .anim-bar-1 { animation: facBarH1 1.8s infinite ease-in-out; }
          .anim-bar-2 { animation: facBarH2 1.8s infinite ease-in-out 0.2s; }
          .anim-bar-3 { animation: facBarH3 1.8s infinite ease-in-out 0.4s; }
          .anim-sound-1 { animation: facSoundWave1 1.6s infinite ease-out; }
          .anim-sound-2 { animation: facSoundWave2 1.6s infinite 0.5s ease-out; }
          .anim-cheer-arm { transform-origin: 0 0; animation: facCheerArmMove 0.8s infinite ease-in-out; }
        `}</style>

        {/* Unified Ground Baseline at y=104 */}
        <line x1="20" y1="104" x2="560" y2="104" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.15" />

        {/* Connected Campus Pipeline */}
        <path
          d="M 140 104 L 230 104 M 350 104 L 430 104"
          fill="none"
          stroke="#B9903B"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.35"
        />

        {/* ═══════════════════════════════════════════════════════════════
            STATION 0: Verify Drive (Faculty Lead + HR Liaison, Feet at y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 0 ? 1 : activeIdx > 0 ? 0.85 : 0.45, transition: 'opacity 300ms ease' }}>
          {/* Review Desk (feet touch y=104) */}
          <rect x="76" y="84" width="52" height="20" rx="2" fill="currentColor" opacity="0.08" />
          <line x1="82" y1="84" x2="82" y2="104" stroke="currentColor" strokeWidth="1.8" opacity="0.4" />
          <line x1="122" y1="84" x2="122" y2="104" stroke="currentColor" strokeWidth="1.8" opacity="0.4" />

          {/* Drive Dossier Document with sweeping laser line */}
          <g transform="translate(88, 66)">
            <rect x="0" y="0" width="30" height="20" rx="2" fill="var(--card, #fff)" stroke="#B9903B" strokeWidth="1.4" />
            <line x1="2" y1="4" x2="28" y2="4" stroke="#10B981" strokeWidth="2" className="anim-laser" />
            {/* Ink ring when approved */}
            <g transform="translate(15, 12)">
              <g className="anim-ink">
                <circle cx="0" cy="0" r="4.5" fill="none" stroke="#10B981" strokeWidth="1.4" />
                <text x="-4" y="2" fontSize="4" fill="#10B981" fontWeight="800">OK</text>
              </g>
            </g>
          </g>

          {/* Faculty 1: Placement Officer with stamping arm anchored at shoulder (0, 10) */}
          <g transform="translate(60, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <circle cx="-1.8" cy="-0.5" r="1.3" fill="none" stroke="#B9903B" strokeWidth="1" />
            <circle cx="1.8" cy="-0.5" r="1.3" fill="none" stroke="#B9903B" strokeWidth="1" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <polygon points="0,8 -2,13 0,17 2,13" fill="#065F43" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Stamping arm anchored at shoulder joint (0, 10) */}
            <g transform="translate(0, 10)">
              <g className="anim-fac-stamp">
                <line x1="0" y1="0" x2="16" y2="2" stroke="#B9903B" strokeWidth="2.4" strokeLinecap="round" />
                <rect x="14" y="-1" width="6" height="6" rx="1" fill="#B9903B" />
              </g>
            </g>
            <line x1="0" y1="10" x2="-6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Corporate HR Liaison (handing dossier across desk) - Feet at y=104 */}
          <g transform="translate(142, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="-14" y2="8" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {activeIdx > 0 && <circle cx="103" cy="54" r="5.5" fill="#10B981" />}
        </g>

        {/* ═══════════════════════════════════════════════════════════════
            STATION 1: Assess & Match (Mentor + 2 Student Candidates, Feet at y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 1 ? 1 : activeIdx > 1 ? 0.85 : 0.45, transition: 'opacity 300ms ease' }}>
          {/* Cohort Readiness Whiteboard on easel (feet touch y=104) */}
          <rect x="246" y="42" width="48" height="42" rx="3" fill="var(--card, #fff)" stroke="#B9903B" strokeWidth="1.4" />
          <line x1="270" y1="84" x2="270" y2="104" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          {/* Dynamic Bouncing Readiness Bars */}
          <rect x="254" y="68" width="6" height="14" rx="1" fill="#065F43" className="anim-bar-1" />
          <rect x="265" y="58" width="6" height="24" rx="1" fill="#B9903B" className="anim-bar-2" />
          <rect x="276" y="50" width="6" height="32" rx="1" fill="#10B981" className="anim-bar-3" />

          {/* Corporate Recruiter Glass Tower (grounded on y=104) */}
          <rect x="340" y="44" width="32" height="60" rx="3" fill="#092749" stroke="#B9903B" strokeWidth="1.4" />
          <rect x="346" y="52" width="8" height="8" rx="1" fill="#B9903B" />
          <rect x="358" y="52" width="8" height="8" rx="1" fill="#F4F1EA" opacity="0.4" />
          <rect x="346" y="66" width="8" height="8" rx="1" fill="#10B981" />
          <rect x="358" y="66" width="8" height="8" rx="1" fill="#B9903B" />

          {/* Faculty 2: Mentor sweeping pointer across board - Feet at y=104 */}
          <g transform="translate(230, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <circle cx="1.8" cy="-0.5" r="1.3" fill="none" stroke="#B9903B" strokeWidth="1" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Pointer arm anchored at shoulder joint (0, 10) */}
            <g transform="translate(0, 10)">
              <g className="anim-pointer">
                <line x1="0" y1="0" x2="18" y2="-6" stroke="#B9903B" strokeWidth="2.4" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* Student Candidate 1 stepping toward tower - Feet at y=104 */}
          <g transform="translate(305, 68)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <polygon points="0,-6 7,-3 0,-1 -7,-3" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
            <line x1="0" y1="5.5" x2="0" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="10" y2="12" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Student Candidate 2 in queue - Feet at y=104 */}
          <g transform="translate(324, 68)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <polygon points="0,-6 7,-3 0,-1 -7,-3" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
            <line x1="0" y1="5.5" x2="0" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </g>

          {activeIdx > 1 && <circle cx="282" cy="34" r="5.5" fill="#10B981" />}
        </g>

        {/* ═══════════════════════════════════════════════════════════════
            STATION 2: Broadcast Notice & Cheering Students (Center x=470, Feet at y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 2 ? 1 : 0.55, transition: 'opacity 300ms ease' }}>
          {/* Broadcast Podium (feet touch y=104) */}
          <rect x="440" y="70" width="28" height="34" rx="2" fill="#065F43" opacity="0.25" />
          <polygon points="446,54 466,46 466,62" fill="#B9903B" />

          {/* Expanding soundwaves centered at mic (466, 54) */}
          <g transform="translate(466, 54)">
            <circle cx="0" cy="0" r="8" fill="none" stroke="#10B981" strokeWidth="2" className="anim-sound-1" />
            <circle cx="0" cy="0" r="16" fill="none" stroke="#B9903B" strokeWidth="1.6" className="anim-sound-2" />
          </g>

          {/* Faculty 3: Lead Officer broadcasting at mic - Feet at y=104 */}
          <g transform="translate(426, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <polygon points="0,8 -2,13 0,17 2,13" fill="#065F43" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="14" y2="4" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
          </g>

          {/* Student Recipient 1: looking at phone, cheering arm waving - Feet at y=104 */}
          <g transform="translate(492, 68)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <polygon points="0,-6 7,-3 0,-1 -7,-3" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
            <line x1="0" y1="5.5" x2="0" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="-8" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="-12" y="8" width="5" height="8" rx="1" fill="#10B981" />
            {/* Waving cheering right arm anchored at shoulder (0, 10) */}
            <g transform="translate(0, 10)">
              <g className="anim-cheer-arm">
                <line x1="0" y1="0" x2="10" y2="-12" stroke="#B9903B" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* Student Recipient 2: both arms raised celebrating - Feet at y=104 */}
          <g transform="translate(518, 68)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <polygon points="0,-6 7,-3 0,-1 -7,-3" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
            <line x1="0" y1="5.5" x2="0" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="-4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="22" x2="4" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="-10" y2="-8" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="10" y2="-8" stroke="#B9903B" strokeWidth="2.2" strokeLinecap="round" />
          </g>

          {activeIdx === 2 && (
            <text x="492" y="48" fontSize="6.5" fontWeight="800" fill="#10B981">LIVE NOTICE ✓</text>
          )}
        </g>
      </svg>

      {/* Actionable Station Milestone Strip */}
      <ActionableStationStrip
        stations={FACULTY_STATIONS}
        activeIdx={activeIdx}
        onHoverStation={setHoveredIdx}
      />
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. ADMIN STICK ANIMATION: Collaborative Systems & Governance Team
 * Zero-flicker architecture:
 *   - Unified ground baseline at y=104 for ALL stations
 *   - Joint-anchored pivot transforms (transform-origin: 0 0 on local groups)
 *   - Center-pivoted spinning gears (cx=0, cy=0 inside translate groups)
 *   - Continuous neon oscilloscope ECG trace
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function AdminStickAnimation({
  className = 'w-full',
}: {
  className?: string;
}): React.JSX.Element {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const activeIdx = useStationCycle(3, 3600, hoveredIdx);

  return (
    <div className={`w-full flex flex-col justify-between ${className}`}>
      {/* Stage Top Bar: Real-time Live Action Display */}
      <div className="flex items-center justify-between gap-2 mb-1 px-1 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="truncate font-medium text-foreground text-[11px]">
            {ADMIN_STATUS_MESSAGES[activeIdx]}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-semibold text-[#B9903B] tracking-wide">
          Admin Governance • Auto Loop
        </span>
      </div>

      {/* SVG Canvas Stage: Unified Ground Plane at y=104, Stable Zero-Flicker Actions */}
      <svg
        viewBox="0 0 580 120"
        className="w-full h-24 sm:h-28 overflow-visible"
        aria-hidden="true"
      >
        <style>{`
          /* Local origin gear rotation (transform-origin: 0 0) - Zero wobble, zero drift */
          @keyframes admGearRotateCW {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes admGearRotateCCW {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes admWrenchPumpMotion {
            0%, 100% { transform: rotate(-12deg); }
            50% { transform: rotate(14deg); }
          }
          @keyframes admEcgTraceLive {
            0% { stroke-dashoffset: 72; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes admLedBlinkSequenced {
            0%, 100% { opacity: 0.95; }
            50% { opacity: 0.2; }
          }
          @keyframes admShieldPulseLock {
            0% { transform: scale(0.96); }
            50% { transform: scale(1.03); }
            100% { transform: scale(1); }
          }
          @keyframes admAuditStampAction {
            0%, 100% { transform: rotate(-10deg); }
            45% { transform: rotate(14deg); }
            50% { transform: rotate(18deg) translateY(3px); }
            60% { transform: rotate(-10deg); }
          }

          .anim-gear-cw { transform-origin: 0 0; animation: admGearRotateCW 5s infinite linear; }
          .anim-gear-ccw { transform-origin: 0 0; animation: admGearRotateCCW 3.8s infinite linear; }
          .anim-wrench { transform-origin: 0 0; animation: admWrenchPumpMotion 1.4s infinite ease-in-out; }
          .anim-ecg-line { stroke-dasharray: 72; animation: admEcgTraceLive 1.4s infinite linear; }
          .anim-led-seq { animation: admLedBlinkSequenced 0.9s infinite ease-in-out; }
          .anim-shield-lock { transform-origin: 0 0; animation: admShieldPulseLock 2.4s infinite ease-in-out; }
          .anim-audit-stamp { transform-origin: 0 0; animation: admAuditStampAction 1.4s infinite ease-in-out; }
        `}</style>

        {/* Unified Ground Baseline at y=104 */}
        <line x1="20" y1="104" x2="560" y2="104" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.15" />

        {/* Connected Telemetry Line */}
        <path
          d="M 140 104 L 240 104 M 350 104 L 440 104"
          fill="none"
          stroke="#065F43"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.35"
        />

        {/* ═══════════════════════════════════════════════════════════════
            STATION 0: Programs & Roles (Curriculum Architect + Dean, Feet at y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 0 ? 1 : activeIdx > 0 ? 0.85 : 0.45, transition: 'opacity 300ms ease' }}>
          {/* Main Brass Gear (Center at 95, 72) - Rotates around its own (0, 0) */}
          <g transform="translate(95, 72)">
            <g className="anim-gear-cw">
              <circle cx="0" cy="0" r="14" fill="none" stroke="#B9903B" strokeWidth="2.2" />
              <circle cx="0" cy="0" r="4.5" fill="#B9903B" />
              <line x1="0" y1="-18" x2="0" y2="-12" stroke="#B9903B" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="0" y1="12" x2="0" y2="18" stroke="#B9903B" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="-18" y1="0" x2="-12" y2="0" stroke="#B9903B" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="12" y1="0" x2="18" y2="0" stroke="#B9903B" strokeWidth="2.8" strokeLinecap="round" />
            </g>
          </g>

          {/* Counter Emerald Gear (Center at 120, 84) - Rotates around its own (0, 0) */}
          <g transform="translate(120, 84)">
            <g className="anim-gear-ccw">
              <circle cx="0" cy="0" r="10" fill="none" stroke="#065F43" strokeWidth="2" />
              <circle cx="0" cy="0" r="3" fill="#065F43" />
              <line x1="0" y1="-13" x2="0" y2="-8" stroke="#065F43" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="0" y1="8" x2="0" y2="13" stroke="#065F43" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="-13" y1="0" x2="-8" y2="0" stroke="#065F43" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="8" y1="0" x2="13" y2="0" stroke="#065F43" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          </g>

          {/* Admin 1: Curriculum Architect with wrench arm anchored at (0, 10) - Feet at y=104 */}
          <g transform="translate(62, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <path d="M -5 0 C -5 -5 5 -5 5 0" fill="none" stroke="#B9903B" strokeWidth="1.2" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Wrench arm anchored at shoulder joint (0, 10) */}
            <g transform="translate(0, 10)">
              <g className="anim-wrench">
                <line x1="0" y1="0" x2="16" y2="-6" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
                <rect x="14" y="-9" width="5" height="5" rx="1" fill="#10B981" />
              </g>
            </g>
            <line x1="0" y1="10" x2="-6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Admin 2: Academic Dean holding permissions tablet - Feet at y=104 */}
          <g transform="translate(142, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="-12" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="-16" y="8" width="6" height="8" rx="1" fill="#092749" stroke="#B9903B" strokeWidth="0.8" />
          </g>

          {activeIdx > 0 && <circle cx="106" cy="50" r="5.5" fill="#10B981" />}
        </g>

        {/* ═══════════════════════════════════════════════════════════════
            STATION 1: Server Ops & AI Telemetry (DevOps + Cloud Architect, Feet at y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 1 ? 1 : activeIdx > 1 ? 0.85 : 0.45, transition: 'opacity 300ms ease' }}>
          {/* Server Rack (grounded on y=104) */}
          <rect x="274" y="34" width="40" height="70" rx="3" fill="#092749" stroke="#B9903B" strokeWidth="1.4" />
          <circle cx="282" cy="46" r="2.2" fill="#B9903B" className="anim-led-seq" />
          <circle cx="290" cy="46" r="2.2" fill="#10B981" />
          <circle cx="298" cy="46" r="2.2" fill="#38BDF8" className="anim-led-seq" />
          <line x1="280" y1="58" x2="306" y2="58" stroke="#64748B" strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="280" y1="70" x2="306" y2="70" stroke="#64748B" strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="280" y1="82" x2="306" y2="82" stroke="#64748B" strokeWidth="1.5" strokeDasharray="2 2" />

          {/* High-Visibility Neon-Green Oscilloscope Display */}
          <g transform="translate(324, 44)">
            <rect x="0" y="0" width="46" height="32" rx="3" fill="#06192E" stroke="#10B981" strokeWidth="1.4" />
            <path
              d="M 2 16 L 10 16 L 14 6 L 18 26 L 22 12 L 26 16 L 44 16"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.2"
              className="anim-ecg-line"
            />
          </g>

          {/* Admin 3: DevOps Engineer at oscilloscope - Feet at y=104 */}
          <g transform="translate(252, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <path d="M -5 0 C -5 -5 5 -5 5 0" fill="none" stroke="#B9903B" strokeWidth="1.2" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="16" y2="6" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="0" y1="10" x2="-6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Admin 4: Cloud Architect testing patch cables - Feet at y=104 */}
          <g transform="translate(386, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="-14" y2="4" stroke="#B9903B" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {activeIdx > 1 && <circle cx="347" cy="36" r="5.5" fill="#10B981" />}
        </g>

        {/* ═══════════════════════════════════════════════════════════════
            STATION 2: Audit & Security (CISO + Auditor, Feet at y=104)
           ═══════════════════════════════════════════════════════════════ */}
        <g style={{ opacity: activeIdx === 2 ? 1 : 0.55, transition: 'opacity 300ms ease' }}>
          {/* Oxford Security Shield (grounded on y=104) */}
          <g transform="translate(475, 71)">
            <g className="anim-shield-lock">
              <path
                d="M 0 -29 L 23 -21 V -1 C 23 15 11 25 0 29 C -11 25 -23 15 -23 -1 V -21 Z"
                fill="#092749"
                stroke="#B9903B"
                strokeWidth="1.6"
              />
              <path
                d="M -8 0 L -2 6 L 9 -7"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
            </g>
          </g>

          {/* Admin 5: CISO locking the security shield - Feet at y=104 */}
          <g transform="translate(436, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <path d="M -5 0 C -5 -5 5 -5 5 0" fill="none" stroke="#B9903B" strokeWidth="1.2" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="10" x2="16" y2="4" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
          </g>

          {/* Admin 6: Compliance Auditor with stamp arm anchored at (0, 10) - Feet at y=104 */}
          <g transform="translate(516, 66)">
            <circle cx="0" cy="0" r="5.5" stroke="currentColor" strokeWidth="2" fill="var(--card, #fff)" />
            <line x1="0" y1="5.5" x2="0" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="-4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="23" x2="4" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Active stamping arm anchored at shoulder (0, 10) */}
            <g transform="translate(0, 10)">
              <g className="anim-audit-stamp">
                <line x1="0" y1="0" x2="-14" y2="4" stroke="#B9903B" strokeWidth="2.4" strokeLinecap="round" />
                <rect x="-18" y="1" width="6" height="6" rx="1" fill="#10B981" />
              </g>
            </g>
          </g>

          {activeIdx === 2 && (
            <text x="450" y="112" fontSize="7.5" fontWeight="800" fill="#10B981">100% VERIFIED ✓</text>
          )}
        </g>
      </svg>

      {/* Actionable Station Milestone Strip */}
      <ActionableStationStrip
        stations={ADMIN_STATIONS}
        activeIdx={activeIdx}
        onHoverStation={setHoveredIdx}
      />
    </div>
  );
}

/**
 * Convenience router component that automatically selects the appropriate
 * role stick animation based on user role string.
 */
export function DashboardRoleStickAnimation({
  role,
  className = 'w-full',
}: {
  role?: 'STUDENT' | 'PLACEMENT_FACULTY' | 'ADMIN' | string;
  className?: string;
}): React.JSX.Element {
  if (role === 'ADMIN') {
    return <AdminStickAnimation className={className} />;
  }
  if (role === 'PLACEMENT_FACULTY') {
    return <FacultyStickAnimation className={className} />;
  }
  return <StudentStickAnimation className={className} />;
}
