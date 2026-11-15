import { redirect } from "next/navigation";
import { SETTINGS_PROFILE_PATH } from "@/constants/routes";

export default function SettingsPage() {
    redirect(SETTINGS_PROFILE_PATH);
}
