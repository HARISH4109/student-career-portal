import React, { useEffect, useRef } from 'react';

export interface LivingNetworkNode {
  id: string;
  label: string;
  side: 'left' | 'right';
  relX: number; // percentage (0..1) relative to viewport width
  relY: number; // percentage (0..1) relative to viewport height
  accentColor: string;
}

/**
 * Curated Student Success Network Badges:
 * Left: Career Roadmaps, Internships & Placements, Mock Interviews, Diagnostic Assessments
 * Right: ATS Resume Score, Campus Recruitment, Skill Gap Analysis, Alumni Mentorship
 */
export const LIVING_NETWORK_NODES: LivingNetworkNode[] = [
  // Left Column Nodes
  { id: 'roadmaps', label: 'Career Roadmaps', side: 'left', relX: 0.17, relY: 0.28, accentColor: '#B9903B' },
  { id: 'internships', label: 'Internships & Placements', side: 'left', relX: 0.14, relY: 0.48, accentColor: '#065F43' },
  { id: 'mock-interviews', label: 'Mock Interviews', side: 'left', relX: 0.22, relY: 0.68, accentColor: '#B9903B' },
  { id: 'assessments', label: 'Diagnostic Assessments', side: 'left', relX: 0.15, relY: 0.85, accentColor: '#065F43' },

  // Right Column Nodes
  { id: 'resume-score', label: 'ATS Resume Score', side: 'right', relX: 0.83, relY: 0.28, accentColor: '#B9903B' },
  { id: 'recruitment', label: 'Campus Recruitment', side: 'right', relX: 0.86, relY: 0.48, accentColor: '#065F43' },
  { id: 'skill-gap', label: 'Skill Gap Analysis', side: 'right', relX: 0.78, relY: 0.68, accentColor: '#B9903B' },
  { id: 'mentorship', label: 'Alumni Mentorship', side: 'right', relX: 0.85, relY: 0.85, accentColor: '#065F43' },
];

interface FloatingStar {
  x: number;
  y: number;
  size: number;
  baseSpeedX: number;
  baseSpeedY: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  isCrossStar: boolean;
}

/**
 * Living Network Filaments, Badges & Celestial Floating Stars Canvas.
 *
 * Implements:
 * - 8 Floating Pill Badges surrounding the hero center.
 * - Circular loop lines removed.
 * - Very very light, ultra-transparent hairlines connecting each floating tag upward to the top board
 *   with subtle dashed styling ([2, 4], 0.75px, alpha 0.08..0.13) and organic flex wave.
 * - Ambient floating stars & cross sparkles drifting in gentle zig-zag trajectories.
 * - Upward-drifting micro energy sparks along hairlines.
 * - Full prefers-reduced-motion compliance.
 */
