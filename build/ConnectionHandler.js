"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var ConnectionHandler_exports = {};
__export(ConnectionHandler_exports, {
  ConnectionHandler: () => ConnectionHandler
});
module.exports = __toCommonJS(ConnectionHandler_exports);
var Bonjour = __toESM(require("mdns"));
var import_airtunes2 = __toESM(require("airtunes2"));
var import_child_process = require("child_process");
var _adapter, _airPlay, _browser, _ffmpeg;
class ConnectionHandler {
  constructor(adapter) {
    __privateAdd(this, _adapter, void 0);
    __privateAdd(this, _airPlay, void 0);
    __privateAdd(this, _browser, void 0);
    __privateAdd(this, _ffmpeg, null);
    __privateSet(this, _adapter, adapter);
    __privateSet(this, _airPlay, new import_airtunes2.default());
    __privateSet(this, _browser, Bonjour.createBrowser(Bonjour.tcp("airplay")));
  }
  async startDiscovery() {
    __privateGet(this, _browser).on("serviceUp", async (service) => {
      try {
        await this.createDevice(service);
        this.setDeviceInformation(service);
        this.setDeviceAvailable(service, true);
      } catch (exception) {
        __privateGet(this, _adapter).log.error("Cannot create device! " + service + " " + exception);
      }
    });
    __privateGet(this, _browser).on("serviceDown", async (service) => {
      try {
        await this.createDevice(service);
        this.setDeviceInformation(service);
        this.setDeviceAvailable(service, false);
        this.setDeviceOnAir(service.txtRecord.deviceid, false);
      } catch (exception) {
        __privateGet(this, _adapter).log.error("Cannot create device! " + JSON.stringify(service) + " " + exception);
      }
    });
    __privateGet(this, _browser).start();
    __privateGet(this, _adapter).setState("info.connection", true, true);
  }
  async stopDiscovery() {
    await __privateGet(this, _browser).stop();
    __privateGet(this, _airPlay).stopAll(() => {
    });
    __privateGet(this, _adapter).setState("devices.*.on-air", false, true);
  }
  async playFile(path) {
    var _a, _b;
    const currentPid = (_a = await __privateGet(this, _adapter).getStateAsync("stream.filePid")) == null ? void 0 : _a.val;
    __privateGet(this, _airPlay).reset();
    if (currentPid !== null) {
      try {
        process.kill(currentPid);
        if (__privateGet(this, _ffmpeg) !== null) {
          __privateGet(this, _ffmpeg).unpipe(__privateGet(this, _airPlay));
        }
      } catch (exception) {
        __privateGet(this, _adapter).log.warn(`FFMPEG process with PID ${currentPid} could not be killed. Is it still there?`);
      }
      await __privateGet(this, _adapter).setState("stream.filePid", null);
    }
    const ffmpeg = (0, import_child_process.spawn)(`ffmpeg`, [
      "-i",
      path,
      "-acodec",
      "pcm_s16le",
      "-f",
      "s16le",
      "-ar",
      "44100",
      "-ac",
      "2",
      "pipe:1"
    ]);
    await __privateGet(this, _adapter).setState("stream.filePid", (_b = ffmpeg.pid) != null ? _b : null, true);
    __privateSet(this, _ffmpeg, ffmpeg.stdout);
    ffmpeg.stdout.pipe(__privateGet(this, _airPlay));
  }
  async createDevice(service) {
    const devicePrefix = this.getDevicePrefix(service);
    await __privateGet(this, _adapter).extendObject(`${devicePrefix}.name`, {
      type: "state",
      common: {
        name: {
          de: "Name",
          en: "Name"
        },
        type: "string"
      }
    });
    await __privateGet(this, _adapter).extendObject(`${devicePrefix}.host`, {
      type: "state",
      common: {
        name: {
          de: "Host-Adresse",
          en: "Hostname"
        },
        type: "string"
      }
    });
    await __privateGet(this, _adapter).extendObject(`${devicePrefix}.ip`, {
      type: "state",
      common: {
        name: {
          de: "IP-Adresse",
          en: "IP-Adress"
        },
        type: "string"
      }
    });
    await __privateGet(this, _adapter).extendObject(`${devicePrefix}.port`, {
      type: "state",
      common: {
        name: {
          de: "IP-Adresse",
          en: "IP-Address"
        },
        type: "number"
      }
    });
    await __privateGet(this, _adapter).extendObject(`${devicePrefix}.volume`, {
      type: "state",
      common: {
        name: {
          de: "Lautst\xE4rke",
          en: "Volume"
        },
        min: 0,
        max: 100,
        def: 0,
        type: "number"
      }
    });
    await __privateGet(this, _adapter).extendObject(`${devicePrefix}.available`, {
      type: "state",
      common: {
        name: {
          de: "Verf\xFCgbar",
          en: "Available"
        },
        type: "boolean",
        role: "indicator.connected",
        write: false
      }
    });
    await __privateGet(this, _adapter).extendObject(`${devicePrefix}.on-air`, {
      type: "state",
      common: {
        name: {
          de: "Auf Sendung",
          en: "On-Air"
        },
        type: "boolean",
        def: false,
        defAck: true
      }
    });
    await __privateGet(this, _adapter).extendObject(`${devicePrefix}.txtRecord`, {
      type: "state",
      common: {
        name: {
          de: "Txt-Eintrag",
          en: "Txt-Record"
        },
        type: "string"
      }
    });
    await __privateGet(this, _adapter).subscribeStatesAsync("devices.*.on-air");
    await __privateGet(this, _adapter).subscribeStatesAsync("devices.*.volume");
  }
  async setDeviceOnAir(deviceId, state) {
    var _a, _b, _c, _d;
    const devicePrefix = this.getDevicePrefixById(deviceId);
    const ip = (_a = await __privateGet(this, _adapter).getStateAsync(devicePrefix + ".ip")) == null ? void 0 : _a.val;
    const port = (_b = await __privateGet(this, _adapter).getStateAsync(devicePrefix + ".port")) == null ? void 0 : _b.val;
    const volume = (_c = await __privateGet(this, _adapter).getStateAsync(devicePrefix + ".volume")) == null ? void 0 : _c.val;
    const txtRecord = (_d = await __privateGet(this, _adapter).getStateAsync(devicePrefix + ".txtRecord")) == null ? void 0 : _d.val;
    if (typeof ip !== "string") {
      return;
    }
    if (typeof port !== "number") {
      return;
    }
    if (typeof volume !== "number") {
      return;
    }
    if (typeof txtRecord !== "string") {
      return;
    }
    if (state) {
      const deviceOptions = {
        port,
        volume,
        airplay2: true,
        txt: JSON.parse(txtRecord)
      };
      const device = __privateGet(this, _airPlay).add(ip, deviceOptions);
      device.on("status", (status) => {
        console.log(`Devices status (${ip}): ${status}`);
        switch (status) {
          case "stopped": {
            __privateGet(this, _adapter).setState(devicePrefix + ".on-air", false, true);
            break;
          }
        }
      });
      await __privateGet(this, _adapter).setState(devicePrefix + ".on-air", true, true);
      return;
    }
    const deviceKey = `${ip}:${port}`;
    __privateGet(this, _airPlay).stop(deviceKey, () => {
    });
  }
  async setVolume(deviceId, volume) {
    var _a, _b;
    const devicePrefix = this.getDevicePrefixById(deviceId);
    const ip = (_a = await __privateGet(this, _adapter).getStateAsync(devicePrefix + ".ip")) == null ? void 0 : _a.val;
    const port = (_b = await __privateGet(this, _adapter).getStateAsync(devicePrefix + ".port")) == null ? void 0 : _b.val;
    const deviceKey = `${ip}:${port}`;
    __privateGet(this, _adapter).setState(devicePrefix + ".volume", volume, true);
    __privateGet(this, _airPlay).setVolume(deviceKey, volume.toString(), () => {
    });
  }
  setDeviceInformation(service) {
    var _a;
    const txtRecordArray = [];
    for (const [key, value] of Object.entries(service.txtRecord)) {
      txtRecordArray.push(`${key}=${value}`);
    }
    __privateGet(this, _adapter).setState(this.getDevicePrefix(service) + ".name", (_a = service.name) != null ? _a : "Unknown", true);
    __privateGet(this, _adapter).setState(this.getDevicePrefix(service) + ".host", service.host, true);
    __privateGet(this, _adapter).setState(this.getDevicePrefix(service) + ".port", service.port, true);
    __privateGet(this, _adapter).setState(this.getDevicePrefix(service) + ".txtRecord", JSON.stringify(txtRecordArray), true);
    __privateGet(this, _adapter).setState(this.getDevicePrefix(service) + ".ip", null, true);
    service.addresses.forEach((address) => {
      if (address.match(/[0-1]?[0-9]{1,2}\.[0-1]?[0-9]{1,2}\.[0-1]?[0-9]{1,2}\.[0-1]?[0-9]{1,2}/)) {
        __privateGet(this, _adapter).setState(this.getDevicePrefix(service) + ".ip", address, true);
      }
    });
  }
  setDeviceAvailable(service, available) {
    __privateGet(this, _adapter).setState(this.getDevicePrefix(service) + ".available", available, true);
  }
  getDevicePrefixById(deviceId) {
    return `devices.${deviceId}`;
  }
  getDevicePrefix(service) {
    var _a, _b;
    if (!((_a = service.txtRecord) == null ? void 0 : _a.hasOwnProperty("deviceid"))) {
      throw new Error("Cannot create device, because it has no device id!");
    }
    return `devices.${(_b = service.txtRecord) == null ? void 0 : _b.deviceid}`;
  }
}
_adapter = new WeakMap();
_airPlay = new WeakMap();
_browser = new WeakMap();
_ffmpeg = new WeakMap();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConnectionHandler
});
//# sourceMappingURL=ConnectionHandler.js.map
