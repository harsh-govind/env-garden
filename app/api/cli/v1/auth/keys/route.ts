import { cliJson, withCliUser } from "@/lib/cli/route";
import { getCliAccountKeys } from "@/prisma/services/cli";

export async function GET(request: Request) {
    return withCliUser(request, async (_, token) => {
        const keys = await getCliAccountKeys(token.id);

        if (!keys) {
            return cliJson({ error: "Set up your encryption keys in the browser, then run `eit login` again." }, 409);
        }

        return cliJson(keys);
    });
}
