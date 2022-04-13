import chalk from 'chalk';
import { IPackageJson } from '..';
import {
    Dependencies,
    DependencyInstallInfo,
    DependencyType,
    WorkspaceDependencies,
    WorkspacesInstallInfo,
    WorkspaceVersion,
    WorkspaceWithPath,
    WorkspaceDependencyType,
} from '../contracts';
import { isDefined } from './type-guards';
import { execSync } from 'child_process';

export function getWorkspaceDependencies(workspaces: WorkspaceWithPath[]): WorkspaceDependencies {
    const dependencies: WorkspaceDependencies = {};

    workspaces.forEach((workspace) => addWorkspaceDependencies(dependencies, workspace));

    return dependencies;
}

export async function installToWorkspaces(installations: WorkspacesInstallInfo[], path?: string): Promise<void> {
    path = path || process.cwd();

    for (const info of installations) {
        await installPackages(info, path);
    }
}

export async function installPackages(info: WorkspacesInstallInfo, path?: string): Promise<void> {
    const action = info.uninstall === true ? `npm uninstall` : `npm install`;

    let workspaces: string;

    switch (info.workspaces) {
        case null:
            workspaces = '';
            break;

        case 'all':
            workspaces = '--workspaces';
            break;

        default:
            workspaces = info.workspaces.map((workspace) => `-w ${workspace}`).join(' ');
    }

    let saveAs: string;

    switch (info.type) {
        case 'dev':
            saveAs = '-D';
            break;

        case 'peer':
            saveAs = '--save-peer';
            break;

        case 'prod':
            saveAs = '-P';
            break;

        default:
            saveAs = '';
    }

    const dependencies = info.dependencies.join(' ');

    const command = `${action} ${saveAs} ${workspaces} ${dependencies}`;

    console.log(`${chalk.yellow('Running Command:')} ${command}`);

    execSync(command, { cwd: path, stdio: 'inherit' });
}

export function determineWorkspacesInstallCommands(
    info: DependencyInstallInfo,
    migrateDevDependencies: boolean,
    rootPackageJson?: IPackageJson,
): WorkspacesInstallInfo[] {
    const { rootInstallCommand, copyDevCommand, uninstallDevCommand } = determineRootInstallCommands(
        info,
        migrateDevDependencies,
    );

    const packageInstallCommands = determinePackageInstallCommands(info, rootPackageJson, migrateDevDependencies);

    return [rootInstallCommand, copyDevCommand, uninstallDevCommand, ...packageInstallCommands].filter(isDefined);
}

type WorkspaceWithString = {
    workspaces: string[] | 'all' | null;
    workspaceString: string;
    name: string;
};

function determinePackageInstallCommands(
    info: DependencyInstallInfo,
    rootPackageJson?: IPackageJson,
    excludeDev?: boolean,
): WorkspacesInstallInfo[] {
    const dependencyWorkspacesLookup = Object.entries(info)
        .map(([name, workspace]) => ({ name, workspace }))
        .filter(isNameWorkspace)
        .map(({ name, workspace }) => {
            const workspaces = getWorkspaceString(workspace.workspaces, rootPackageJson, excludeDev);

            if (workspaces == null) {
                return undefined;
            }

            return {
                name: `${name}@${workspace.version}`,
                ...workspaces,
            };
        })
        .filter(isDefined)
        .reduce<Record<string, WorkspacesInstallInfo>>(reduceWorkspace, {});

    return Object.values(dependencyWorkspacesLookup);
}

function isNameWorkspace(input: unknown): input is { name: string; workspace: WorkspaceVersion } {
    const workspaceInfo = input as { name: string; workspace: WorkspaceVersion };
    return typeof workspaceInfo.name === 'string' && typeof workspaceInfo.workspace === 'object';
}

function reduceWorkspace(
    lookup: Record<string, WorkspacesInstallInfo>,
    workspace: WorkspaceWithString,
): Record<string, WorkspacesInstallInfo> {
    let installCommand = lookup[workspace.workspaceString];

    if (installCommand == null) {
        installCommand = { workspaces: workspace.workspaces, dependencies: [workspace.name] };
    } else {
        installCommand = {
            ...installCommand,
            dependencies: [...installCommand.dependencies, workspace.name].reduce(dedupeStrings, []),
        };
    }

    lookup[workspace.workspaceString] = installCommand;

    return lookup;
}

function dedupeStrings(all: string[], current: string): string[] {
    return all.includes(current) ? all : [...all, current];
}

