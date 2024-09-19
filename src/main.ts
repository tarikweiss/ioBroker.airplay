/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import { ConnectionHandler } from './ConnectionHandler';

// Load your modules here, e.g.:
// import * as fs from "fs";

class Airplay extends utils.Adapter {
    #connectionHandler: ConnectionHandler | null = null;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'airplay',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        // Initialize your adapter here

        // Reset the connection indicator during startup
        this.setState('info.connection', false, true);

        this.#connectionHandler = new ConnectionHandler(this);

        await this.createStreamState();
        await this.#connectionHandler.startDiscovery();

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('config option1: ' + this.config.option1);
        this.log.info('config option2: ' + this.config.option2);

        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates('lights.*');
        // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
        // this.subscribeStates('*');
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            this.#connectionHandler?.stopDiscovery();

            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  */
    // private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

            if (state.ack) {
                return;
            }

            if (id.match(/airplay\.\d+\.devices\.+/)) {
                this.updateDeviceStates(id, state);
            }

            if (id.match(/airplay\.\d+\.stream\.+/)) {
                const cleanedPath = id.replaceAll(/^airplay\.\d+\.stream\./g, '');

                switch (cleanedPath) {
                    case 'file': {
                        if (typeof state.val !== 'string') {
                            break;
                        }
                        this.#connectionHandler?.playFile(state.val);
                        break;
                    }
                }
            }
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    private updateDeviceStates(id: string, state: ioBroker.State): void {
        const cleanedPath = id.replaceAll(/^airplay\.\d+\.devices\./g, '');

        const pathParts = cleanedPath.split('.');

        const deviceId = pathParts.shift();
        const subId = pathParts.join('.');

        // const deviceId  = nameSplit[5];
        // const subId     = nameSplit[6];
        //
        if (this.#connectionHandler === null || deviceId === undefined) {
            return;
        }

        switch (subId) {
            case 'on-air': {
                if (typeof state.val !== 'boolean') {
                    return;
                }
                this.#connectionHandler.setDeviceOnAir(deviceId, state.val);
                break;
            }
            case 'volume': {
                if (typeof state.val !== 'number') {
                    return;
                }
                this.#connectionHandler.setVolume(deviceId, state.val);
                break;
            }
        }
    }

    private async createStreamState(): Promise<void> {
        await this.extendObjectAsync('stream.file', {
            type: 'state',
            common: {
                name: {
                    de: 'Datei',
                    en: 'File',
                },
                type: 'string',
            },
        });
        await this.extendObjectAsync('stream.filePid', {
            type: 'state',
            common: {
                name: {
                    de: 'PID von FFMPEG Prozess',
                    en: 'PID of FFMPEG process',
                },
                type: 'number',
            },
        });

        this.subscribeStates('stream.*');
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  */
    // private onMessage(obj: ioBroker.Message): void {
    //     if (typeof obj === 'object' && obj.message) {
    //         if (obj.command === 'send') {
    //             // e.g. send email or pushover or whatever
    //             this.log.info('send command');

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    //         }
    //     }
    // }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Airplay(options);
} else {
    // otherwise start the instance directly
    (() => new Airplay())();
}
