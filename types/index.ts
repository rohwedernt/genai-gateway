import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

// Generic type for API responses - this is a TypeScript generic
// The <T> means this interface can work with any type we pass in
// Example: ApiResponse<string> or ApiResponse<ModelResponse[]>
// This is reusable for any API call we make
export interface ApiResponse<T> {
  data: T;  // T is whatever type we specify when using this interface
  error?: string;  // Optional field (the ? means it might not exist)
  timestamp: number;  // Unix timestamp of when response was received
  source: 'GPT-4o' | 'Claude Sonnet 3.5' | 'Gemini' | 'cache';  // Union type - must be one of these exact strings
}

// Generic model response for any prompt
export interface ModelResponse {
  id: string;            // Unique id for the response (could be model+hash)
  content: string;       // The textual response from the model
  confidence: number;    // 0-1 score (simulated)
  sources: string[];     // Which models contributed to this aggregated response
  model: string;         // The model that generated this response
}

// Tracks the status of each AI model as we query it
export interface ModelStatus {
  model: string;
  status: 'idle' | 'pending' | 'success' | 'error';  // Union type for possible states
  latency?: number;  // Optional - how long the request took in milliseconds
  error?: string;  // Optional - error message if status is 'error'
}
