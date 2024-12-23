import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { basename } from 'path';
import {findGodotExecutablePath} from '../godot-utils';
import { getProcesses } from './process-tree';

const localize = nls.loadMessageBundle();

interface ProcessItem extends vscode.QuickPickItem {
	pidOrPort: string;	// picker result
	sortKey: number;
	command: string;
	args: string;
}

/**
 * Process picker command (for launch config variable)
 * Returns as a string with these formats:
 * - "12345": process id
 * - "inspector12345": port number and inspector protocol
 * - "legacy12345": port number and legacy protocol
 * - null: abort launch silently
 */
export function pickProcess(): Promise<string | null> {    
	return listProcesses().then(items => {
		const matched = items;

		//	no matched founded, show tip message
		if (matched.length === 0) {
			vscode.window.showWarningMessage(`No Godot process found.`);
			return null;
		}

		// 	only one matched founded, and user decides to auto attach
		if (matched.length === 1) {
			return matched[0].pidOrPort;
		}

    // 	prompt picker panel as usual
		let options: vscode.QuickPickOptions = {
			placeHolder: localize('pickNodeProcess', "Pick the Godot process to attach to"),
			matchOnDescription: true,
			matchOnDetail: true
		};
		return vscode.window.showQuickPick(matched, options).then(item => item ? item.pidOrPort : null);
	}).catch(err => {
		return vscode.window.showErrorMessage(localize('process.picker.error', "Process picker failed ({0})", err.message), { modal: true }).then(_ => null);
	});
}

function listProcesses(): Promise<ProcessItem[]> {

	const items: ProcessItem[] = [];
    const EDITOR = new RegExp('--editor(?=\\S)+', 'g');

	let seq = 0;	// default sort key

	return getProcesses(async (pid: number, ppid: number, command: string, args: string, date?: number) => {
        if (process.platform === 'win32' && command.indexOf('\\??\\') === 0) {
            // remove leading device specifier
			command = command.replace('\\??\\', '');
		}
        
		const executable_name = basename(command, '.exe');
        const godotExecutablePath = await findGodotExecutablePath();

		let description = '';
		let pidOrPort = '';

        if ((command.includes(godotExecutablePath ?? 'Godot') || command.includes("Godot")) && EDITOR.test(args))
        {
            description = localize('process.id.port.signal', "process id: {0}", pid);
            pidOrPort = `${pid}`;
        }

		if (description && pidOrPort) {
			items.push({
				// render data
				label: executable_name,
				description: args,
				detail: description,

				// picker result
				pidOrPort: pidOrPort,
				// sort key
				sortKey: date ? date : seq++,
				// help to apply match
				command,
				args,
			});
		}

	}).then(() => items.sort((a, b) => b.sortKey - a.sortKey));		// sort items by process id, newest first
}