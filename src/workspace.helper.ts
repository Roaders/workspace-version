import { readFile, writeFile } from 'fs';
import { promisify } from 'util';
import print from 'message-await';
import chalk from 'chalk';
import { Dependencies, IPackageJson } from './contracts';
import { from, firstValueFrom } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { join } from 'path';
import { defaultSource } from './write-markdown.constants';
import { execSync } from 'child_process';

const awaitReadFile = promisify(readFile);
const awaitWriteFile = promisify(writeFile);

type WorkspaceWithPath = {
    packagePath: string;
    packageJson: IPackageJson;
};

export async function consolidateWorkspace(
    packagePath: string,
    jsonIndent: number,
    independent: boolean,
    gitAdd: boolean,
): Promise<void> {
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

    if (!independent) {
        alignVersions(
            packageJson,
            childPackages.map((child) => child.packageJson),
        );
    }

    const allPackages = [{ packagePath, packageJson }, ...childPackages];

    verifyPackageNames(allPackages);
    updatePackageDependencyVersions(allPackages.map((packageWithPath) => packageWithPath.packageJson));

    await firstValueFrom(
        from(allPackages).pipe(
            mergeMap((workspace) => savePackageJson(workspace, jsonIndent), 1),
            toArray(),
        ),
    );

    if (gitAdd) {
        const filePathsString = allPackages.map((current) => current.packagePath).join(' ');

        execSync(`git add ${filePathsString}`);
    }
}

function verifyPackageNames(allPackages: WorkspaceWithPath[]): void {
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

function updatePackageDependencyVersions(packages: IPackageJson[]): void {
    console.log(chalk.yellow(`Updating sibling dependency versions...`));

    packages.forEach((currentPackage) => {
        updateVersions(currentPackage.dependencies, packages);
        updateVersions(currentPackage.devDependencies, packages);
        updateVersions(currentPackage.peerDependencies, packages);
    });
}

function updateVersions(dependencies: Dependencies | undefined, packages: IPackageJson[]) {
    if (dependencies == null) {
        return;
    }

    packages.forEach((currentPackage) => {
        const currentVersion = dependencies[currentPackage.name];
        if (currentVersion != null) {
            const versionRange = currentVersion.charAt(0);

            let newVersion = currentPackage.version;

            switch (versionRange) {
                case '~':
                case '^':
                    newVersion = versionRange + newVersion;
            }

            dependencies[currentPackage.name] = newVersion;
        }
    });
}

function alignVersions(source: IPackageJson, targets: IPackageJson[]): void {
    console.log(chalk.yellow(`Setting version of all child packages to ${source.version}...`));

    targets.forEach((target) => (target.version = source.version));
}

async function loadChildWorkspace(workspacePath: string): Promise<WorkspaceWithPath> {
    const packagePath = join(workspacePath, defaultSource);
    const packageJson = await loadPackageJson(packagePath);

    return { packagePath, packageJson };
}

async function savePackageJson(workspace: WorkspaceWithPath, indent: number): Promise<void> {
    return await print(`Saving '${workspace.packagePath}'`, {
        format: chalk.blue,
        spinner: true,
    }).await(awaitWriteFile(workspace.packagePath, JSON.stringify(workspace.packageJson, undefined, indent)));
}

async function loadPackageJson(path: string): Promise<IPackageJson> {
    const workspacePackageBuffer = await print(`Loading '${path}'`, {
        format: chalk.blue,
        spinner: true,
    }).await(awaitReadFile(path));

    return JSON.parse(workspacePackageBuffer.toString()) as IPackageJson;
}
