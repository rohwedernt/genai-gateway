"use client";

import { useState } from "react";
import { title, subtitle } from "@/components/primitives";
import { Prompt } from "@/components/prompt";
import { LLMOrchestrator } from '@/core/llm-orchestrator';
import type { ModelResponse, ModelStatus } from '@/types';
import { StatusPanel } from '@/components/statuses';
import { Card, CardBody } from '@heroui/card';

const orchestrator = new LLMOrchestrator();

// Status UI has been moved to a dedicated client component: `StatusPanel`.

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ModelResponse[] | null>(null);
  // track latest status per model so UI updates in-place instead of appending
  const [statuses, setStatuses] = useState<Record<string, ModelStatus & { updatedAt?: number }>>({});

  const onSearch = async (prompt: string) => {
    setError(null);
    setResults(null);
    setStatuses({});
    setIsLoading(true);

    const onProgress = (s: ModelStatus) => {
      const withTs: ModelStatus & { updatedAt?: number } = { ...s, updatedAt: Date.now() };
      setStatuses(prev => ({ ...prev, [s.model]: withTs }));
    };

    try {
      const res = await orchestrator.queryAllModels(prompt, onProgress);
      setResults(res);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex flex-col items-center justify-center gap-4 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title({ color: "violet" })}>GenAI&nbsp;</span>
        <span className={title()}>Gateway&nbsp;</span>
        <br />
        <div className={subtitle({ class: "mt-4" })}>
          Compares Chatbot responses for variable models, rate limiting and recommends an answer based on confidence level
        </div>
      </div>

      <div className="flex flex-col gap-6 pt-12 w-full items-center">
        <div className="w-full max-w-lg">
          <Prompt onSearch={onSearch} isLoading={isLoading} />
        </div>

        <StatusPanel statuses={statuses} />

        {/* Results */}
        {results && results.length > 0 && (
          <div className="w-full max-w-2xl space-y-6">
            {[...results].sort((a, b) => b.confidence - a.confidence).map((r, index) => (
              <Card
                key={r.id}
                isBlurred
                className={`border-none ${index === 0 
                  ? 'bg-primary/10 dark:bg-primary/20' 
                  : 'bg-background/60 dark:bg-default-100/50'
                }`}
                shadow="sm"
              >
                <CardBody>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        {index === 0 && (
                          <span className="text-tiny font-semibold uppercase text-primary">
                            Recommended Response
                          </span>
                        )}
                        <h3 className="font-semibold text-foreground/90">
                          {r.model}
                        </h3>
                      </div>
                    </div>
                    <p className="text-foreground/90 whitespace-pre-wrap">
                      {r.content}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {error && <div className="text-danger">{error}</div>}
      </div>
    </section>
  );
}
