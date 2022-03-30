# copy-partial-json

 > A simple script to copy portions of a json document from one file to another

![npm](https://img.shields.io/npm/v/workspace-version)
![NPM](https://img.shields.io/npm/l/workspace-version)
![Typescript](https://img.shields.io/badge/types-TypeScript-blue)


[//]: ####ts-command-line-args_write-markdown_replaceBelow  


Keeps dependency and package versions within an npm workspace in line.  
                  
By default this script will update all child package versions to match that of the workspace version and update all dependency versions that refer to sibling packages:  
  
  
```  
$ workspace-version  
```  
  
  
Alternatively you can run in `independent` mode:  
  
  
```  
$ workspace-version -i  
```  
  
  
This will not update the child package versions but will still update all dependency versions to that of the sibling projects.  
  
Lastly you can also add all modified files to git:  
  
  
```  
$ workspace-version -g  
```  
  



## Options

| Argument | Alias | Type | Description |
|-|-|-|-|
| **workspacePackage** | **w** | string | The path of the workspace package.json. Defaults to 'package.json' |
| **independent** | **i** | boolean | turns on independent versioning of child packages. This will prevent versions of child packages from being updated |
| **gitAdd** | **g** | boolean | adds any target files to git after updating |
| **jsonIndent** | **j** | number | The number of spaces to indent your json file by. Defaults to 4. |
| **help** | **h** | boolean | Show this help text |

[//]: ####ts-command-line-args_write-markdown_replaceAbove  
