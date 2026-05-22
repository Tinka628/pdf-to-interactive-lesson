"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, CreditCard, KeyRound } from "lucide-react";
import { useCredits } from "../hooks/use-credits";
import { ApiKeyDialog } from "./api-key-dialog";
import { Button, buttonVariants } from "./ui/button";
import { Chip } from "./ui/chip";

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
        {showCoursesLink && (
          <Link
            href="/courses"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Courses
          </Link>
        )}
        {credits && (
          <Chip>
            <CreditCard className="w-3.5 h-3.5" />
            {credits.coursesRemaining} courses left
          </Chip>
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