export function AuthCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const mouse = { x: -1000, y: -1000, radius: 180 };

    const handleResize = () => {
      if (!canvas || !ctx) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let checkReducedMotion = motionQuery.matches;
    let time = 0;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      checkReducedMotion = e.matches;
      if (!checkReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    motionQuery.addEventListener?.('change', handleMotionChange);

    // Initialize 32 ambient floating stars with zig-zag drift
    const stars: FloatingStar[] = Array.from({ length: 32 }, (_, i) => ({
      x: (Math.sin(i * 99) * 0.5 + 0.5) * width,
      y: (Math.cos(i * 37) * 0.5 + 0.5) * height,
      size: 1 + (i % 3) * 0.8,
      baseSpeedX: (i % 2 === 0 ? 1 : -1) * (0.08 + (i % 4) * 0.04),
      baseSpeedY: -(0.12 + (i % 5) * 0.05),
      twinkleSpeed: 0.8 + (i % 4) * 0.4,
      twinklePhase: i * 0.7,
      color: i % 3 === 0 ? '#D4AF37' : i % 3 === 1 ? '#F4F1EA' : '#B9903B',
      isCrossStar: i % 5 === 0,
    }));

    // Traveling energy particles floating along the upward hairlines
    const particles = LIVING_NETWORK_NODES.map((_, i) => ({
      progress: (i * 0.125) % 1,
      speed: 0.0020 + (i % 3) * 0.0005,
    }));

    /**
     * Dynamically resolve anchor coordinates by checking actual DOM bounding boxes of badges.
     * Falls back to viewport percentage coordinates if DOM is not ready or in headless testing.
     */
    const getBadgeAnchor = (id: string, relX: number, relY: number) => {
      const el = document.querySelector<HTMLElement>(`[data-badge-id="${id}"]`);
      if (el && typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.left + rect.width * 0.5, y: rect.top };
        }
      }
      return { x: width * relX, y: height * relY };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.02;

      // Dynamically resolve top board header position
      const headerEl = document.querySelector('header');
      const topBoardY = headerEl
        ? Math.min(Math.max(headerEl.getBoundingClientRect().bottom, 60), 100)
        : 74;

      // Subtle interactive cursor aura in Academic Gold
      if (mouse.x > 0 && mouse.y > 0) {
        const aura = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouse.radius);
        aura.addColorStop(0, 'rgba(185, 144, 59, 0.08)');
        aura.addColorStop(0.6, 'rgba(6, 95, 67, 0.03)');
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura;
        ctx.fillRect(mouse.x - mouse.radius, mouse.y - mouse.radius, mouse.radius * 2, mouse.radius * 2);
      }

      // ── 1. Floating Celestial Stars with Zig-Zag Drift ──
      stars.forEach((star) => {
        if (!checkReducedMotion) {
          // Natural sinusoidal zig-zag drift
          star.x += star.baseSpeedX + Math.sin(time * 0.9 + star.twinklePhase) * 0.35;
          star.y += star.baseSpeedY + Math.cos(time * 0.7 + star.twinklePhase) * 0.25;

          // Wrap around canvas boundaries
          if (star.x < -20) star.x = width + 20;
          if (star.x > width + 20) star.x = -20;
          if (star.y < -20) star.y = height + 20;
          if (star.y > height + 20) star.y = -20;
        }

        const alpha = Math.max(0.12, 0.25 + 0.45 * Math.sin(time * star.twinkleSpeed + star.twinklePhase));

        if (star.isCrossStar) {
          // Delicate 4-pointed sparkle star
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(star.x - star.size * 2.2, star.y);
          ctx.lineTo(star.x + star.size * 2.2, star.y);
          ctx.moveTo(star.x, star.y - star.size * 2.2);
          ctx.lineTo(star.x, star.y + star.size * 2.2);
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.65;
          ctx.stroke();
          ctx.restore();
        } else {
          // Soft ambient circular beacon star
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.shadowColor = '#B9903B';
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.restore();
        }
      });

      // Collect resolved anchors for all 8 nodes
      const anchors = LIVING_NETWORK_NODES.map((node) => {
        const pt = getBadgeAnchor(node.id, node.relX, node.relY);
        const targetX = pt.x + (node.side === 'left' ? -6 : 6);
        const targetY = topBoardY;
        return { pt, targetX, targetY, node };
      });

      // ── 2. Very Very Light Transparent Connecting Lines to Top Board ──
      anchors.forEach(({ pt, targetX, targetY }, idx) => {
        // Whisper-light opacity (8% to 13%), never obscuring background students
        const lineAlpha = 0.09 + Math.sin(time * 1.2 + idx) * 0.03;
        const wave = Math.sin(time * 1.4 + idx * 0.8) * 4.5;
        const cp1X = pt.x + wave;
        const cp1Y = pt.y * 0.65 + targetY * 0.35;
        const cp2X = targetX - wave * 0.5;
        const cp2Y = pt.y * 0.35 + targetY * 0.65;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = `rgba(244, 241, 234, ${lineAlpha})`;
        ctx.lineWidth = 0.75;
        ctx.moveTo(pt.x, pt.y);
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, targetX, targetY);
        ctx.stroke();
        ctx.restore();

        // Top board faint terminal pin
        ctx.beginPath();
        ctx.arc(targetX, targetY, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(185, 144, 59, 0.30)';
        ctx.fill();

        // Floating badge anchor beacon & pearl
        const pulse = Math.sin(time * 2 + idx) * 0.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.4 + pulse * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(212, 175, 55, 0.75)' : 'rgba(244, 241, 234, 0.75)';
        ctx.shadowColor = '#B9903B';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── 3. Traveling Energy Micro-Sparks Along Hairlines ──
      if (!checkReducedMotion) {
        particles.forEach((p, idx) => {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;

          const anchorData = anchors[idx];
          if (!anchorData) return;
          const { pt, targetX, targetY } = anchorData;
          const wave = Math.sin(time * 1.4 + idx * 0.8) * 4.5;
          const cp1X = pt.x + wave;
          const cp1Y = pt.y * 0.65 + targetY * 0.35;
          const cp2X = targetX - wave * 0.5;
          const cp2Y = pt.y * 0.35 + targetY * 0.65;

          // Cubic bezier interpolation drifting upward
          const t = p.progress;
          const mt = 1 - t;
          const px = mt * mt * mt * pt.x + 3 * mt * mt * t * cp1X + 3 * mt * t * t * cp2X + t * t * t * targetX;
          const py = mt * mt * mt * pt.y + 3 * mt * mt * t * cp1Y + 3 * mt * t * t * cp2Y + t * t * t * targetY;

          ctx.beginPath();
          ctx.arc(px, py, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.shadowColor = '#B9903B';
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // ── 4. Subtle Interactive Mouse Proximity Tether ──
      if (mouse.x > 0 && mouse.y > 0) {
        anchors.forEach(({ pt }) => {
          const dx = pt.x - mouse.x;
          const dy = pt.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const alpha = (1 - dist / mouse.radius) * 0.22;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(185, 144, 59, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        });
      }

      if (!checkReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      motionQuery.removeEventListener?.('change', handleMotionChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full opacity-90"
      aria-hidden="true"
    />
  );
}
