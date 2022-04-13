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
    workspacePath: string | undefined;
    packageJson: IPackageJson;
};

export type WorkspaceDependencies = Partial<Record<string, VersionWorkspaces>>;

export type VersionWorkspaces = Record<string, WorkspaceDependencyType[] | undefined>;

export type WorkspaceDependencyType = { workspace: WorkspaceWithPath; type: DependencyType };

export type DependencyInstallInfo = Record<string, WorkspaceVersion | undefined>;

export type WorkspaceVersion = { version: string; workspaces: WorkspaceDependencyType[] };

export type WorkspacesInstallInfo = {
    /**
     * null means install at root
     */
    workspaces: Array<string> | 'all' | null;
    /**
     * include version if required
     * ['rxjs@~7', 'lodash@^5.1']
     */
    dependencies: Array<string>;
    /**
     * Defaults to false - will normally install prod dependencies
     */
    type?: DependencyType;
    /**
     * if set to true will uninstall dependencies rather than install
     */
    uninstall?: boolean;
};
