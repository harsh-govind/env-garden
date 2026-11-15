import SettingsTabs from "@/components/settings/settings-tabs";
import type { SettingsLayoutProps } from "@/types/settings";

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-2xl space-y-4 pb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage your profile and where you&apos;re signed in.
                    </p>
                </div>
                <SettingsTabs />
                {children}
            </div>
        </div>
    );
}
