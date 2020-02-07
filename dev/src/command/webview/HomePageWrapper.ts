/*******************************************************************************
 * Copyright (c) 2020 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

import * as vscode from "vscode";

import { WebviewWrapper, WebviewResourceProvider } from "./WebviewWrapper";
import WebviewUtil from "./WebviewUtil";
import getHomePage from "./pages/HomePage";
import { ThemelessImages } from "../../constants/CWImages";
import Log from "../../Logger";
import { CWConfigurations } from "../../constants/Configurations";
import startCodewindCmd from "../StartCodewindCmd";
import newRemoteConnectionCmd from "../connection/NewConnectionCmd";
import createProjectCmd from "../connection/CreateUserProjectCmd";
import LocalCodewindManager from "../../codewind/connection/local/LocalCodewindManager";
import bindProjectCmd from "../connection/BindProjectCmd";
import { promptForConnection } from "../CommandUtil";
import Commands from "../../constants/Commands";
import { UsefulExtensionsPageWrapper } from "./UsefulExtensionsPageWrapper";

export enum HomePageWVMessages {
    SHOW_ON_START = "toggle-show-on-start",
    INSTALL_DOCKER = "install-docker",
    START_LOCAL = "start-local",
    NEW_REMOTE_CONNECTION = "new-remote-connection",
    OPEN_USEFUL_EXTENSIONS = "open-useful-extensions",
    OPEN_CODEWIND_VIEW = "open-codewind-view",

    PROJECT_LOCAL = "create-add-project-local",
    PROJECT_REMOTE = "create-add-project-remote",
}

export const CREATE_PROJECT_DATA = "create";
export const ADD_PROJECT_DATA = "add";

export class HomePageWrapper extends WebviewWrapper {

    private static _instance: HomePageWrapper | undefined;

    constructor(

    ) {
        super(`Codewind: Home`, ThemelessImages.Logo);
        HomePageWrapper._instance = this;
        this.refresh();

        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(CWConfigurations.SHOW_HOMEPAGE.fullSection)) {
                this.refresh();
            }
        });
    }

    public static get instance(): HomePageWrapper | undefined {
        return this._instance;
    }

    protected onDidDispose(): void {
        HomePageWrapper._instance = undefined;
    }

    protected async generateHtml(resourceProvider: WebviewResourceProvider): Promise<string> {
        const html = getHomePage(resourceProvider);
        return html;
    }

    protected handleWebviewMessage = async (msg: WebviewUtil.IWVMessage): Promise<void> =>  {
    switch (msg.type as HomePageWVMessages) {
            case HomePageWVMessages.OPEN_CODEWIND_VIEW: {
                vscode.commands.executeCommand(Commands.FOCUS_CW_VIEW);
                break;
            }
            case HomePageWVMessages.NEW_REMOTE_CONNECTION: {
                newRemoteConnectionCmd(true);
                break;
            }
            case HomePageWVMessages.OPEN_USEFUL_EXTENSIONS: {
                if (UsefulExtensionsPageWrapper.instance) {
                    UsefulExtensionsPageWrapper.instance.reveal();
                }
                else {
                    new UsefulExtensionsPageWrapper().reveal();
                }
                break;
            }
            case HomePageWVMessages.INSTALL_DOCKER:
                const installDockerUri = vscode.Uri.parse("https://docs.docker.com/install/");
                vscode.commands.executeCommand(Commands.VSC_OPEN, installDockerUri);
                break;
            case HomePageWVMessages.START_LOCAL: {
                if (LocalCodewindManager.instance.localConnection) {
                    vscode.window.showInformationMessage(`Local Codewind is already started.`);
                    return;
                }
                startCodewindCmd();
                break;
            }
            case HomePageWVMessages.SHOW_ON_START: {
                const show: boolean = msg.data;
                await CWConfigurations.SHOW_HOMEPAGE.set(show);
                break;
            }
            case HomePageWVMessages.PROJECT_LOCAL:
                const localConnection = LocalCodewindManager.instance.localConnection;
                if (!localConnection || !localConnection.isConnected) {
                    vscode.window.showWarningMessage(`Make sure Local Codewind is started and connected before creating or adding a project.`);
                    return;
                }
                if (msg.data === CREATE_PROJECT_DATA) {
                    createProjectCmd(localConnection);
                }
                else if (msg.data === ADD_PROJECT_DATA) {
                    bindProjectCmd(localConnection);
                }
                else {
                    Log.e(`Unrecognized data ${msg.data} from ${HomePageWVMessages.PROJECT_LOCAL}`);
                }
                break;
            case HomePageWVMessages.PROJECT_REMOTE:
                const remoteConnection = await promptForConnection(true, true);
                if (remoteConnection == null) {
                    // the command util will have shown a warning message already
                    return;
                }
                if (msg.data === CREATE_PROJECT_DATA) {
                    createProjectCmd(remoteConnection);
                }
                else if (msg.data === ADD_PROJECT_DATA) {
                    bindProjectCmd(remoteConnection);
                }
                else {
                    Log.e(`Unrecognized data ${msg.data} from ${HomePageWVMessages.PROJECT_REMOTE}`);
                }
                break;
            default: {
                Log.e(`Unrecognized message from home page`, msg);
            }
        }
    }
}
