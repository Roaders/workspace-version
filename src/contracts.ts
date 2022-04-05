export type Dependencies = Partial<Record<string, string>>;

export type DependencyType = 'prod' | 'peer' | 'dev';

export type IPackageJson = {
    name: string;
    version: string;
    dependencies?: Dependencies;
    devDependencies?: Dependencies;
    peerDependencies?: Dependencies;
    workspaces?: string[];
};

export type WorkspaceWithPath = {
    packagePath: string;
    packageJson: IPackageJson;
};

export type WorkspaceDependencies = Record<string, VersionWorkspaces | undefined>;

export type VersionWorkspaces = Record<string, WorkspaceDependencyType[] | undefined>;

export type WorkspaceDependencyType = { workspace: WorkspaceWithPath; type: DependencyType };
