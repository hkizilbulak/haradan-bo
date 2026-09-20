"use client";
import React, { Suspense } from 'react';
import JobHistoryClient from './JobHistoryClient';
import Loading from '@/components/Loading';

export default function JobHistoryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <JobHistoryClient />
    </Suspense>
  );
}
