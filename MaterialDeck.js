import { registerSettings } from "./src/settings.js";
import { StreamDeck } from "./src/streamDeck.js";
import { TokenControl } from "./src/actions/token.js";
import { MacroControl } from "./src/actions/macro.js";
import { CombatTracker } from "./src/actions/combattracker.js";
import { PlaylistControl } from "./src/actions/playlist.js";
import { SoundboardControl } from "./src/actions/soundboard.js";
import { OtherControls } from "./src/actions/othercontrols.js";
import { ExternalModules } from "./src/actions/external.js";
import { SceneControl } from "./src/actions/scene.js";
import { downloadUtility, compareVersions, compatibleCore } from "./src/misc.js";
import { TokenHelper } from "./src/systems/tokenHelper.js";

export const minimumSDversion = "1.4.11";
export const minimumMSversion = "1.0.2";

export var streamDeck;
export var tokenControl;
export var macroControl;
export var combatTracker;
export var playlistControl;
export var soundboard;
export var otherControls;
export var externalModules;
export var sceneControl;
export var tokenHelper;
export const moduleName = "MaterialDeck";
export let gamingSystem = "dnd5e";
export let hotbarUses = false;
export let calculateHotbarUses;
export let sdVersion;
export let msVersion;

let ready = false;
let controlTokenTimer;
let updateDialog;
       
//CONFIG.debug.hooks = true;
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Global variables
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export var enableModule;

//Websocket variables
var ws;                         //Websocket variable
let wsOpen = false;             //Bool for checking if websocket has ever been opened => changes the warning message if there's no connection
let wsInterval;                 //Interval timer to detect disconnections
let WSconnected = false;

//let furnace = game.modules.get("furnace");

/*
 * Analyzes the message received 
 * 
 * @param {*} msg Message received
 */
