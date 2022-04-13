#!/usr/bin/env node

import { parse } from 'ts-command-line-args';
import {
    determineWorkspacesInstallCommands,
    getWorkspaceDependencies,
    installToWorkspaces,
    loadAllPackages,
} from '../helpers';
import { consolidateDependenciesInfo } from './write-markdown.constants';
import Selector from 'node-option';
import chalk from 'chalk';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { compare, coerce } from 'semver';
import { DependencyInstallInfo, WorkspaceDependencyType, WorkspaceVersion } from '../contracts';

async function consolidate() {
    const { workspacePackage, migrateDevDependencies } = parse(
        consolidateDependenciesInfo.arguments,
        consolidateDependenciesInfo.parseOptions,
    );

    const { childPackages, rootPackageJson } = await loadAllPackages(workspacePackage);

    const allDependencies = getWorkspaceDependencies([rootPackageJson, ...childPackages]);

    const inScopeDependencies: DependencyVersions[] = Object.entries(allDependencies)
        .map(([dependency, versionLookup]) => ({
            dependency,
            versions: Object.entries(versionLookup || {})
                .map(([version, workspaces]) => ({ version, workspaces }))
                .filter(filterWorkspaceVersions),
        }))
        .filter((dependency) => dependencyInScope(dependency, migrateDevDependencies));

    const consolidatedDependencies = await selectVersions(inScopeDependencies);

    const installCommands = determineWorkspacesInstallCommands(
        consolidatedDependencies,
        migrateDevDependencies,
        rootPackageJson.packageJson,
    );

    installToWorkspaces(installCommands, rootPackageJson.workspacePath);
}

type DependencyVersions = { dependency: string; versions: WorkspaceVersion[] };

async function selectVersions(dependencyVersions: DependencyVersions[]): Promise<DependencyInstallInfo> {
    const installInfo: DependencyInstallInfo = {};

    const selectionObservable = from(dependencyVersions).pipe(
        mergeMap(
            ({ dependency, versions }, index) =>
                selectVersion(dependency, versions, index, dependencyVersions.length).then(
                    (version) => (installInfo[dependency] = version),
                ),
            1,
        ),
        toArray(),
    );

    await lastValueFrom(selectionObservable);

    return installInfo;
}

async function selectVersion(
    dependency: string,
    workspaceVersions: WorkspaceVersion[],
    index: number,
    count: number,
): Promise<WorkspaceVersion> {
    if (workspaceVersions.length < 2) {
        throw new Error(
            `Cannot dependency version for ${dependency} as workspace versions length is ${workspaceVersions.length}`,
        );
    }

    const selector = new Selector({ multiselect: false });

    workspaceVersions
        .sort(sortVersions)
        .forEach((workspaceVersion) =>
            selector.add(`${workspaceVersion.version} (${workspaceVersion.workspaces.length})`, workspaceVersion),
        );

    console.log(`Select version for dependency '${dependency}' (${index}/${count})`);

    const selected = await selector.render();

    if (selected.length === 0) {
        console.log(`${chalk.red('ERR:')} You must select a version`);
        return selectVersion(dependency, workspaceVersions, index, count);
    }

    const workspaces = workspaceVersions.reduce(
        (all, current) => [...all, ...current.workspaces],
        new Array<WorkspaceDependencyType>(),
    );

    return { ...selected[0], workspaces };
}

function dependencyInScope(dependency: DependencyVersions, migrateDevDependencies: boolean): boolean {
    switch (dependency.versions.length) {
        case 0:
            return false;

        case 1:
            return (
                migrateDevDependencies &&
                dependency.versions[0].workspaces.some((workspace) => workspace.type === 'dev')
            );

        default:
            return true;
    }
}

function sortVersions(one: WorkspaceVersion, two: WorkspaceVersion): number {
    const versionOne = coerce(one.version);
    const versionTwo = coerce(two.version);

    if (versionOne == null || versionTwo == null) {
        return 0;
    }

    return compare(versionTwo, versionOne);
}

function filterWorkspaceVersions(value: Partial<WorkspaceVersion>): value is WorkspaceVersion {
    return typeof value.version === 'string' && Array.isArray(value.workspaces);
}

consolidate();
