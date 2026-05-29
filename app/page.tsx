"use client";

import AuthenticatedHome from "@/components/home/AuthenticatedHome";
import UnauthenticatedHome from "@/components/home/UnauthenticatedHome";
import { useAuthenticated } from "@/contexts/authenticated-context";

export default function Home() {
  const { isAuthenticated, user } = useAuthenticated();

  if (!isAuthenticated) {
    return <UnauthenticatedHome />;
  }

  return <AuthenticatedHome name={user?.name} email={user?.email} />;
}
