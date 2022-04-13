import { readFile, writeFile } from 'fs';
import { promisify } from 'util';
import print from 'message-await';
import chalk from 'chalk';
import { IPackageJson, WorkspaceWithPath } from '../contracts';
import { join } from 'path';
import { firstValueFrom, from, mergeMap, toArray } from 'rxjs';
import { defaultSource } from '../constants';

const awaitReadFile = promisify(readFile);
const awaitWriteFile = promisify(writeFile);

export async function loadAllPackages(packagePath: string): Promise<{
    rootPackageJson: WorkspaceWithPath;
    childPackages: WorkspaceWithPath[];
}> {
    const packageJson = await loadPackageJson(packagePath);

    const childWorkspaces = packageJson?.workspaces || [];

    if (childWorkspaces.length === 0) {
        console.log(chalk.yellow(`No child workspaces found. Exiting.`));

        return process.exit(1);
    }

    const childPackages = await firstValueFrom(
        from(childWorkspaces).pipe(
            mergeMap((childWorkspacePath) => loadChildWorkspace(childWorkspacePath), 1),
            toArray(),
        ),
    );

    const rootPackageJson: WorkspaceWithPath = { packagePath, packageJson, workspacePath: undefined };

    return { rootPackageJson, childPackages };
}

export function verifyUniquePackageNames(allPackages: WorkspaceWithPath[]): void {
    console.log(chalk.yellow(`Verifying all package names are unique...`));
    const packageLookup: Record<string, string | undefined> = {};

    allPackages.forEach((currentPackage) => {
        const existing = packageLookup[currentPackage.packageJson.name];

        if (existing != undefined) {
            console.error(
                chalk.red(
                    `ERR: the package name '${currentPackage.packageJson.name}' is duplicated in the following locations:`,
                ),
            );
            console.log(` * ${existing}`);
            console.log(` * ${currentPackage.packagePath}`);
            process.exit(1);
        } else {
            packageLookup[currentPackage.packageJson.name] = currentPackage.packagePath;
        }
    });
}

export async function loadChildWorkspace(workspacePath: string): Promise<WorkspaceWithPath> {
    const packagePath = join(workspacePath, defaultSource);
    const packageJson = await loadPackageJson(packagePath);

    return { packagePath, packageJson, workspacePath };
}

export async function savePackageJson(workspace: WorkspaceWithPath, indent: number): Promise<void> {
    return await print(`Saving '${workspace.packagePath}'`, {
        format: chalk.blue,
        spinner: true,
    }).await(awaitWriteFile(workspace.packagePath, JSON.stringify(workspace.packageJson, undefined, indent)));
}

export async function loadPackageJson(path: string): Promise<IPackageJson> {
    const workspacePackageBuffer = await print(`Loading '${path}'`, {
        format: chalk.blue,
        spinner: true,
    }).await(awaitReadFile(path));

    return JSON.parse(workspacePackageBuffer.toString()) as IPackageJson;
}
