#!/usr/bin/env node

import { parse } from 'ts-command-line-args';
import { consolidateWorkspace } from './workspace.helper';
import { usageGuideInfo } from './write-markdown.constants';

function workspaceVersion() {
    const args = parse(usageGuideInfo.arguments, usageGuideInfo.parseOptions);

    consolidateWorkspace(args.workspacePackage, args.jsonIndent, args.independent, args.gitAdd);
}

workspaceVersion();
