"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, KeyRound } from "lucide-react";
import { useCredits } from "../hooks/use-credits";
import { ApiKeyDialog } from "./api-key-dialog";
import { Button, buttonVariants } from "./ui/button";

interface HeaderActionsProps {
  showCoursesLink?: boolean;
}

function HeaderActions({ showCoursesLink }: HeaderActionsProps) {
  const credits = useCredits();
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  return (
    <>
      <ApiKeyDialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog} />
      <div className="flex items-center gap-2 flex-shrink-0">
        {credits && (
          <div
            className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full bg-surface-muted text-sm text-neutral-500 cursor-default select-none"
            title={`${credits.coursesRemaining} free courses remaining`}
          >
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-neutral-900 text-white text-xs font-semibold tabular-nums">
              {credits.coursesRemaining}
            </span>
            <span className="hidden sm:inline">courses left</span>
            <span className="sm:hidden">left</span>
          </div>
        )}
        {showCoursesLink && (
          <Link
            href="/courses"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Courses
          </Link>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowApiKeyDialog(true)}
          aria-label="API Key"
        >
          <KeyRound className="w-3.5 h-3.5" />
          API Key
        </Button>
      </div>
    </>
  );
}

export { HeaderActions };
