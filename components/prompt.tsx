"use client";

import { type FormEvent } from "react";
import { SearchIcon } from "@/components/icons";
import { Form } from "@heroui/form";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Kbd } from "@heroui/kbd";
import type { ModelResponse, ModelStatus } from '@/types';

interface PromptProps {
  onSearch: (prompt: string, onProgress?: (status: ModelStatus) => void) => Promise<ModelResponse[]>;
  isLoading?: boolean;
}

export const Prompt = ({ onSearch, isLoading = false }: PromptProps) => {
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement));
    const stringPrompt = String(data.prompt || "").trim();

    if (!stringPrompt) return;

    // Parent component handles loading and progress; just forward the prompt
    try {
      await onSearch(stringPrompt);
    } catch (err) {
      // Let the parent handle errors
      console.error('Prompt onSearch error:', err);
    }
  };

  return (
    <Form className="w-full flex-row" onSubmit={onSubmit}>
      <Input
        aria-label="Search"
        classNames={{
          inputWrapper: "bg-default-100",
          input: "text-sm",
        }}
        endContent={
          <Kbd className="hidden lg:inline-block" keys={["command"]}>
            K
          </Kbd>
        }
        name="prompt"
        placeholder="Prompt"
        labelPlacement="outside"
        type="search"
        startContent={
          <SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />
        }
        isDisabled={isLoading}
      />
      <Button type="submit" variant="bordered" isDisabled={isLoading} isLoading={isLoading} className="ml-2">
        {isLoading ? 'Loading…' : 'Submit'}
      </Button>
    </Form>
  );
};
