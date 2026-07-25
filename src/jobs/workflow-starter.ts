import { getTemporalClient } from "../temporal/client.js";
import { CLIP_GENERATION_TASK_QUEUE } from "../temporal/constants.js";
import { generateClipsWorkflow } from "../temporal/workflows/generate-clips.js";

export type StartClipGenerationInput = {
  jobId: string;
  youtubeUrl: string;
};

export interface WorkflowStarter {
  startClipGeneration(input: StartClipGenerationInput): Promise<string>;
}

export class TemporalWorkflowStarter implements WorkflowStarter {
  async startClipGeneration(
    input: StartClipGenerationInput,
  ): Promise<string> {
    const workflowId = `clip-generation-${input.jobId}`;
    const temporalClient = await getTemporalClient();

    await temporalClient.workflow.start(generateClipsWorkflow, {
      workflowId,
      taskQueue: CLIP_GENERATION_TASK_QUEUE,
      args: [input],
    });

    return workflowId;
  }
}
