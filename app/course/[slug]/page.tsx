"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ModulesScreen } from "@/app/components/modules-screen";
import { getCourseProgress } from "@/lib/course-progress";
import type { Course } from "@/app/hooks/use-course-navigation";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function fetchCourseWithRetry(
  slug: string,
  retries = MAX_RETRIES
): Promise<{ course: Course; title: string } | { error: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`/api/courses/${slug}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        return { course: data.course, title: data.title };
      }

      if (res.status === 404 && attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }

      const body = await res.json().catch(() => null);
      const msg = body?.error || `Failed to load course (${res.status})`;
      return { error: msg };
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return { error: "Failed to load course. Please check your connection." };
    }
  }
  return { error: "Failed to load course after multiple attempts." };
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProgress = useCallback(() => {
    const progress = getCourseProgress(slug);
    if (progress) {
      setCompletedModules(progress.completedModules || []);
      setCurrentModuleIndex(progress.currentModuleIndex || 0);
    } else {
      setCompletedModules([]);
      setCurrentModuleIndex(0);
    }
  }, [slug]);

  useEffect(() => {
    const loadCourse = async () => {
      setLoading(true);

      // Check sessionStorage for course data (set after course creation)
      let sessionCourse: Course | null = null;
      try {
        const cached = sessionStorage.getItem(`course-data-${slug}`);
        if (cached) {
          sessionCourse = JSON.parse(cached);
          sessionStorage.removeItem(`course-data-${slug}`);
        }
      } catch {
        // ignore
      }

      const result = await fetchCourseWithRetry(slug);

      if ("course" in result) {
        setCourse(result.course);
        refreshProgress();
        setLoading(false);
        document.title = `${result.title || result.course?.title} | PDF to Interactive Lesson Generator`;
        return;
      }

      // API fetch failed – fall back to sessionStorage data if available
      if (sessionCourse) {
        setCourse(sessionCourse);
        refreshProgress();
        setLoading(false);
        document.title = `${sessionCourse.title} | PDF to Interactive Lesson Generator`;
        return;
      }

      setError(result.error);
      setLoading(false);
    };

    loadCourse();
  }, [slug, refreshProgress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshProgress();
      }
    };

    const handleFocus = () => {
      refreshProgress();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshProgress]);

  const handleStartModule = (moduleIndex: number) => {
    router.push(`/course/${slug}/module/${moduleIndex}`);
  };

  const handleJumpToLesson = (moduleIndex: number, lessonIndex: number) => {
    router.push(
      `/course/${slug}/module/${moduleIndex}?step=content&lesson=${lessonIndex}`
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-white" />;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">
            {error?.includes("not found") ? "Course not found" : "Something went wrong"}
          </h1>
          <p className="text-neutral-600 mb-6">
            {error || "The course you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => router.push("/courses")}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <ModulesScreen
      course={course}
      courseSlug={slug}
      onStartModule={handleStartModule}
      onJumpToLesson={handleJumpToLesson}
      completedModules={completedModules}
      currentModuleIndex={currentModuleIndex}
    />
  );
}
