import { UsageGuideConfig } from 'ts-command-line-args';
import { defaultSource } from '../constants';

export interface IWorkspaceVersionArgs {
    workspacePackage: string;
    jsonIndent: number;
    independent: boolean;
    gitAdd: boolean;
    help: boolean;
}

export const workspaceVersionInfo: UsageGuideConfig<IWorkspaceVersionArgs> = {
    arguments: {
        workspacePackage: {
            type: String,
            alias: 'w',
            description: `The path of the workspace package.json. Defaults to '${defaultSource}'`,
            defaultValue: defaultSource,
        },
        independent: {
            type: Boolean,
            alias: 'i',
            description:
                'turns on independent versioning of child packages. This will prevent versions of child packages from being updated',
        },
        gitAdd: { type: Boolean, alias: 'g', description: 'adds any target files to git after updating' },
        jsonIndent: {
            type: Number,
            defaultValue: 4,
            alias: 'j',
            description: 'The number of spaces to indent your json file by. Defaults to 4.',
        },
        help: { type: Boolean, alias: 'h', description: 'Show this help text' },
    },
    parseOptions: {
        helpArg: 'help',
        baseCommand: 'workspace-version',
        optionsHeaderLevel: 4,
        headerContentSections: [
            {
                header: 'workspace-version',
                headerLevel: 3,
                content: `Keeps dependency and package versions within an npm workspace in line.
                
By default this script will update all child package versions to match that of the workspace version and update all dependency versions that refer to sibling packages:

{code:bash $ workspace-version}

Alternatively you can run in {highlight independent} mode:

{code:bash $ workspace-version -i}

This will not update the child package versions but will still update all dependency versions to that of the sibling projects.

Lastly you can also add all modified files to git:

{code:bash $ workspace-version -g}
`,
            },
        ],
    },
};

export interface IConsolidateDependenciesArgs {
    workspacePackage: string;
    migrateDevDependencies: boolean;
    help: boolean;
}

export const consolidateDependenciesInfo: UsageGuideConfig<IConsolidateDependenciesArgs> = {
    arguments: {
        workspacePackage: {
            type: String,
            alias: 'w',
            description: `The path of the workspace package.json. Defaults to '${defaultSource}'`,
            defaultValue: defaultSource,
        },
        migrateDevDependencies: {
            type: Boolean,
            alias: 'm',
            description: `Moves all dev dependencies to the root workspace`,
        },
        help: { type: Boolean, alias: 'h', description: 'Show this help text' },
    },
    parseOptions: {
        helpArg: 'help',
        baseCommand: 'consolidate-dependencies',
        optionsHeaderLevel: 4,
        headerContentSections: [
            {
                header: 'consolidate-dependencies',
                headerLevel: 3,
                content: `Consolidates dependency versions across all workspaces. Option to move all dev dependencies to root workspace.`,
            },
        ],
    },
};
