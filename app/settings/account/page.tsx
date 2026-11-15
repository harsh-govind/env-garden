import { Suspense } from "react";
import AccountConnections from "@/components/settings/account-connections";

export default function AccountSettingsPage() {
    return (
        <Suspense fallback={null}>
            <AccountConnections />
        </Suspense>
    );
}
