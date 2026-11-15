import AppSessions from "@/components/settings/app-sessions";
import CliSessions from "@/components/settings/cli-sessions";

export default function SessionsSettingsPage() {
    return (
        <div className="space-y-4">
            <AppSessions />
            <CliSessions />
        </div>
    );
}
