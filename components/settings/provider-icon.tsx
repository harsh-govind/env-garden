import { FaGithub, FaGoogle } from "react-icons/fa6";
import type { ProviderIconProps } from "@/types/auth";

export default function ProviderIcon({ providerId, className }: ProviderIconProps) {
    return providerId === "google" ? <FaGoogle className={className} /> : <FaGithub className={className} />;
}
