// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

const testWorkspaceName = 'vscode-file-write-test-workspace';

let allTxtFiles: vscode.Uri[] = [];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	if (vscode.workspace.name === testWorkspaceName) {
			
		vscode.window.showWarningMessage('WARNING: This is a test workspace. All .TXT files in it will be overwritten upon exit!');

		allTxtFiles = await vscode.workspace.findFiles('**/*.txt');
	}
}

// This method is called when your extension is deactivated
export async function deactivate() {

	const promises = allTxtFiles.map(async fileUri => { 

		try {

			const { text, byteOrderMark } = await readFile(fileUri);
			await writeFile(fileUri, text, byteOrderMark);

		} catch (err) {

			console.log(err);
		}
	});

	await Promise.all(promises);
}

async function readFile(fileUri: vscode.Uri): Promise<{ text: string, byteOrderMark?: Uint8Array }> {

	// Trying with vscode and falling back to fs (because vscode will fail during unload)
	var fileBytes: Uint8Array;
	try {
		fileBytes = await vscode.workspace.fs.readFile(fileUri);
	} catch (err) {
		fileBytes = await fs.promises.readFile(fileUri.fsPath);
	}

	let textArray = Buffer.from(fileBytes);
	let byteOrderMark = undefined;

	// Handling BOMs, if any
	if ((fileBytes[0] === 0xEF) && (fileBytes[1] === 0xBB)) {

		textArray = textArray.slice(3);
		byteOrderMark = new Uint8Array([0xEF, 0xBB, 0xBF]);

	} else if ((fileBytes[0] === 0xFE) && (fileBytes[1] === 0xFF)) {

		textArray = textArray.slice(2);
		byteOrderMark = new Uint8Array([0xFE, 0xFF]);

	} else if ((fileBytes[0] === 0xFF) && (fileBytes[1] === 0xFE)) { 

		textArray = textArray.slice(2);
		byteOrderMark = new Uint8Array([0xFF, 0xFE]);
	}

	const text = textArray.toString();

	return { text, byteOrderMark };
}

async function writeFile(fileUri: vscode.Uri, text: string, byteOrderMark?: Uint8Array): Promise<void> {

	// Trying with vscode and falling back to fs (because vscode will fail during unload)
	let outputFileBytes = Buffer.from(text);

	if (!!byteOrderMark) {
		
		outputFileBytes = Buffer.concat([byteOrderMark, outputFileBytes]);
	}

	try {
		await vscode.workspace.fs.writeFile(fileUri, outputFileBytes);
	} catch (err) {
		await fs.promises.writeFile(fileUri.fsPath, outputFileBytes);
	}
}
