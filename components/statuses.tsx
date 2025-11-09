"use client";

import React, { useEffect, useState } from 'react';
import type { ModelStatus } from '@/types';
import { Alert } from '@heroui/alert';

const MODELS: string[] = ['GPT-4o', 'Claude Sonnet 3.5', 'Gemini'];

type ExtendedStatus = ModelStatus & { updatedAt?: number };

function AlertItem({ status }: { status: ExtendedStatus }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, [status.updatedAt]);

  const cls = `transition-transform transition-opacity duration-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`;

  return (
    <div className={cls}>
      <Alert color={status.status === 'error' ? 'danger' : status.status === 'success' ? 'success' : 'default'}>
        <div className="font-medium">{status.model} — {status.status}{status.latency ? ` (${status.latency}ms)` : ''}</div>
        {status.error && <div className="text-sm text-danger mt-1">{status.error}</div>}
      </Alert>
    </div>
  );
}

export function StatusPanel({ statuses }: { statuses: Record<string, ExtendedStatus> }) {
  return (
    <div className="w-full max-w-2xl text-left text-sm text-default-500 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
      {MODELS.map((m) => {
        const s = statuses[m] ?? ({ model: m, status: 'idle' } as ExtendedStatus);
        return <AlertItem key={m} status={s} />;
      })}
    </div>
  );
}
