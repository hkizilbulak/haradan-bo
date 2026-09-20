"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TjkRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/job-management');
  }, [router]);

  return null;
}
