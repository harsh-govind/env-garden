import { redirect } from "next/navigation";
import { CLI_DOCS_PATH } from "@/constants/routes";

export default function DocsPage() {
    redirect(CLI_DOCS_PATH);
}
