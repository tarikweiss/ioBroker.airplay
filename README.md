![Logo](admin/airplay.png)
# ioBroker.airplay

[![NPM version](https://img.shields.io/npm/v/iobroker.airplay.svg)](https://www.npmjs.com/package/iobroker.airplay)
[![Downloads](https://img.shields.io/npm/dm/iobroker.airplay.svg)](https://www.npmjs.com/package/iobroker.airplay)
![Number of Installations](https://iobroker.live/badges/airplay-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/airplay-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.airplay.png?downloads=true)](https://nodei.co/npm/iobroker.airplay/)

**Tests:** ![Test and Release](https://github.com/tarikweiss/ioBroker.airplay/workflows/Test%20and%20Release/badge.svg)

## Introduction

Bring the possibility to play sound to AirPlay compatible devices to ioBroker.

## Prerequisites

You need to have ``ffmpeg`` installed. Furthermore, a DNS-SD/mDNS implementation like `Avahi` must be available.

If you run ioBroker in a docker container, you probably need to adjust your settings for the `host_mode` and enable the
`AVAHI` environment variable. You can find further information [here (ioBroker docker Image)](https://hub.docker.com/r/iobroker/iobroker).

## Usage

This adapter creates the devices it discovers via mdns/dns-sd service. If you wan't to stream an audio file to a AirPlay
device like a HomePod, then you need to enable the `on-air` datapoint per device (which you want to stream to).
After that you need to set the `airplay.*.stream.file` to a valid file path. Currently this is tested with `mp3` file type,
others may work too.

If you want to adjust the volume, you can set the `volume` datapoint between 0 and 100.

## Changelog
<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**
* (tarikweiss) initial release

## License
MIT License

Copyright (c) 2024 Tarik Weiss <kontakt@tarikweiss.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
