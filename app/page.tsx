import { getServerSession } from "next-auth";
import AuthenticatedHome from "@/components/home/AuthenticatedHome";
import UnauthenticatedHome from "@/components/home/UnauthenticatedHome";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return <UnauthenticatedHome />;
  }

  return <AuthenticatedHome name={user.name} email={user.email} />;
}
