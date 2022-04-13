#!/usr/bin/env node

import chalk from 'chalk';
import { execSync } from 'child_process';
import { firstValueFrom, from, mergeMap, toArray } from 'rxjs';
import { parse } from 'ts-command-line-args';
import { loadAllPackages } from '..';
import { Dependencies, IPackageJson } from '../contracts';
import { savePackageJson, verifyUniquePackageNames } from '../helpers';
import { workspaceVersionInfo } from './write-markdown.constants';

function workspaceVersion() {
    const args = parse(workspaceVersionInfo.arguments, workspaceVersionInfo.parseOptions);

    alignChildWorkspaceVersions(args.workspacePackage, args.jsonIndent, args.independent, args.gitAdd);
}

/**
 * Sets all child workspaces to same versions as root (unless running in independent mode)
 * Updates all sibling package dependency versions
 * @param packagePath
 * @param jsonIndent
 * @param independent
 * @param gitAdd
 */
async function alignChildWorkspaceVersions(
    packagePath: string,
    jsonIndent: number,
    independent: boolean,
    gitAdd: boolean,
): Promise<void> {
    const { childPackages, rootPackageJson } = await loadAllPackages(packagePath);

    if (!independent) {
        alignVersions(
            rootPackageJson.packageJson,
            childPackages.map((child) => child.packageJson),
        );
    }

    const allPackages = [rootPackageJson, ...childPackages];

    verifyUniquePackageNames(allPackages);
    updateSiblingDependencyVersions(allPackages.map((packageWithPath) => packageWithPath.packageJson));

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

function updateSiblingDependencyVersions(packages: IPackageJson[]): void {
    console.log(chalk.yellow(`Updating sibling dependency versions...`));

    packages.forEach((currentPackage) => {
        updateDependencyVersions(currentPackage.dependencies, packages);
        updateDependencyVersions(currentPackage.devDependencies, packages);
        updateDependencyVersions(currentPackage.peerDependencies, packages);
    });
}

function updateDependencyVersions(dependencies: Dependencies | undefined, packages: IPackageJson[]) {
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

/**
 * Set all package versions to source version
 * @param source
 * @param targets
 */
function alignVersions(source: IPackageJson, targets: IPackageJson[]): void {
    console.log(chalk.yellow(`Setting version of all child packages to ${source.version}...`));

    targets.forEach((target) => (target.version = source.version));
}

workspaceVersion();
