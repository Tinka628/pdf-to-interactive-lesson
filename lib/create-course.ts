import { generateText } from "ai";
import type { CourseStructure, ModuleWithLessons, TokenUsage } from "./types";
import { extractXml, createXMLParser } from "./utils/xml";
import { createLessons } from "./create-lesson";
import { createTogetherClient, DEFAULT_MODEL } from "./utils/together";

export interface CourseProgressCallback {
  (type: string, message: string, data?: any): void;
}

export interface CreateModulesInput {
  content: string;
  apiKey: string;
  model?: string;
  maxRetries?: number;
  onProgress?: CourseProgressCallback;
}

export interface CreateCourseInput {
  content: string;
  apiKey: string;
  model?: string;
  validateStructure?: boolean;
  validateContent?: boolean;
  retryFailures?: boolean;
  maxRetries?: number;
  onProgress?: CourseProgressCallback;
}

export interface CourseOutput {
  title: string;
  modules: ModuleWithLessons[];
  tokenUsage: TokenUsage;
}

export interface TopicPlan {
  modules: {
    title: string;
    topics: string[]; // 4 distinct topics for this module
  }[];
}

export interface CreateTopicPlanInput {
  moduleTitles: string[];
  content: string;
  apiKey: string;
  model?: string;
  maxRetries?: number;
  onProgress?: CourseProgressCallback;
}

interface CreateModulesResult {
  structure: CourseStructure;
  tokenUsage: TokenUsage;
}

/**
 * Generate only the course structure (modules without lessons)
 */
export async function createModules({
  content,
  apiKey,
  model = DEFAULT_MODEL,
  maxRetries = 3,
  onProgress,
}: CreateModulesInput): Promise<CreateModulesResult> {
  onProgress?.("modules-start", "Generating course structure...");
  const together = createTogetherClient(apiKey);
  
  let lastError: Error | null = null;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateText({
        model: together(model),
        prompt: `Analyse the following content and create a course structure with 3 modules.
Respond only with XML format. Do not include any other text.
Your response should ONLY contain the XML format following this structure:

<course title="Course Title">
  <module title="Module 1 Title" />
  <module title="Module 2 Title" />
  <module title="Module 3 Title" />
</course>

Content:
${content}`,
      });

      // Track token usage (cast to any for SDK compatibility)
      const usage = result.usage as any;
      totalInputTokens += usage?.inputTokens || 0;
      totalOutputTokens += usage?.outputTokens || 0;

      // Extract XML in case there's extra text
      let xmlText: string;
      try {
        xmlText = extractXml(result.text, "course");
      } catch {
        throw new Error(
          `Model returned invalid response (no XML found).\n` +
          `Response preview: ${result.text.substring(0, 200)}...`
        );
      }

      // Parse XML to JavaScript object
      const parser = createXMLParser(["module"]);
      const courseStructure = parser.parse(xmlText);

      // Validate the parsed structure
      if (!courseStructure?.course?.module) {
        throw new Error(
          `Model returned invalid course structure.\n` +
          `Expected: <course><module>...</module></course>\n` +
          `Response preview: ${result.text.substring(0, 200)}...`
        );
      }

      // Ensure module is always an array
      const modules = Array.isArray(courseStructure.course.module) 
        ? courseStructure.course.module 
        : [courseStructure.course.module];

      onProgress?.("modules-complete", `Generated ${modules.length} modules`, {
        moduleCount: modules.length,
      });

      return {
        structure: {
          ...courseStructure,
          course: {
            ...courseStructure.course,
            module: modules,
          },
        },
        tokenUsage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        onProgress?.("modules-retry", `Course structure generation failed, retrying (${attempt}/${maxRetries})...`, {
          attempt,
          maxRetries,
          error: lastError.message,
        });
      }
    }
  }
  
  // All retries exhausted
  throw new Error(
    `Failed to generate course structure after ${maxRetries} attempts.\n` +
    `Last error: ${lastError?.message}`
  );
}

