#!/usr/bin/env node

import { parse } from 'ts-command-line-args';
import { WorkspaceDependencies, WorkspaceDependencyType } from '..';
import { getWorkspaceDependencies, loadAllPackages } from '../workspace.helper';
import { consolidateDependenciesInfo } from './write-markdown.constants';
import Selector from 'node-option';
import chalk from 'chalk';
import { from, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { compare, coerce } from 'semver';

async function consolidate() {
    const { workspacePackage, migrateDevDependencies } = parse(
        consolidateDependenciesInfo.arguments,
        consolidateDependenciesInfo.parseOptions,
    );

    const { childPackages, rootPackageJson } = await loadAllPackages(workspacePackage);

    const allDependencies = getWorkspaceDependencies([rootPackageJson, ...childPackages]);

    const installDependencies = await selectVersions(allDependencies);

    console.log({ migrateDevDependencies, installDependencies });
}

type DependencyInstallInfo = Record<string, WorkspaceVersion | undefined>;

type WorkspaceVersion = { version: string; workspaces: WorkspaceDependencyType[] };

async function selectVersions(allDependencies: WorkspaceDependencies): Promise<DependencyInstallInfo> {
    const installInfo: DependencyInstallInfo = {};

    const dependencies = Object.entries(allDependencies).map(([dependency, versionLookup]) => ({
        dependency,
        versions: Object.entries(versionLookup || {})
            .map(([version, workspaces]) => ({ version, workspaces }))
            .filter(filterWorkspaceVersions),
    }));

    dependencies
        .filter(({ versions }) => versions.length === 1)
        .forEach(({ dependency, versions }) => (installInfo[dependency] = versions[0]));

    const multipleVersions = dependencies.filter(({ versions }) => versions.length > 1);

    const selectionObservable = from(multipleVersions).pipe(
        mergeMap(
            ({ dependency, versions }, index) =>
                selectVersion(dependency, versions, index, multipleVersions.length).then(
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

    return selected[0];
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
