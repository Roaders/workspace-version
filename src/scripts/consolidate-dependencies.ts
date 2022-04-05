#!/usr/bin/env node

import { parse } from 'ts-command-line-args';
import { getWorkspaceDependencies, loadAllPackages } from '../workspace.helper';
import { consolidateDependenciesInfo } from './write-markdown.constants';

async function consolidate() {
    const { workspacePackage, migrateDevDependencies } = parse(
        consolidateDependenciesInfo.arguments,
        consolidateDependenciesInfo.parseOptions,
    );

    const { childPackages, rootPackageJson } = await loadAllPackages(workspacePackage);

    const allDependencies = getWorkspaceDependencies([rootPackageJson, ...childPackages]);

    console.log({ workspacePackage, migrateDevDependencies, allDependencies });
}

consolidate();
