# Particle Device Helper

*Utility for dealing with Particle Photons, Electrons, etc. connected to a Mac*

## What does it do?

It finds Particle devices connected via USB to your Mac, and allows you to map between useful things. I imagine this would be very helpful in test environments and in setting up new devices for a product creator.

For example:

- It can list all of the connected devices, in both listening and DFU modes
- It can find the serial port (/dev/cu.usbmodemFD3161) given a device ID (if the device is running system firmware 0.6.0 or later) without changing the device state.
- It can find out if the device is currently in serial or DFU mode.
- It can switch the device into DFU mode
- It can switch the device into listening mode

## Installation

The program is a node.js script. You'll need [node.js](https://nodejs.org/) and the devicehelper.js script. You'll need to install the dependencies the first time:

```
npm install xmldoc yargs
```

Then you just run the script. For example:

```
node devicehelper.js list --json
```

While you can use the script as-is, it's most like sample code and you can adapt the techniques for your environment.

## But I don't have a Mac

At this time, the program is very Mac-specific. It uses the ioreg command to probe the USB devices, and it has specific knowledge of how Mac USB serial ports are mapped.

While the Linux lsusb works sort of like ioreg, but the output format is completely different and the serial port mapping is different. And Windows is altogether different in both ways.




 



