import { AI_KEY_MAX_LENGTH, AI_MODEL_NAME_MAX_LENGTH, WORKSPACE_AI_PROVIDERS } from '@repo/api/ai.const'
import { z } from 'zod'

export const workspaceKeyFormSchema = z.object({
  provider: z.enum(WORKSPACE_AI_PROVIDERS),
  apiKey: z.string().trim().min(8, 'Paste the whole key').max(AI_KEY_MAX_LENGTH, 'This is longer than any provider key'),
  model: z.string().trim().min(1, 'Name the model to use').max(AI_MODEL_NAME_MAX_LENGTH, 'Use a shorter model name'),
  visionModel: z.string().trim().max(AI_MODEL_NAME_MAX_LENGTH, 'Use a shorter model name'),
})

export type WorkspaceKeyFormValues = z.infer<typeof workspaceKeyFormSchema>

export const PROVIDER_LABELS: Record<(typeof WORKSPACE_AI_PROVIDERS)[number], string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
}
