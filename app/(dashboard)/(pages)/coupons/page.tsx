"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';

export default function CouponsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/campaigns?tab=coupons');
  }, [router]);

  return <Loading />;
}
