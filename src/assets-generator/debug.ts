import * as vscode from 'vscode';
import * as jsonc from 'jsonc-parser';
import * as fs from 'fs-extra';
import {getFormattingOptions, replaceCommentPropertiesWithComments, updateJsonWithComments} from '../json-utils';
import {findGodotExecutablePath} from '../godot-utils';

export function createLaunchConfiguration(godotExecutablePath: string | undefined):
	{version: string, configurations: vscode.DebugConfiguration[]}
{
	return {
		version: '2.0.0',
		configurations: _createDebugConfigurations(godotExecutablePath),
	};
}

export function createDebugConfigurationsArray(godotExecutablePath: string | undefined): vscode.DebugConfiguration[]
{
	const configurations = _createDebugConfigurations(godotExecutablePath);

	// Remove comments
	configurations.forEach(configuration => {
		for (const key in configuration)
		{
			if (Object.prototype.hasOwnProperty.call(configuration, key))
			{
				if (key.startsWith('OS-COMMENT'))
				{
					delete configuration[key];
				}
			}
		}
	});

	return configurations;
}

function _createDebugConfigurations(godotExecutablePath: string | undefined): vscode.DebugConfiguration[]
{
	return [
		createLaunchDebugConfiguration(godotExecutablePath),
		createLaunchDebugConfiguration(godotExecutablePath, true),
		createAttachDebugConfiguration(true),
		createAttachDebugConfiguration(),
		createLaunchEditorDebugConfiguration(godotExecutablePath),
	];
}

export function createLaunchEditorDebugConfiguration(godotExecutablePath: string | undefined): vscode.DebugConfiguration
{
	godotExecutablePath = godotExecutablePath ?? '<insert-godot-executable-path-here>';
	return {
			name: "Launch in Editor",
            type: "coreclr",
            request: "launch",
            preLaunchTask: "build",
            program: godotExecutablePath,
            cwd: "${workspaceFolder}",
            console: "internalConsole",
            stopAtEntry: false,
            args: [
                "--path",
                "${workspaceRoot}",
				"--editor"
            ]
	};
}

export function createLaunchDebugConfiguration(godotExecutablePath: string | undefined, canSelectScene: boolean = false): vscode.DebugConfiguration
{
	godotExecutablePath = godotExecutablePath ?? '<insert-godot-executable-path-here>';
	return {
		name: `Launch${canSelectScene ? ' (Select Scene)' : ''}`,
		type: "coreclr",
		program: godotExecutablePath,
		request: "launch",
		preLaunchTask: "build",
		cwd: "${workspaceFolder}",
		console: "internalConsole",
		stopAtEntry: false,
		args: [
			"--path",
			"${workspaceRoot}",
			...(canSelectScene ? ['${command:godot.csharp.getLaunchScene}'] : []),
		]
	};
}

export function createAttachDebugConfiguration(filterProjects: boolean = false): vscode.DebugConfiguration
{
	return {
		name: `Attach${filterProjects ? ' (Godot Instance)' : ''}`,
		type: 'coreclr',
		request: 'attach',
		processId: (filterProjects ? '${command:godot.csharp.getGodotProcesses}' : '${command:pickProcess}'),
	};
}

export async function addLaunchJsonIfNecessary(launchJsonPath: string): Promise<void>
{
	const godotExecutablePath = await findGodotExecutablePath();
	const launchConfiguration = createLaunchConfiguration(godotExecutablePath);

	const formattingOptions = getFormattingOptions();

	let text: string;
	const exists = await fs.pathExists(launchJsonPath);
	if (!exists) {
		// when launch.json does not exist, create it and write all the content directly
		const launchJsonText = JSON.stringify(launchConfiguration);
		const launchJsonTextFormatted = jsonc.applyEdits(launchJsonText, jsonc.format(launchJsonText, undefined, formattingOptions));
		text = launchJsonTextFormatted;
	} else {
		// when launch.json exists replace or append our configurations
		const ourConfigs = launchConfiguration.configurations ?? [];
		const content = fs.readFileSync(launchJsonPath).toString();
		const updatedJson = updateJsonWithComments(content, ourConfigs, 'configurations', 'name', formattingOptions);
		text = updatedJson;
	}

	const textWithComments = replaceCommentPropertiesWithComments(text);
	await fs.writeFile(launchJsonPath, textWithComments);
}
