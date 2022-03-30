import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

export function copyPartial(
    sourcePath: string,
    targetPaths: string[],
    keys: string[],
    jsonIndent: number,
    gitAdd: boolean,
): void {
    const source = loadJson(sourcePath, true);

    targetPaths.forEach((path) => {
        const targetFile = loadJson(path);

        keys.forEach((key) => {
            targetFile[key] = source[key];
        });

        writeFileSync(path, JSON.stringify(targetFile, undefined, jsonIndent));
    });

    if (gitAdd) {
        execSync(`git add ${targetPaths.join(' ')}`);
    }
}

function loadJson(path: string, throwError = false) {
    try {
        return JSON.parse(readFileSync(path).toString());
    } catch (e) {
        if (throwError) {
            throw e;
        }
        return {};
    }
}
