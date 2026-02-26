"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ModulesScreen } from "@/app/components/modules-screen";
import { getCourseProgress } from "@/lib/course-progress";
import type { Course } from "@/app/hooks/use-course-navigation";

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Separate function to refresh progress from localStorage
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
    const fetchCourseAndProgress = async () => {
      try {
        setLoading(true);

        // Check sessionStorage first (set by generating page after creation)
        let courseObj: Course | null = null;
        try {
          const cached = sessionStorage.getItem(`course:${slug}`);
          if (cached) {
            courseObj = JSON.parse(cached);
            sessionStorage.removeItem(`course:${slug}`);
          }
        } catch {
          // sessionStorage unavailable - continue with API fetch
        }

        if (!courseObj) {
          // Fetch course from database, with one retry on 404
          // (handles brief DB replication lag after creation)
          let courseResponse = await fetch(`/api/courses/${slug}`);

          if (courseResponse.status === 404) {
            await new Promise((r) => setTimeout(r, 1500));
            courseResponse = await fetch(`/api/courses/${slug}`);
          }

          if (!courseResponse.ok) {
            setError(
              courseResponse.status === 404
                ? "Course not found"
                : "Failed to load course"
            );
            setLoading(false);
            return;
          }

          const courseData = await courseResponse.json();
          courseObj = courseData.course;
        }

        setCourse(courseObj);
        refreshProgress();
        setLoading(false);

        if (courseObj) {
          document.title = `${courseObj.title} | PDF to Interactive Lesson Generator`;
        }
      } catch (err) {
        console.error("Error fetching course:", err);
        setError("Failed to load course. Please check your connection.");
        setLoading(false);
      }
    };

    fetchCourseAndProgress();
  }, [slug, refreshProgress]);

  // Refresh progress when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshProgress();
      }
    };

    const handleFocus = () => {
      refreshProgress();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshProgress]);

  const handleStartModule = (moduleIndex: number) => {
    router.push(`/course/${slug}/module/${moduleIndex}`);
  };

  const handleJumpToLesson = (moduleIndex: number, lessonIndex: number) => {
    // Jump directly to a specific lesson at the content step
    router.push(`/course/${slug}/module/${moduleIndex}?step=content&lesson=${lessonIndex}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-white" />;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Course not found</h1>
          <p className="text-neutral-600 mb-6">{error || "The course you're looking for doesn't exist."}</p>
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