interface CreateTopicPlanResult {
  plan: TopicPlan;
  tokenUsage: TokenUsage;
}

/**
 * Generate a topic plan that assigns unique topics to each module
 * This prevents question overlap across modules
 */
export async function createTopicPlan({
  moduleTitles,
  content,
  apiKey,
  model = DEFAULT_MODEL,
  maxRetries = 3,
  onProgress,
}: CreateTopicPlanInput): Promise<CreateTopicPlanResult> {
  onProgress?.("topic-plan-start", "Creating topic plan to prevent duplicates...");
  const together = createTogetherClient(apiKey);
  
  const moduleCount = moduleTitles.length;
  const topicsPerModule = 4; // short-answer, true-false, multiple-choice, flow-diagram
  const totalTopics = moduleCount * topicsPerModule;
  
  let lastError: Error | null = null;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateText({
        model: together(model),
        prompt: `Analyze the following content and create a topic distribution plan for ${moduleCount} course modules.

You must identify ${totalTopics} DISTINCT topics/concepts from the content and assign exactly ${topicsPerModule} unique topics to each module.

CRITICAL RULES:
- Each topic must be UNIQUE - no topic should appear in more than one module
- Topics should be specific concepts, not broad categories
- Each module's topics should be related to its theme but distinct from other modules
- Topics will be used for: 1) short-answer, 2) true-false, 3) multiple-choice, 4) flow-diagram questions

Module titles:
${moduleTitles.map((title, i) => `${i + 1}. "${title}"`).join('\n')}

Respond ONLY with XML in this exact format:

<topicPlan>
  <module title="${moduleTitles[0]}">
    <topic type="short-answer">First specific topic for this module</topic>
    <topic type="true-false">Second specific topic for this module</topic>
    <topic type="multiple-choice">Third specific topic for this module</topic>
    <topic type="flow-diagram">Fourth topic - should be a process/flow/sequence</topic>
  </module>
  <module title="${moduleTitles[1] || 'Module 2'}">
    <topic type="short-answer">First specific topic (different from above)</topic>
    <topic type="true-false">Second specific topic (different from above)</topic>
    <topic type="multiple-choice">Third specific topic (different from above)</topic>
    <topic type="flow-diagram">Fourth topic - a different process/flow</topic>
  </module>
  <!-- Continue for all ${moduleCount} modules -->
</topicPlan>

Content:
${content}`,
      });

      // Track token usage (cast to any for SDK compatibility)
      const usage = result.usage as any;
      totalInputTokens += usage?.inputTokens || 0;
      totalOutputTokens += usage?.outputTokens || 0;

      // Extract and parse XML
      let xmlText: string;
      try {
        xmlText = extractXml(result.text, "topicPlan");
      } catch {
        throw new Error(
          `Model returned invalid response (no XML found).\n` +
          `Response preview: ${result.text.substring(0, 200)}...`
        );
      }

      const parser = createXMLParser(["module", "topic"]);
      const parsed = parser.parse(xmlText);

      if (!parsed?.topicPlan?.module) {
        throw new Error(
          `Model returned invalid topic plan structure.\n` +
          `Response preview: ${result.text.substring(0, 200)}...`
        );
      }

      // Ensure module is always an array
      const modules = Array.isArray(parsed.topicPlan.module)
        ? parsed.topicPlan.module
        : [parsed.topicPlan.module];

      // Convert to TopicPlan format
      const topicPlan: TopicPlan = {
        modules: modules.map((mod: any) => {
          // Ensure topics is always an array
          const topics = Array.isArray(mod.topic) ? mod.topic : [mod.topic];
          return {
            title: mod.title,
            topics: topics.map((t: any) => typeof t === 'string' ? t : t['#text'] || t),
          };
        }),
      };

      onProgress?.("topic-plan-complete", `Created topic plan with ${topicPlan.modules.length} modules`, {
        moduleCount: topicPlan.modules.length,
        totalTopics: topicPlan.modules.reduce((sum, m) => sum + m.topics.length, 0),
      });

      return {
        plan: topicPlan,
        tokenUsage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        onProgress?.("topic-plan-retry", `Topic plan generation failed, retrying (${attempt}/${maxRetries})...`, {
          attempt,
          maxRetries,
          error: lastError.message,
        });
      }
    }
  }
  
  // All retries exhausted
  throw new Error(
    `Failed to generate topic plan after ${maxRetries} attempts.\n` +
    `Last error: ${lastError?.message}`
  );
}

