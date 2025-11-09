// ============================================================================
// LLM ORCHESTRATOR - Queries multiple AI models in parallel
// ============================================================================

import { ApiResponse, ModelResponse, ModelStatus } from '@/types';
import { RateLimiter } from '@/utils/rate-limiter';

const MODELS = ['GPT-4o', 'Claude Sonnet 3.5', 'Gemini'] as const;
type ModelName = (typeof MODELS)[number];

type ModelConfig = {
  tokensPerSecond: number;
  bucketSize: number;
};

const MODEL_CONFIGS: Record<ModelName, ModelConfig> = {
  'GPT-4o': { tokensPerSecond: 3, bucketSize: 10 },
  'Claude Sonnet 3.5': { tokensPerSecond: 2, bucketSize: 5 },
  'Gemini': { tokensPerSecond: 5, bucketSize: 15 },
};

/**
 * This class manages all interactions with AI models
 * It handles:
 * - Rate limiting per model (each has different limits)
 * - Retry logic with exponential backoff
 * - Parallel querying of multiple models
 */
export class LLMOrchestrator {
  // Map is like an object but with better performance for frequent adds/deletes
  // Map<string, RateLimiter> means: keys are strings, values are RateLimiter instances
  private rateLimiters: Map<string, RateLimiter>;

  constructor() {
    // Initialize per-model rate limiters from a central config
    this.rateLimiters = new Map();
    MODELS.forEach((m) => {
      const cfg = MODEL_CONFIGS[m];
      this.rateLimiters.set(m, new RateLimiter(cfg.tokensPerSecond, cfg.bucketSize));
    });
  }

  /**
   * Query a single AI model with automatic retry on failure
   * 
   * @param model - Name of the model ('gpt-4', 'claude', 'gemini')
   * @param prompt - The question/prompt to send to the model
   * @param retries - Number of retry attempts if request fails (default 3)
   * @returns Promise resolving to the API response
   */
  async queryModel(
    model: string,
    prompt: string,
    retries = 3  // Default parameter - if not provided, uses 3
  ): Promise<ApiResponse<ModelResponse[]>> {
    // Get the rate limiter for this specific model
    const limiter = this.rateLimiters.get(model);
    if (!limiter) throw new Error(`No rate limiter for ${model}`);

    // Wait for rate limit token before making request
    // This will pause here if we're hitting the API too fast. Use a timeout so
    // callers aren't blocked indefinitely if the queue grows too large.
    await limiter.acquire(30_000); // 30s timeout

    // Retry loop - attempt the request up to 'retries' times with jittered backoff
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Production: replace simulateAPICall with a real provider call
        const response = await this.simulateAPICall(model as ModelName, prompt);

        // Return formatted response
        return {
          data: response,
          timestamp: Date.now(),
          source: model as any,
        };
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed for ${model}:`, error);
        if (attempt === retries - 1) throw error;

        // Exponential backoff with jitter
        const base = Math.pow(2, attempt) * 1000;
        const jitter = Math.floor(Math.random() * 200); // random 0-199ms
        const backoffMs = base + jitter;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // Should not reach here
    throw new Error(`Failed after ${retries} retries`);
  }

  /**
   * Query all AI models in parallel and combine their results
   * 
   * @param prompt - Query to send to all models
   * @param onProgress - Optional callback to report progress of each model
   * @returns Combined and deduplicated responses from all models
   */
  async queryAllModels(
    prompt: string,
    onProgress?: (status: ModelStatus) => void  // Optional callback function
  ): Promise<ModelResponse[]> {
    const models = MODELS;

    // Promise.allSettled is different from Promise.all:
    // - Promise.all fails fast - if any promise rejects, everything fails
    // - Promise.allSettled waits for all to complete, whether they succeed or fail
    // This is critical because if Claude is down, we still want GPT-4 results
    const results = await Promise.allSettled(
      models.map(async (model) => {
        // Report that we're starting to query this model
        // The ?. is optional chaining - only calls if onProgress exists
        onProgress?.({ model, status: 'pending' });

        try {
          const startTime = Date.now();
          const result = await this.queryModel(model, prompt);

          // Report success with timing information
          onProgress?.({
            model,
            status: 'success',
            latency: Date.now() - startTime  // How long the request took
          });

          return result;

        } catch (error: unknown) {
          // Report failure
          const message = error instanceof Error ? error.message : String(error);
          onProgress?.({
            model,
            status: 'error',
            error: message
          });

          // Re-throw to mark this promise as rejected
          throw error;
        }
      })
    );

    // Combine results from all successful queries
    const responses: ModelResponse[] = [];

    // Process each result, whether it succeeded or failed
    results.forEach((result, index) => {
      // Check if this specific model's query succeeded
      if (result.status === 'fulfilled') {
        const modelName = models[index];

        // Add all responses from this model
        // Also tag each response with which model generated it
        result.value.data.forEach((item) => {
          responses.push({
            ...item,
            sources: [...(item.sources || []), modelName],
            model: modelName,
          });
        });
      }
      // If result.status === 'rejected', we just skip it
    });

    return responses;
  }

  // ---------------------------------------------------------------------------
  // Development helper: simulate an API call. Replace with real HTTP calls.
  // Returns an array of ModelResponse objects wrapped by the model's ApiResponse.
  // ---------------------------------------------------------------------------
  private async simulateAPICall(model: ModelName, prompt: string): Promise<ModelResponse[]> {
    // Simulate variable latency
    const latency = 200 + Math.floor(Math.random() * 400);
    await new Promise((r) => setTimeout(r, latency));

    // Simulate a response from each model
    const now = Date.now();
    const items: ModelResponse[] = [];
    items.push({
      id: `${model}-${now}`,
      content: `Simulated response from ${model}`,
      confidence: Math.random(),
      sources: [model],
      model,
    });

    return items;
  }
}

export { };
