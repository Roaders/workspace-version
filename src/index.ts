#!/usr/bin/env node

import { parse } from 'ts-command-line-args';
import { usageGuideInfo } from './write-markdown.constants';

function workspaceVersion() {
    const args = parse(usageGuideInfo.arguments, usageGuideInfo.parseOptions);

    console.log(args);
}

workspaceVersion();
