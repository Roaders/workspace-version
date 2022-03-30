#!/usr/bin/env node

import { parse } from 'ts-command-line-args';
import { copyPartial } from './copy.helper';
import { usageGuideInfo } from './write-markdown.constants';

function copyPartialJson() {
    const args = parse(usageGuideInfo.arguments, usageGuideInfo.parseOptions);

    copyPartial(args.sourceFile, args.targetFile, args.keys, args.jsonIndent, args.gitAdd);
}

copyPartialJson();
