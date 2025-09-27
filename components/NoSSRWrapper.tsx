'use client';

import { useEffect, useState } from 'react';

interface NoSSRWrapperProps {
  children: React.ReactNode;
}

export default function NoSSRWrapper({ children }: NoSSRWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
}