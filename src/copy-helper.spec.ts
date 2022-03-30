/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as fsImport from 'fs';
import { IMocked, Mock, setupFunction, registerMock, reset, any } from '@morgan-stanley/ts-mocking-bird';
import { copyPartial } from './copy.helper';

jest.mock('fs', () => require('@morgan-stanley/ts-mocking-bird').proxyJestModule(require.resolve('fs')));

describe('copy.helper', () => {
    let fileLookup: { [key: string]: Record<string, any> };

    beforeEach(() => {
        fileLookup = {};
        mockFs = Mock.create<typeof fsImport>().setup(
            setupFunction(
                'readFileSync',
                (path: any) =>
                    Mock.create<Buffer>().setup(setupFunction('toString', () => JSON.stringify(fileLookup[path])))
                        .mock as any,
            ),
            setupFunction('writeFileSync'),
        );

        registerMock(fsImport, mockFs.mock);

        fileLookup['sourceFile.json'] = {
            version: '1.2.3',
            name: 'sample-source',
            dependencies: {
                one: '1.2.3',
                two: '3.4.5',
            },
        };
        fileLookup['targetFile.json'] = {
            version: '0.0.1',
            dependencies: {
                one: '0.0.0',
                four: '3.4.5',
            },
            devDependencies: {
                typescript: '4.0.0',
            },
        };
    });

    afterEach(() => {
        reset(fsImport);
    });

    let mockFs: IMocked<typeof fsImport>;

    it(`should copy values from one json file to another`, () => {
        copyPartial('sourceFile.json', ['targetFile.json'], ['version', 'name', 'dependencies'], 4, false);

        const expectedFile = {
            version: '1.2.3',
            dependencies: {
                one: '1.2.3',
                two: '3.4.5',
            },
            devDependencies: {
                typescript: '4.0.0',
            },
            name: 'sample-source',
        };
        const expectedString = JSON.stringify(expectedFile, undefined, 4);

        expect(mockFs.withFunction('readFileSync').withParameters('sourceFile.json')).wasCalledOnce();
        expect(mockFs.withFunction('readFileSync').withParameters('targetFile.json')).wasCalledOnce();

        expect(
            mockFs.withFunction('writeFileSync').withParametersEqualTo('targetFile.json', expectedString),
        ).wasCalledOnce();
    });

    it(`should copy values from one json file to multiple other files`, () => {
        fileLookup['targetTwo.json'] = fileLookup['targetFile.json'];
        fileLookup['targetThree.json'] = fileLookup['targetFile.json'];
        copyPartial(
            'sourceFile.json',
            ['targetFile.json', 'targetTwo.json', 'targetThree.json'],
            ['version', 'name', 'dependencies'],
            4,
            false,
        );

        expect(mockFs.withFunction('readFileSync').withParameters('sourceFile.json')).wasCalledOnce();
        expect(mockFs.withFunction('readFileSync').withParameters('targetFile.json')).wasCalledOnce();
        expect(mockFs.withFunction('readFileSync').withParameters('targetTwo.json')).wasCalledOnce();
        expect(mockFs.withFunction('readFileSync').withParameters('targetThree.json')).wasCalledOnce();

        expect(mockFs.withFunction('writeFileSync').withParametersEqualTo('targetFile.json', any())).wasCalledOnce();
        expect(mockFs.withFunction('writeFileSync').withParametersEqualTo('targetTwo.json', any())).wasCalledOnce();
        expect(mockFs.withFunction('writeFileSync').withParametersEqualTo('targetThree.json', any())).wasCalledOnce();
    });

    it(`should create a new file when when doesn't already exist`, () => {
        copyPartial('sourceFile.json', ['newFile.json'], ['version', 'name', 'dependencies'], 2, false);

        const expectedString = JSON.stringify(fileLookup['sourceFile.json'], undefined, 2);

        expect(mockFs.withFunction('readFileSync').withParameters('sourceFile.json')).wasCalledOnce();
        expect(mockFs.withFunction('readFileSync').withParameters('newFile.json')).wasCalledOnce();

        expect(
            mockFs.withFunction('writeFileSync').withParametersEqualTo('newFile.json', expectedString),
        ).wasCalledOnce();
    });
});
