import {
    SETTINGS_ACCOUNT_PATH,
    SETTINGS_PROFILE_PATH,
    SETTINGS_SECURITY_PATH,
    SETTINGS_SESSIONS_PATH,
} from "@/constants/routes";
import type { SettingsTab } from "@/types/settings";

export const SETTINGS_TABS: SettingsTab[] = [
    { label: "Profile", href: SETTINGS_PROFILE_PATH },
    { label: "Account", href: SETTINGS_ACCOUNT_PATH },
    { label: "Security", href: SETTINGS_SECURITY_PATH },
    { label: "Sessions", href: SETTINGS_SESSIONS_PATH },
];
