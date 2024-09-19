import * as Bonjour from 'mdns';
import { AdapterInstance } from '@iobroker/adapter-core';

import airtunes2 from 'airtunes2';
import { spawn } from 'child_process';
import internal from 'node:stream';
import AirPlayDevice = AirTunes.AirPlayDevice;

export class ConnectionHandler {
    #adapter: AdapterInstance;
    #airPlay: airtunes2;
    #browser: Bonjour.Browser;
    #ffmpeg: internal.Readable | null = null;

    constructor(adapter: AdapterInstance) {
        this.#adapter = adapter;
        this.#airPlay = new airtunes2();
        this.#browser = Bonjour.createBrowser(Bonjour.tcp('airplay'));
    }

    async startDiscovery(): Promise<void> {
        this.#browser.on('serviceUp', async (service: Bonjour.Service) => {
            try {
                await this.createDevice(service);
                this.setDeviceInformation(service);
                this.setDeviceAvailable(service, true);
            } catch (exception) {
                this.#adapter.log.error('Cannot create device! ' + service + ' ' + exception);
            }
        });

        this.#browser.on('serviceDown', async (service) => {
            try {
                await this.createDevice(service);
                this.setDeviceInformation(service);
                this.setDeviceAvailable(service, false);
                this.setDeviceOnAir(service.txtRecord.deviceid, false);
            } catch (exception) {
                this.#adapter.log.error('Cannot create device! ' + JSON.stringify(service) + ' ' + exception);
            }
        });

        this.#browser.start();
        this.#adapter.setState('info.connection', true, true);
    }

    async stopDiscovery(): Promise<void> {
        await this.#browser.stop();
        this.#airPlay.stopAll(() => {});

        this.#adapter.setState('devices.*.on-air', false, true);
    }

    async playFile(path: string): Promise<void> {
        const currentPid = (await this.#adapter.getStateAsync('stream.filePid'))?.val;

        // this.#airPlay.end();
        // this.#airPlay.stopAll(() => {});
        this.#airPlay.reset();

        if (currentPid !== null) {
            try {
                // @ts-ignore
                process.kill(currentPid);

                if (this.#ffmpeg !== null) {
                    // @ts-ignore
                    this.#ffmpeg.unpipe(this.#airPlay);
                }
            } catch (exception) {
                this.#adapter.log.warn(`FFMPEG process with PID ${currentPid} could not be killed. Is it still there?`);
            }

            await this.#adapter.setState('stream.filePid', null);
        }

        try {
            const ffmpeg = spawn(`ffmpeg`, [
                '-i',
                path,
                '-acodec',
                'pcm_s16le',
                '-f',
                's16le',
                '-ar',
                '44100',
                '-ac',
                '2',
                'pipe:1',
            ]);

            await this.#adapter.setState('stream.filePid', ffmpeg.pid ?? null, true);

            this.#ffmpeg = ffmpeg.stdout;

            // @ts-ignore
            ffmpeg.stdout.pipe(this.#airPlay);
        } catch (exception) {
            this.#adapter.log.error('You need to install ffmpeg to be able to play mp3 files.');
        }
    }

    async createDevice(service: Bonjour.Service): Promise<void> {
        const devicePrefix = this.getDevicePrefix(service);

        await this.#adapter.extendObject(`${devicePrefix}.name`, {
            type: 'state',
            common: {
                name: {
                    de: 'Name',
                    en: 'Name',
                },
                type: 'string',
            },
        });

        await this.#adapter.extendObject(`${devicePrefix}.host`, {
            type: 'state',
            common: {
                name: {
                    de: 'Host-Adresse',
                    en: 'Hostname',
                },
                type: 'string',
            },
        });

        await this.#adapter.extendObject(`${devicePrefix}.ip`, {
            type: 'state',
            common: {
                name: {
                    de: 'IP-Adresse',
                    en: 'IP-Adress',
                },
                type: 'string',
            },
        });

        await this.#adapter.extendObject(`${devicePrefix}.port`, {
            type: 'state',
            common: {
                name: {
                    de: 'IP-Adresse',
                    en: 'IP-Address',
                },
                type: 'number',
            },
        });

        await this.#adapter.extendObject(`${devicePrefix}.volume`, {
            type: 'state',
            common: {
                name: {
                    de: 'Lautstärke',
                    en: 'Volume',
                },
                min: 0,
                max: 100,
                def: 0,
                type: 'number',
            },
        });

        await this.#adapter.extendObject(`${devicePrefix}.available`, {
            type: 'state',
            common: {
                name: {
                    de: 'Verfügbar',
                    en: 'Available',
                },
                type: 'boolean',
                role: 'indicator.connected',
                write: false,
            },
        });

        await this.#adapter.extendObject(`${devicePrefix}.on-air`, {
            type: 'state',
            common: {
                name: {
                    de: 'Auf Sendung',
                    en: 'On-Air',
                },
                type: 'boolean',
                def: false,
                defAck: true,
            },
        });

        await this.#adapter.extendObject(`${devicePrefix}.txtRecord`, {
            type: 'state',
            common: {
                name: {
                    de: 'Txt-Eintrag',
                    en: 'Txt-Record',
                },
                type: 'string',
            },
        });

        await this.#adapter.subscribeStatesAsync('devices.*.on-air');
        await this.#adapter.subscribeStatesAsync('devices.*.volume');
    }

    async setDeviceOnAir(deviceId: string, state: boolean): Promise<void> {
        const devicePrefix = this.getDevicePrefixById(deviceId);

        const ip = (await this.#adapter.getStateAsync(devicePrefix + '.ip'))?.val;
        const port = (await this.#adapter.getStateAsync(devicePrefix + '.port'))?.val;
        const volume = (await this.#adapter.getStateAsync(devicePrefix + '.volume'))?.val;
        const txtRecord = (await this.#adapter.getStateAsync(devicePrefix + '.txtRecord'))?.val;

        if (typeof ip !== 'string') {
            return;
        }

        if (typeof port !== 'number') {
            return;
        }

        if (typeof volume !== 'number') {
            return;
        }

        if (typeof txtRecord !== 'string') {
            return;
        }

        if (state) {
            // @ts-ignore
            const deviceOptions: AirPlayDevice = {
                port: port,
                volume: volume,
                airplay2: true,
                txt: JSON.parse(txtRecord),
            };

            const device = this.#airPlay.add(ip, deviceOptions);
            device.on('status', (status) => {
                console.log(`Devices status (${ip}): ${status}`);
                switch (status) {
                    case 'stopped': {
                        this.#adapter.setState(devicePrefix + '.on-air', false, true);
                        break;
                    }
                }
            });

            await this.#adapter.setState(devicePrefix + '.on-air', true, true);

            return;
        }

        const deviceKey = `${ip}:${port}`;
        this.#airPlay.stop(deviceKey, () => {});
    }

    async setVolume(deviceId: string, volume: number): Promise<void> {
        const devicePrefix = this.getDevicePrefixById(deviceId);

        const ip = (await this.#adapter.getStateAsync(devicePrefix + '.ip'))?.val;
        const port = (await this.#adapter.getStateAsync(devicePrefix + '.port'))?.val;

        const deviceKey = `${ip}:${port}`;

        this.#adapter.setState(devicePrefix + '.volume', volume, true);

        this.#airPlay.setVolume(deviceKey, volume.toString(), () => {});
    }

    private setDeviceInformation(service: Bonjour.Service): void {
        const txtRecordArray = [];

        for (const [key, value] of Object.entries(service.txtRecord)) {
            txtRecordArray.push(`${key}=${value}`);
        }

        this.#adapter.setState(this.getDevicePrefix(service) + '.name', service.name ?? 'Unknown', true);
        this.#adapter.setState(this.getDevicePrefix(service) + '.host', service.host, true);
        this.#adapter.setState(this.getDevicePrefix(service) + '.port', service.port, true);
        this.#adapter.setState(this.getDevicePrefix(service) + '.txtRecord', JSON.stringify(txtRecordArray), true);

        this.#adapter.setState(this.getDevicePrefix(service) + '.ip', null, true);

        service.addresses.forEach((address) => {
            // Checking for a IPv4 address
            if (address.match(/[0-1]?[0-9]{1,2}\.[0-1]?[0-9]{1,2}\.[0-1]?[0-9]{1,2}\.[0-1]?[0-9]{1,2}/)) {
                this.#adapter.setState(this.getDevicePrefix(service) + '.ip', address, true);
            }
        });
    }

    private setDeviceAvailable(service: Bonjour.Service, available: boolean): void {
        this.#adapter.setState(this.getDevicePrefix(service) + '.available', available, true);
    }

    private getDevicePrefixById(deviceId: string) {
        return `devices.${deviceId}`;
    }

    private getDevicePrefix(service: Bonjour.Service): string {
        /*
         * AirPlay txt-record structure, may differ for other services!:
         *
         * {
         *   acl: '0',
         *   btaddr: '45:80:E2:A4:AE:8F',
         *   deviceid: 'A8:51:AB:2C:E1:C0',
         *   fex: '1d9/St5/F7w4oQY',
         *   features: '0x4A7FDFD5,0xBC177FDE',
         *   flags: '0x18644',
         *   gid: 'F4562D04-41AA-54B4-BBD7-2CE8FF12AC2C',
         *   igl: '1',
         *   gcgl: '1',
         *   gpn: 'Arbeitszimmer TV',
         *   psgsz: '3',
         *   psgtp: '1',
         *   psgid: 'F4562D04-41AA-54B4-BBD7-2CE8FF12AC2C',
         *   pgm: '1',
         *   pgmid: '0',
         *   model: 'AppleTV14,1',
         *   protovers: '1.1',
         *   pi: '3164ab1a-05a0-4537-9402-5824d021d664',
         *   psi: '08F74563-D92B-4ED1-8249-14F2A77E4A5A',
         *   pk: '6c4a26b39ecdd544c2508190b3dc7a0d7bfbb1fec9efa13e10627db5cb4c5833',
         *   srcvers: '775.3.1',
         *   osvers: '17.6.1',
         *   vv: '1'
         * }
         */

        if (!service.txtRecord?.hasOwnProperty('deviceid')) {
            throw new Error('Cannot create device, because it has no device id!');
        }

        return `devices.${service.txtRecord?.deviceid}`;
    }
}
