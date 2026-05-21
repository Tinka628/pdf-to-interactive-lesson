import { handleCallback } from "@vercel/queue";
import { generateCourseFromPdf } from "@/lib/generate-course-from-pdf";
import { incrementRateLimit } from "@/lib/utils/rate-limiter";
import { getJob, updateJob } from "@/lib/utils/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface QueueMessage {
  jobId: string;
}

export const POST = handleCallback<QueueMessage>(async (message) => {
  const { jobId } = message;
  if (!jobId) {
    console.warn("run-generation-job: missing jobId in message");
    return;
  }

  const job = await getJob(jobId);
  if (!job) {
    // Job state expired or never created — acknowledge to stop retries.
    console.warn(`run-generation-job: job ${jobId} not found, acknowledging`);
    return;
  }

  if (job.status === "complete" || job.status === "error") {
    // Already processed — likely a duplicate delivery. Acknowledge.
    return;
  }

  await updateJob(jobId, {
    status: "processing",
    startedAt: Date.now(),
  });

  try {
    const result = await generateCourseFromPdf({
      url: job.url,
      apiKey: job.apiKey || "",
      onProgress: (type, message) => {
        updateJob(jobId, { progressType: type, progress: message }).catch(
          (err) => console.error("Failed to write progress:", err)
        );
      },
    });

    if (!job.apiKey) {
      await incrementRateLimit(job.clientId);
    }

    await updateJob(jobId, {
      status: "complete",
      course: result.course,
      metadata: result.metadata,
      completedAt: Date.now(),
    });
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    await updateJob(jobId, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      completedAt: Date.now(),
    });
    // Don't re-throw — error is captured in job state and the client will
    // see it via status polling. Re-throwing would cause Vercel Queues to
    // retry, but our generation errors are usually not transient.
  }
});
