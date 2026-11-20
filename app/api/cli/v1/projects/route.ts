import { cliJson, withCliUser } from "@/lib/cli/route";
import { getProjectDetailForUser } from "@/prisma/services/project";
import {
    getWorkspaceDetailForUser,
    listWorkspacesForUser,
} from "@/prisma/services/workspace";
import type { CliProjectsResponse, CliWorkspaceSummary } from "@/types/cli";

export async function GET(request: Request) {
    return withCliUser(request, async (user) => {
        const workspaces = await listWorkspacesForUser(user.id);

        const tree: CliWorkspaceSummary[] = await Promise.all(
            workspaces.map(async (workspace) => {
                const detail = await getWorkspaceDetailForUser(workspace.id, user.id);
                const projects = await Promise.all(
                    (detail?.projects ?? []).map(async (project) => {
                        const projectDetail = await getProjectDetailForUser({
                            workspaceId: workspace.id,
                            projectId: project.id,
                            userId: user.id,
                        });

                        return {
                            id: project.id,
                            name: project.name,
                            envFiles: (projectDetail?.envFiles ?? []).map((envFile) => ({
                                id: envFile.id,
                                name: envFile.name,
                                environment: envFile.environment,
                                variableCount: envFile.variableCount,
                            })),
                        };
                    })
                );

                return {
                    id: workspace.id,
                    name: workspace.name,
                    projects,
                };
            })
        );

        const response: CliProjectsResponse = { workspaces: tree };

        return cliJson(response);
    });
}
