import { UsageGuideConfig } from 'ts-command-line-args';

export interface ICopyPartialJsonArgs {
    sourceFile: string;
    targetFile: string[];
    keys: string[];
    jsonIndent: number;
    gitAdd: boolean;
    help: boolean;
}

const defaultSource = `package.json`;

export const usageGuideInfo: UsageGuideConfig<ICopyPartialJsonArgs> = {
    arguments: {
        sourceFile: {
            type: String,
            alias: 's',
            description: `The json file to copy from. Defaults to '${defaultSource}'`,
            defaultValue: defaultSource,
            defaultOption: true,
        },
        targetFile: { type: String, multiple: true, alias: 't', description: 'The json file to copy to' },
        keys: {
            type: String,
            alias: 'k',
            multiple: true,
            description: `The keys to copy. For example, 'version,name,dependencies'`,
        },
        jsonIndent: {
            type: Number,
            defaultValue: 4,
            alias: 'i',
            description: 'The number of spaces to indent your json file by. Defaults to 4.',
        },
        gitAdd: { type: Boolean, alias: 'g', description: 'adds any target files to git after updating' },
        help: { type: Boolean, alias: 'h', description: 'Show this help text' },
    },
    parseOptions: {
        helpArg: 'help',
        baseCommand: 'workspace-version',
        headerContentSections: [
            {
                header: `workspace-version`,
                includeIn: `cli`,
                content: `A simple script to copy portions of a json document from one file to another.

To copy the version and dependency list from a root package.json to another packages:

{code.bash $ workspace-version -s package.json -t one/package.json -k version name dependencies}`,
            },
        ],
    },
};
