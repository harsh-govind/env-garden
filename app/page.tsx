"use client";

import AuthenticatedHome from "@/components/home/AuthenticatedHome";
import UnauthenticatedHome from "@/components/home/UnauthenticatedHome";
import { useAuthenticated } from "@/contexts/authenticated";

export default function Home() {
  const { isAuthenticated } = useAuthenticated();

  if (!isAuthenticated) {
    return <UnauthenticatedHome />;
  }

  return <AuthenticatedHome />;
}
