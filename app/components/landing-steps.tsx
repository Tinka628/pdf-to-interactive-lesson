"use client";

import { BookOpen, HelpCircle, Workflow, Check } from "lucide-react";

/**
 * "How it works" — three interactive step illustrations.
 * All motion is transform/opacity only and driven by `group-hover` on desktop.
 * On touch / small screens (max-md) the resolved state is shown by default,
 * and the global reduced-motion rule snaps everything instantly.
 */

function StepCard({
  index,
  title,
  description,
  wide,
  children,
}: {
  index: string;
  title: string;
  description: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`group card-hover rounded-2xl border border-border bg-gradient-to-b from-hint-bg/40 via-white to-white p-6 flex flex-col ${
        wide ? "" : ""
      }`}
    >
      <div className="w-full aspect-[5/3] flex items-center justify-center mb-5 overflow-hidden">
        {children}
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-bold text-neutral-300 tabular-nums">{index}</span>
        <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
      </div>
      <p className="text-sm text-neutral-500">{description}</p>
    </div>
  );
}

/* 1 — a page drops into a dashed dropzone */
function UploadScene() {
  return (
    <div className="relative w-full h-full flex items-end justify-center pb-3">
      <div className="absolute bottom-3 w-32 h-20 rounded-xl border-2 border-dashed border-border-strong transition-colors duration-300 ease-standard group-hover:border-brand-1 max-md:border-brand-1" />
      <div className="relative z-10 w-20 -translate-y-6 group-hover:translate-y-1 max-md:translate-y-1 transition-transform duration-500 ease-out-soft will-change-transform">
        <div className="rounded-lg bg-white border border-border shadow-sm p-2.5">
          <div className="h-1.5 w-3/4 rounded-full bg-neutral-200 mb-1.5" />
          <div className="h-1.5 w-full rounded-full bg-neutral-100 mb-1.5" />
          <div className="h-1.5 w-5/6 rounded-full bg-neutral-100 mb-1.5" />
          <div className="h-1.5 w-2/3 rounded-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

/* 2 — a source page fans out into typed outputs */
function BreakdownScene() {
  return (
    <div className="relative w-full h-full flex items-center justify-between px-1">
      {/* source page */}
      <div className="relative z-10 w-16 flex-shrink-0">
        <div className="rounded-lg bg-white border border-border shadow-sm p-2">
          <div className="h-1 w-3/4 rounded-full bg-neutral-200 mb-1" />
          <div className="h-1 w-full rounded-full bg-neutral-100 mb-1" />
          <div className="h-1 w-5/6 rounded-full bg-neutral-100 mb-1" />
          <div className="h-1 w-2/3 rounded-full bg-neutral-100" />
        </div>
      </div>

      {/* connectors */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {[22, 50, 78].map((y, i) => (
          <path
            key={y}
            d={`M 24 50 C 45 50, 55 ${y}, 74 ${y}`}
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
            className={`transition-[stroke-dashoffset] duration-500 ease-standard group-hover:[stroke-dashoffset:0] max-md:[stroke-dashoffset:0] ${
              i === 0 ? "delay-0" : i === 1 ? "delay-100" : "delay-200"
            }`}
          />
        ))}
      </svg>

      {/* output chips */}
      <div className="relative z-10 flex flex-col gap-2 flex-shrink-0">
        {[
          { icon: BookOpen, label: "Lessons", d: "delay-0" },
          { icon: HelpCircle, label: "Quizzes", d: "delay-100" },
          { icon: Workflow, label: "Diagrams", d: "delay-200" },
        ].map(({ icon: Icon, label, d }) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 shadow-sm opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 max-md:opacity-100 max-md:translate-x-0 transition-[opacity,transform] duration-300 ease-out-soft ${d}`}
          >
            <Icon className="w-3 h-3 text-neutral-500" />
            <span className="text-[11px] font-medium text-neutral-700">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 3 — answer a question, lock in the right choice */
function LearnScene() {
  const options = ["A", "B", "C", "D"];
  return (
    <div className="w-full max-w-[200px]">
      <div className="h-1.5 w-2/3 rounded-full bg-neutral-200 mb-3" />
      <div className="flex flex-col gap-1.5">
        {options.map((opt) => {
          const correct = opt === "B";
          return (
            <div
              key={opt}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors duration-300 ease-standard ${
                correct
                  ? "border-border bg-white group-hover:border-correct-border group-hover:bg-correct-bg max-md:border-correct-border max-md:bg-correct-bg"
                  : "border-border bg-white"
              }`}
            >
              <span
                className={`flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                  correct
                    ? "bg-neutral-100 text-neutral-500 group-hover:bg-correct group-hover:text-white max-md:bg-correct max-md:text-white transition-colors duration-300"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {correct ? (
                  <>
                    <Check className="w-2.5 h-2.5 hidden group-hover:block max-md:block" />
                    <span className="group-hover:hidden max-md:hidden">{opt}</span>
                  </>
                ) : (
                  opt
                )}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-neutral-100" />
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full w-1/4 rounded-full bg-correct group-hover:w-full max-md:w-full transition-[width] duration-500 ease-out-soft" />
      </div>
    </div>
  );
}

export function LandingSteps() {
  return (
    <section className="mt-28 mb-20">
      <div className="text-center mb-12">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-hint-fg bg-hint-bg rounded-full mb-5">
          How it works
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 text-balance max-w-2xl mx-auto">
          From static PDF to guided learning, in minutes
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_1fr] gap-6 max-w-5xl mx-auto">
        <StepCard index="01" title="Upload a PDF" description="Lecture notes, textbooks, papers, or docs.">
          <UploadScene />
        </StepCard>
        <StepCard
          index="02"
          title="We break it down"
          description="Content is split into short modules — lessons, quizzes, and diagrams."
          wide
        >
          <BreakdownScene />
        </StepCard>
        <StepCard index="03" title="Learn by doing" description="Answer questions, get feedback, and track progress.">
          <LearnScene />
        </StepCard>
      </div>
    </section>
  );
}
