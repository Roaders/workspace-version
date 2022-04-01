import { UsageGuideConfig } from 'ts-command-line-args';
import { defaultSource } from '../constants';

export interface IWorkspaceVersionArgs {
    workspacePackage: string;
    jsonIndent: number;
    independent: boolean;
    gitAdd: boolean;
    help: boolean;
}

export const usageGuideInfo: UsageGuideConfig<IWorkspaceVersionArgs> = {
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
        headerContentSections: [
            {
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
