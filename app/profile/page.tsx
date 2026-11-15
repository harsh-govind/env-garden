import { redirect } from "next/navigation";
import { SETTINGS_PROFILE_PATH } from "@/constants/routes";

export default function ProfilePage() {
    redirect(SETTINGS_PROFILE_PATH);
}
