"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_ConnectionHandler = require("./ConnectionHandler");
var _connectionHandler;
class Airplay extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "airplay"
    });
    __privateAdd(this, _connectionHandler, null);
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    this.setState("info.connection", false, true);
    __privateSet(this, _connectionHandler, new import_ConnectionHandler.ConnectionHandler(this));
    await this.createStreamState();
    await __privateGet(this, _connectionHandler).startDiscovery();
    this.log.info("config option1: " + this.config.option1);
    this.log.info("config option2: " + this.config.option2);
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   */
  onUnload(callback) {
    var _a;
    try {
      (_a = __privateGet(this, _connectionHandler)) == null ? void 0 : _a.stopDiscovery();
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
  onStateChange(id, state) {
    var _a;
    if (state) {
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
      if (state.ack) {
        return;
      }
      if (id.match(/airplay\.\d+\.devices\.+/)) {
        this.updateDeviceStates(id, state);
      }
      if (id.match(/airplay\.\d+\.stream\.+/)) {
        const cleanedPath = id.replaceAll(/^airplay\.\d+\.stream\./g, "");
        switch (cleanedPath) {
          case "file": {
            if (typeof state.val !== "string") {
              break;
            }
            (_a = __privateGet(this, _connectionHandler)) == null ? void 0 : _a.playFile(state.val);
            break;
          }
        }
      }
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
  updateDeviceStates(id, state) {
    const cleanedPath = id.replaceAll(/^airplay\.\d+\.devices\./g, "");
    const pathParts = cleanedPath.split(".");
    const deviceId = pathParts.shift();
    const subId = pathParts.join(".");
    if (__privateGet(this, _connectionHandler) === null || deviceId === void 0) {
      return;
    }
    switch (subId) {
      case "on-air": {
        if (typeof state.val !== "boolean") {
          return;
        }
        __privateGet(this, _connectionHandler).setDeviceOnAir(deviceId, state.val);
        break;
      }
      case "volume": {
        if (typeof state.val !== "number") {
          return;
        }
        __privateGet(this, _connectionHandler).setVolume(deviceId, state.val);
        break;
      }
    }
  }
  async createStreamState() {
    await this.extendObjectAsync("stream.file", {
      type: "state",
      common: {
        name: {
          de: "Datei",
          en: "File"
        },
        type: "string"
      }
    });
    await this.extendObjectAsync("stream.filePid", {
      type: "state",
      common: {
        name: {
          de: "PID von FFMPEG Prozess",
          en: "PID of FFMPEG process"
        },
        type: "number"
      }
    });
    this.subscribeStates("stream.*");
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
_connectionHandler = new WeakMap();
if (require.main !== module) {
  module.exports = (options) => new Airplay(options);
} else {
  (() => new Airplay())();
}
//# sourceMappingURL=main.js.map