function getWorkspaceString(
    workspaceList: WorkspaceDependencyType[],
    rootPackageJson?: IPackageJson,
    excludeDev?: boolean,
): { workspaces: Array<string> | 'all' | null; workspaceString: string } | undefined {
    const rootWorkspaces = rootPackageJson?.workspaces;

    workspaceList = excludeDev ? workspaceList.filter(({ type }) => type != 'dev') : workspaceList;

    if (workspaceList.length === 0) {
        return undefined;
    }

    const allWorkspaces =
        rootWorkspaces != null &&
        rootWorkspaces.every((rootWorkspace) =>
            workspaceList.some((current) => current.workspace.workspacePath === rootWorkspace),
        );

    const workspaces = allWorkspaces
        ? ('all' as const)
        : workspaceList
              .map((workspace) => workspace.workspace.workspacePath)
              .filter(isDefined)
              .sort();

    const workspaceString = Array.isArray(workspaces) ? workspaces.join(',') : 'all';

    return { workspaces, workspaceString };
}

function determineRootInstallCommands(
    info: DependencyInstallInfo,
    migrateDevDependencies: boolean,
): {
    rootInstallCommand: WorkspacesInstallInfo | undefined;
    copyDevCommand: WorkspacesInstallInfo | undefined;
    uninstallDevCommand: WorkspacesInstallInfo | undefined;
} {
    const allDependencies = Object.entries(info)
        .map(([name, version]) => ({ name, version }))
        .reduce(
            (all, current) => [...all, ...mapInstallInfo(current.name, current.version)],
            new Array<WorkspaceDependency | undefined>(),
        )
        .filter(isDefined);

    const rootDependencies = allDependencies.filter((dependency) => dependency.workspacePath == null);

    const rootInstallCommand: WorkspacesInstallInfo | undefined =
        rootDependencies.length > 0
            ? {
                  workspaces: null,
                  dependencies: Array.from(
                      new Set(rootDependencies.map(({ name, version }) => mapDependency(name, version))),
                  ),
              }
            : undefined;

    const devDependencies = allDependencies.filter((dependency) => dependency.type === 'dev');

    let copyDevCommand: WorkspacesInstallInfo | undefined;
    let uninstallDevCommand: WorkspacesInstallInfo | undefined;

    if (migrateDevDependencies && devDependencies.length > 0) {
        copyDevCommand = {
            workspaces: null,
            dependencies: Array.from(new Set(devDependencies.map(({ name, version }) => mapDependency(name, version)))),
            type: 'dev',
        };
        uninstallDevCommand = {
            workspaces: 'all',
            dependencies: Array.from(new Set(devDependencies.map(({ name }) => name))),
            uninstall: true,
        };
    }

    return { rootInstallCommand, copyDevCommand, uninstallDevCommand };
}

function mapDependency(name: string, version: string): string {
    return `${name}@${version}`;
}

type WorkspaceDependency = {
    name: string;
    version: string;
    type: DependencyType;
} & WorkspaceWithPath;

function mapInstallInfo(name: string, workspaceVersion?: WorkspaceVersion): WorkspaceDependency[] {
    if (workspaceVersion == null) {
        return [];
    }

    return workspaceVersion.workspaces.map((workspace) => ({
        name,
        version: workspaceVersion.version,
        type: workspace.type,
        ...workspace.workspace,
    }));
}

function addWorkspaceDependencies(dependencies: WorkspaceDependencies, workspace: WorkspaceWithPath): void {
    addDependencies(dependencies, workspace.packageJson.dependencies, workspace, 'prod');
    addDependencies(dependencies, workspace.packageJson.devDependencies, workspace, 'dev');
    addDependencies(dependencies, workspace.packageJson.peerDependencies, workspace, 'peer');
}

function addDependencies(
    allDependencies: WorkspaceDependencies,
    dependencies: Dependencies | undefined,
    workspace: WorkspaceWithPath,
    type: DependencyType,
): void {
    if (dependencies == null) {
        return;
    }

    Object.entries(dependencies).forEach(([name, version]) => {
        if (version == null) {
            return;
        }

        let dependencyLookup = allDependencies[name];

        if (dependencyLookup == null) {
            dependencyLookup = allDependencies[name] = {};
        }

        let versionWorkspaces = dependencyLookup[version];

        if (versionWorkspaces == null) {
            versionWorkspaces = dependencyLookup[version] = [];
        }

        versionWorkspaces.push({ workspace, type });
    });
}