async function analyzeWSmessage(msg){
    if (enableModule == false) return;
    const data = JSON.parse(msg);
    //console.log("Received",data);

    if (data.type == "connected" && data.data == "SD"){
        const msg = {
            target: "SD",
            type: "init",
            system: getGamingSystem(),
            coreVersion: game.version.split('.')[0]
        }
        ws.send(JSON.stringify(msg));
        if (data.MSversion) msVersion = data.MSversion;
        if (data.SDversion) sdVersion = data.SDversion;

        console.log("streamdeck connected to server", msVersion);
        streamDeck.resetImageBuffer();
    }

    if (data.type == "version" && data.source == "SD") {
        sdVersion = data.version;

        const sdCompatible = compareVersions(minimumSDversion,sdVersion);
        const msCompatible = compareVersions(minimumMSversion,msVersion);

        if ((!sdCompatible || !msCompatible) && updateDialog == undefined) {
            let content = "";
            
            if (!sdCompatible && !msCompatible) 
                content = game.i18n.localize("MaterialDeck.SdMsUpdateRequired")
            else if (!sdCompatible)
                content = game.i18n.localize("MaterialDeck.SdUpdateRequired")
            else    
                content = game.i18n.localize("MaterialDeck.MsUpdateRequired")
            const sd = sdCompatible ? 'display:none' : ''
            const ms = msCompatible ? 'display:none' : ''
            content += `
                <table>
                    <tr>
                        <th style='width:40%'>
                        <th style='width:30%'>${game.i18n.localize("MaterialDeck.DownloadUtility.Current")}</th>
                        <th style='width:30%'>${game.i18n.localize("MaterialDeck.DownloadUtility.Minimum")}</th>
                    </tr>
                    <tr style="${sd}">
                        <td>Stream Deck Plugin</td>
                        <td><center>${sdVersion}</center></td>
                        <td><center>${minimumSDversion}</center></td>
                    </tr>
                    <tr style="${ms}">
                        <td>Material Server</th>
                        <td><center>${msVersion}</center></td>
                        <td><center>${minimumMSversion}</center></td>
                    <tr>
                </table>
                `
            //else if (!sdCompatible) contents += `The Stream Deck plugin version you're using is v${data.version}, which is incompatible with this version of the module.<br>Update to v${minimumSDversion} or newer.`;
            
            updateDialog = new Dialog({
                title: "Material Deck: Update Needed",
                content,
                buttons: {
                 download: {
                  icon: '<i class="fas fa-download"></i>',
                  label: "Download Utility",
                  callback: () => new downloadUtility()
                 },
                 ignore: {
                  icon: '<i class="fas fa-times"></i>',
                  label: "Ignore"
                 }
                },
                default: "download"
            });
            updateDialog.render(true);
        }
    }

    if (data.type == 'newDevice') {
        streamDeck.newDevice(data.iteration,data.device);
        return;
    }

    if (data == undefined || data.payload == undefined) return;
    const action = data.action;
    const event = data.event;
    const context = data.context;
    const coordinates = data.payload.coordinates;
    const settings = data.payload.settings;
    const device = data.device;
    const name = data.deviceName;
    const type = data.deviceType;

    if (data.data == 'init'){

    }
    if (event == 'willAppear' || event == 'didReceiveSettings'){
        if (coordinates == undefined) return;
        streamDeck.setScreen(action);
        await streamDeck.setContext(device,data.size,data.deviceIteration,action,context,coordinates,settings,name,type);

        if (game.settings.get(moduleName, 'devices')?.[device]?.enable == false) return;

        if (action == 'token'){
            tokenControl.active = true;
            tokenControl.pushData(canvas.tokens.controlled[0]?.id,settings,context,device);
        }  
        else if (action == 'macro')
            macroControl.update(settings,context,device);
        else if (action == 'combattracker')
            combatTracker.update(settings,context,device);
        else if (action == 'playlist')
            playlistControl.update(settings,context,device);
        else if (action == 'soundboard')
            soundboard.update(settings,context,device); 
        else if (action == 'other')
            otherControls.update(settings,context,device);
        else if (action == 'external')
            externalModules.update(settings,context,device);
        else if (action == 'scene')
            sceneControl.update(settings,context,device);
    }
    
    else if (event == 'willDisappear'){
        if (coordinates == undefined) return;
        streamDeck.clearContext(device,action,coordinates,context);
    }

    else if (event == 'keyDown'){
        if (game.settings.get(moduleName, 'devices')?.[device]?.enable == false) return;

        if (action == 'token')
            tokenControl.keyPress(settings);
        else if (action == 'macro')
            macroControl.keyPress(settings);
        else if (action == 'combattracker')
            combatTracker.keyPress(settings,context,device);
        else if (action == 'playlist')
            playlistControl.keyPress(settings,context,device);
        else if (action == 'soundboard')
            soundboard.keyPressDown(settings);
        else if (action == 'other')
            otherControls.keyPress(settings,context,device);
        else if (action == 'external')
            externalModules.keyPress(settings,context,device);
        else if (action == 'scene')
            sceneControl.keyPress(settings);
    }

    else if (event == 'keyUp'){
        if (game.settings.get(moduleName, 'devices')?.[device]?.enable == false) return;

        if (action == 'soundboard'){
            soundboard.keyPressUp(settings);
        }
    }
};

/**
 * Start a new websocket
 * Start a 10s interval, if no connection is made, run resetWS()
 * If connection is made, set interval to 1.5s to check for disconnects
 * If message is received, reset the interval, and send the message to analyzeWSmessage()
 */
function startWebsocket() {
    const address = game.settings.get(moduleName,'address');
    
    const url = address.startsWith('wss://') ? address : ('ws://'+address+'/');

    ws = new WebSocket(url);

    ws.onmessage = function(msg){
        //console.log(msg);
        analyzeWSmessage(msg.data);
        clearInterval(wsInterval);
        wsInterval = setInterval(resetWS, 5000);
    }

    ws.onopen = function() {
        messageCount = 0;
        WSconnected = true;
        ui.notifications.info("Material Deck "+game.i18n.localize("MaterialDeck.Notifications.Connected") +": "+address);
        wsOpen = true;
        const msg = {
            target: "server",
            module: "MD"
        }
        ws.send(JSON.stringify(msg));
        const msg2 = {
            target: "SD",
            type: "init",
            system: getGamingSystem(),
            coreVersion: game.version.split('.')[0]
        }
        ws.send(JSON.stringify(msg2));
        clearInterval(wsInterval);
        wsInterval = setInterval(resetWS, 5000);
    }
  
    clearInterval(wsInterval);
    wsInterval = setInterval(resetWS, 10000);
}
let messageCount = 0;
/**
 * Try to reset the websocket if a connection is lost
 */
