export type Dependencies = Partial<Record<string, string>>;

export type IPackageJson = {
    name: string;
    version: string;
    dependencies?: Dependencies;
    devDependencies?: Dependencies;
    peerDependencies?: Dependencies;
    workspaces?: string[];
};