/**
 * Generate a complete course with modules and lessons
 */
export async function createCourse({
  content,
  apiKey,
  model = DEFAULT_MODEL,
  validateStructure = true,
  validateContent = true,
  retryFailures = true,
  maxRetries = 3,
  onProgress,
}: CreateCourseInput): Promise<CourseOutput> {
  // Track total token usage
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Generate course modules
  const modulesResult = await createModules({ content, apiKey, model, maxRetries, onProgress });
  const courseStructure = modulesResult.structure;
  totalInputTokens += modulesResult.tokenUsage.inputTokens;
  totalOutputTokens += modulesResult.tokenUsage.outputTokens;
  
  const totalModules = courseStructure.course.module.length;
  
  // Generate topic plan to prevent question overlap across modules
  const topicPlanResult = await createTopicPlan({
    moduleTitles: courseStructure.course.module.map((m) => m.title),
    content,
    apiKey,
    model,
    maxRetries,
    onProgress,
  });
  const topicPlan = topicPlanResult.plan;
  totalInputTokens += topicPlanResult.tokenUsage.inputTokens;
  totalOutputTokens += topicPlanResult.tokenUsage.outputTokens;
  
  onProgress?.("lessons-start", `Generating lessons for ${totalModules} modules...`, {
    totalModules,
  });

  // Generate lessons for all modules in parallel with progress tracking
  let completedModules = 0;
  const lessonsPromises = courseStructure.course.module.map((module, index) =>
    createLessons({
      module,
      content,
      apiKey,
      model,
      assignedTopics: topicPlan.modules[index]?.topics,
      validateStructure,
      validateContent,
      retryFailures,
      maxRetries,
      onProgress: (type, message, data) => {
        // Forward progress from createLessons
        if (type === "lesson-complete") {
          completedModules++;
          onProgress?.("lessons-progress", `Generating lessons (${completedModules}/${totalModules} modules)`, {
            completed: completedModules,
            total: totalModules,
            currentModule: index + 1,
            moduleTitle: module.title,
          });
        } else if (type === "lesson-start") {
          onProgress?.("lessons-progress", `Generating lessons for module ${index + 1}/${totalModules}: "${module.title}"`, {
            completed: completedModules,
            total: totalModules,
            currentModule: index + 1,
            moduleTitle: module.title,
          });
        }
      },
    })
  );

  const allLessonsResults = await Promise.all(lessonsPromises);
  
  // Extract lessons and aggregate token usage
  const allLessons = allLessonsResults.map(r => r.module);
  allLessonsResults.forEach(r => {
    totalInputTokens += r.tokenUsage.inputTokens;
    totalOutputTokens += r.tokenUsage.outputTokens;
  });
  
  // Calculate final statistics
  let totalLessons = 0;
  let successfulLessons = 0;
  let failedLessons = 0;
  
  allLessons.forEach((module) => {
    module.lessons.forEach((lessonResult) => {
      totalLessons++;
      if (lessonResult.success) {
        successfulLessons++;
      } else {
        failedLessons++;
      }
    });
  });
  
  onProgress?.("course-complete", `Course generation complete: ${successfulLessons}/${totalLessons} lessons successful`, {
    totalModules,
    totalLessons,
    successfulLessons,
    failedLessons,
    successRate: Math.round((successfulLessons / totalLessons) * 100),
  });

  return {
    title: courseStructure.course.title,
    modules: allLessons,
    tokenUsage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
    },
  };
}