function resetWS(){
    const maxMessages = game.settings.get(moduleName, 'nrOfConnMessages');
    if (wsOpen) {
        ui.notifications.warn("Material Deck: "+game.i18n.localize("MaterialDeck.Notifications.Disconnected"));
        wsOpen = false;
        messageCount = 0;
        WSconnected = false;
        startWebsocket();
    }
    else if (ws.readyState == 3){
        if (maxMessages == 0 || maxMessages > messageCount) {
            messageCount++;
            const countString = maxMessages == 0 ? "" : " (" + messageCount + "/" + maxMessages + ")";
            ui.notifications.warn("Material Deck: "+game.i18n.localize("MaterialDeck.Notifications.ConnectFail") + countString);
        }
        WSconnected = false;
        startWebsocket();
    }
}

export function sendWS(txt){
    if (WSconnected)
        ws.send(txt);
}

export function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

export function getPermission(action,func) {
    const role = game.user.role-1;
    const settings = game.settings.get(moduleName,'userPermission');
    if (action == 'ENABLE') return settings.enable[role];
    else return settings.permissions?.[action]?.[func]?.[role];
}

function getGamingSystem() {
    const systemOverride = game.settings.get(moduleName,'systemOverride');
    gamingSystem = (systemOverride == undefined || systemOverride == null || systemOverride == '') ? game.system.id : systemOverride;
    return gamingSystem;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Hooks
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Ready hook
 * Attempt to open the websocket
 */
Hooks.once('ready', async()=>{
    await registerSettings();
    enableModule = (game.settings.get(moduleName,'Enable')) ? true : false; 

    getGamingSystem();

    soundboard = new SoundboardControl();
    streamDeck = new StreamDeck();
    tokenControl = new TokenControl();
    macroControl = new MacroControl();
    combatTracker = new CombatTracker();
    playlistControl = new PlaylistControl();
    otherControls = new OtherControls();
    externalModules = new ExternalModules();
    sceneControl = new SceneControl();
    tokenHelper = new TokenHelper();

    game.socket.on(`module.MaterialDeck`, async(payload) =>{
        //console.log(payload);
        if (payload.msgType == "playSound") soundboard.playSound(payload.trackNr,payload.src,payload.play,payload.repeat,payload.volume);  
        else if (game.user.isGM && payload.msgType == "playPlaylist") {
            const playlist = playlistControl.getPlaylist(payload.playlistNr);
            playlistControl.playPlaylist(playlist,payload.playlistNr);
        }
        else if (game.user.isGM && payload.msgType == "playTrack") {
            const playlist = playlistControl.getPlaylist(payload.playlistNr);
            const sounds = playlist.data.sounds;
            for (let track of sounds)
                if (track._id == payload.trackId)
                    playlistControl.playTrack(track,playlist,payload.playlistNr)
        }
        else if (game.user.isGM && payload.msgType == "stopAllPlaylists")
            playlistControl.stopAll(payload.force);
        else if (game.user.isGM && payload.msgType == "soundboardUpdate") {
            await game.settings.set(moduleName,'soundboardSettings',payload.settings);
            const payloadNew = {
                "msgType": "soundboardRefresh"
            };
            game.socket.emit(`module.MaterialDeck`, payloadNew);
        }
        else if (game.user.isGM == false && payload.msgType == "soundboardRefresh" && enableModule)
            soundboard.updateAll();
        else if (game.user.isGM && payload.msgType == "macroboardUpdate") {
            await game.settings.set(moduleName,'macroSettings',payload.settings);
            const payloadNew = {
                "msgType": "macroboardRefresh"
            };
            game.socket.emit(`module.MaterialDeck`, payloadNew);
        }
        else if (game.user.isGM == false && payload.msgType == "macroboardRefresh" && enableModule)
            macroControl.updateAll();
        else if (game.user.isGM && payload.msgType == "playlistUpdate") {
            await game.settings.set(moduleName,'playlists',payload.settings);
            const payloadNew = {
                "msgType": "playlistRefresh"
            };
            game.socket.emit(`module.MaterialDeck`, payloadNew);
        }
        else if (game.user.isGM == false && payload.msgType == "playlistRefresh" && enableModule)
            playlistControl.updateAll();
            
    });

    if (game.user.isGM) {
        let soundBoardSettings = game.settings.get(moduleName,'soundboardSettings');
        let macroSettings = game.settings.get(moduleName, 'macroSettings');
        let array = [];
        for (let i=0; i<64; i++) array[i] = "";
        let arrayVolume = [];
        for (let i=0; i<64; i++) arrayVolume[i] = "50";
        let arrayZero = [];
        for (let i=0; i<64; i++) arrayZero[i] = "0";
    
        if (macroSettings.color == undefined){
            game.settings.set(moduleName,'macroSettings',{
                macros: array,
                color: arrayZero
            });
        }
    
        const settings = {
            playlist: "",
            sounds: array,
            colorOn: arrayZero,
            colorOff: arrayZero,
            mode: arrayZero,
            toggle: arrayZero,
            volume: arrayVolume
        };
        if (soundBoardSettings.colorOff == undefined){
            game.settings.set(moduleName,'soundboardSettings',settings);
        }
    }

    if (enableModule == false) return;
    if (getPermission('ENABLE') == false) {
        ready = true;
        return;
    }

    startWebsocket();

    const hotbarUsesTemp = game.modules.get("illandril-hotbar-uses");
    if (hotbarUsesTemp != undefined) hotbarUses = true;
});

function updateActor(id) {
    const token = tokenHelper.getTokenFromActorId(id)
    tokenControl.update(token.id);
}

Hooks.on('updateToken',(scene,token)=>{
    if (enableModule == false || ready == false) return;
    let tokenId = token._id;
    if (tokenId == canvas.tokens.controlled[0]?.id) tokenControl.update(canvas.tokens.controlled[0]?.id);
    if (macroControl != undefined) macroControl.updateAll();
});

Hooks.on('updateActor',(actor)=>{
    if (enableModule == false || ready == false) return;
    updateActor(actor.id);
    if (macroControl != undefined) macroControl.updateAll();
});

Hooks.on('createActiveEffect',(data)=>{
    if (enableModule == false || ready == false) return;
    updateActor(data.parent.id);
    return;
});

Hooks.on('deleteActiveEffect',(data)=>{
    if (enableModule == false || ready == false) return;
    updateActor(data.parent.id);
    return;
});

Hooks.on('onActorSetCondition',(data)=>{
    if (enableModule == false || ready == false) return;
    updateActor(data.actor.id);
    return;
});

Hooks.on('controlToken',(token,controlled)=>{
    if (enableModule == false || ready == false) return;
    if (controlled) {
        tokenControl.update(compatibleCore('10.0') ? token.id : token.data._id);
        if (controlTokenTimer != undefined) {
            clearTimeout(controlTokenTimer);
            controlTokenTimer = undefined;
        }
    }
    else {
        controlTokenTimer = setTimeout(function(){tokenControl.update(canvas.tokens.controlled[0]?.id);},10)
    }
    
    if (macroControl != undefined) macroControl.updateAll();
});

Hooks.on('updateOwnedItem',()=>{
    if (macroControl != undefined) macroControl.updateAll();
})

Hooks.on('renderHotbar', (hotbar)=>{
    if (enableModule == false || ready == false) return;
    if (macroControl != undefined) macroControl.hotbar(hotbar.macros);
});

Hooks.on('render', (app)=>{
    if (enableModule == false || ready == false) return;
    if (app.id == "hotbar" && macroControl != undefined)  macroControl.hotbar(app.macros);
});

Hooks.on('renderCombatTracker',()=>{
    if (enableModule == false || ready == false) return;
    if (combatTracker != undefined) combatTracker.updateAll();
    if (tokenControl != undefined) tokenControl.update(canvas.tokens.controlled[0]?.id);
});

Hooks.on('renderActorSheet',()=>{
    if (enableModule == false || ready == false) return;
    if (tokenControl != undefined) tokenControl.update();
});

Hooks.on('renderPlaylistDirectory', (playlistDirectory)=>{
    if (enableModule == false || ready == false) return;
    if (playlistControl != undefined) playlistControl.updateAll();
});

Hooks.on('closeplaylistConfigForm', (form)=>{
    if (enableModule == false || ready == false) return;
    if (form.template == "./modules/MaterialDeck/templates/playlistConfig.html")
        playlistControl.updateAll();
});

Hooks.on('lightingRefresh',()=>{
    if (enableModule == false || ready == false) return;
    if (tokenControl != undefined) tokenControl.update();
});

Hooks.on('pauseGame',()=>{
    if (enableModule == false || ready == false) return;
    otherControls.updateAll();
});

Hooks.on('renderSidebarTab',(app)=>{
    const options = {
        sidebarTab: app.tabName,
        renderPopout: app.popOut
    }
    if (enableModule == false || ready == false) return;
    if (otherControls != undefined) otherControls.updateAll(options);
    if (sceneControl != undefined) sceneControl.updateAll();
    if (document.getElementsByClassName("roll-type-select")[0] != undefined)
        document.getElementsByClassName("roll-type-select")[0].addEventListener('change',function(){
            if (otherControls != undefined) otherControls.updateAll(options);
        })
});

Hooks.on('closeSidebarTab',(app)=>{
    const options = {
        sidebarTab: app.tabName,
        renderPopout: false
    }
    if (otherControls != undefined) otherControls.updateAll(options);
});

Hooks.on('changeSidebarTab',()=>{
    if (enableModule == false || ready == false) return;
    if (otherControls != undefined) otherControls.updateAll();
});

Hooks.on('updateScene',()=>{
    if (enableModule == false || ready == false) return;
    sceneControl.updateAll();
    externalModules.updateAll();
    otherControls.updateAll();
});

Hooks.on('renderSceneControls',()=>{
    if (enableModule == false || ready == false || otherControls == undefined) return;
    otherControls.updateAll();
    externalModules.updateAll();
});

Hooks.on('targetToken',(user,token,targeted)=>{
    if (enableModule == false || ready == false) return;
    if (token.id == canvas.tokens.controlled[0]?.id) tokenControl.update(canvas.tokens.controlled[0]?.id);
});

Hooks.on('sidebarCollapse',()=>{
    if (enableModule == false || ready == false) return;
    otherControls.updateAll();
});

Hooks.on('renderCompendium',()=>{
    if (enableModule == false || ready == false) return;
    otherControls.updateAll();
});

Hooks.on('closeCompendium',()=>{
    if (enableModule == false || ready == false) return;
    otherControls.updateAll();
});

Hooks.on('renderCompendiumBrowser',()=>{
    if (enableModule == false || ready == false) return;
    otherControls.updateAll({renderCompendiumBrowser:true});
});

Hooks.on('closeCompendiumBrowser',()=>{
    if (enableModule == false || ready == false) return;
    otherControls.updateAll({renderCompendiumBrowser:false});
});

Hooks.on('renderJournalSheet',(sheet)=>{
    if (enableModule == false || ready == false) return;
    otherControls.updateAll({
        hook:'renderJournalSheet',
        sheet:sheet
    });
});

Hooks.on('closeJournalSheet',(sheet)=>{
    if (enableModule == false || ready == false) return;
    otherControls.updateAll({
        hook:'closeJournalSheet',
        sheet:sheet
    });
});

Hooks.on('gmScreenOpenClose',(html,isOpen)=>{
    if (enableModule == false || ready == false) return;
    externalModules.updateAll({gmScreen:isOpen});
});

Hooks.on('ShareVision', ()=>{
    if (enableModule == false || ready == false) return;
    externalModules.updateAll();
})

Hooks.on('NotYourTurn', ()=>{
    if (enableModule == false || ready == false) return;
    externalModules.updateAll();
})

Hooks.on('pseudoclockSet', ()=>{
    if (enableModule == false || ready == false) return;
    externalModules.updateAll();
})

Hooks.on('about-time.clockRunningStatus', ()=>{
    if (enableModule == false || ready == false) return;
    externalModules.updateAll();
})

Hooks.on('updateTile',()=>{
    if (enableModule == false || ready == false) return;
    externalModules.updateAll();
});

Hooks.once('init', ()=>{
    //CONFIG.debug.hooks = true;
    //registerSettings(); //in ./src/settings.js
    
});

Hooks.once('canvasReady',()=>{
    ready = true;
});

Hooks.on("soundscape", (data) => {
    externalModules.newSoundscapeData(data);
});
