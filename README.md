# Particle Device Helper

*Utility for dealing with Particle Photons, Electrons, etc. connected to a Mac*

## What does it do?

It finds Particle devices connected via USB to your Mac, and allows you to map between useful things. I imagine this would be very helpful in test environments and in setting up new devices for a product creator.

For example:

- It can list all of the connected devices, in normal, listening, and DFU modes.
- It can find the serial port (/dev/cu.usbmodemFD3161) for a device ID (if the device is running system firmware 0.6.0 or later) without changing the device state.
- It can find out if the device is currently in serial or DFU mode.
- It can switch the device in and out of DFU mode (blinking yellow).
- It can switch the device in and out of listening mode (blinking blue).
- It provides the proper value to pass to dfu-util -d if you want to program the device directly with dfu-util.

### But I don't have a Mac

At this time, the program is very Mac-specific. It uses the ioreg command to probe the USB devices, and it has specific knowledge of how Mac USB serial ports are mapped.

The Linux lsusb works sort of like ioreg, but the output format is completely different and the serial port mapping is different. And Windows is altogether different in both ways.

## Installation

The program is a node.js script. You'll need [node.js](https://nodejs.org/) and the files in this repository:

- devicehelper.js (script you can run)
- DeviceHelperLib.js (a library you can use from your own node.js scripts)

You'll need to install the dependencies the first time:

```
npm install xmldoc yargs
```

Then you just run the script. For example:

```
node devicehelper.js list --json
```

## How to use it


### Command: list

The list command finds information about the connected USB devices and returns it in a variety of formats, depending on what you want to do with it.

- Print information about USB devices in JSON format, useful if you want to process it with another script.

```
$ node devicehelper.js list --json
[{"IORegistryEntryLocation":"fd316000","IORegistryEntryName":"Photon","USB Product Name":"Photon","USB Serial Number":"3B0021001747353236343033","idProduct":49158,"idVendor":11012,"id":"FD3161","serialPort":"/dev/cu.usbmodemFD3161","productId":6,"dfu":false,"dfuDevice":"2b04:d006","deviceId":"3b0021001747353236343033"}]
```

- Print data as comma-separated values, only certain fields.

```
$ node devicehelper.js list --csv="serialPort,deviceId"
/dev/cu.usbmodemFD3161,3b0021001747353236343033
```

- Print just a list of ids. The ids can be used to somewhat uniquely identify a device.

```
$ node devicehelper.js list --ids
FD3161
```

- Print a list of serial ports. Note that this is different than `ls /dev/cu*` because this will return the port information, even when the device is in DFU mode and the cu device is not currently active, so you know what the port will be when it returns to normal operating mode.

```
$ node devicehelper.js list --serialPorts
/dev/cu.usbmodemFD3161
```


### Command: find

The find command finds a device by some criteria, then either returns more information, or affects the state of the device, like entering DFU mode, for example.

- Finds information by the id. If you're setting up a whole bunch of devices at once, you could connect them all, use the `list --ids` command to get all of the ids, then your script can run through them one-by-one and do things to them by id.

```
$ node devicehelper.js find --id=FD3161 --output=json
{"IORegistryEntryLocation":"fd316000","IORegistryEntryName":"Photon","USB Product Name":"Photon","USB Serial Number":"3B0021001747353236343033","idProduct":49158,"idVendor":11012,"id":"FD3161","serialPort":"/dev/cu.usbmodemFD3161","productId":6,"dfu":false,"dfuDevice":"2b04:d006","deviceId":"3b0021001747353236343033"}
```

- You can output a specific field as well. So if you have the id and you want the serial port you can use:

```
$ node devicehelper.js find --id=FD3161 --output=serialPort
/dev/cu.usbmodemFD3161
```

- Or output the deviceId, though this only works when the device is running system firmware 0.6.0 or later. It won't work with from the factory 0.4.8 or 0.4.9.

```
$ node devicehelper.js find --id=FD3161 --output=deviceId
3b0021001747353236343033
```

- If you are going to call dfu-util with the device, you can find out what to pass as the -d option to dfu-util:

```
$ node devicehelper.js find --id=FD3161 --output=dfuDevice
2b04:d006
```

- Is the device currently in DFU mode?

```
$ node devicehelper.js find --id=FD3161 --output=dfu
false
```

- Enter DFU mode:

```
$ node devicehelper.js find --id=FD3161 --enterDfu
```

- Because I couldn't figure out how to get the --ports option of dfu-util to work, you really can only use dfu-util with a single device of a given type in DFU mode at a time. The --onlyOne option will cause any other devices in DFU to exit DFU mode before putting the requested device into DFU mode, so only one is in DFU mode at a time.

```
$ node devicehelper.js find --id=FD3161 --enterDfu --onlyOne
```

- Exit DFU mode:

```
$ node devicehelper.js find --id=FD3161 --exitDfu
```

- Enter listening mode:

```
$ node devicehelper.js find --id=FD3161 --enterListening
```

- Exit listening mode:

```
$ node devicehelper.js find --id=FD3161 --exitListening
```

- You can find devices by their serialPort as well:

```
$ node devicehelper.js find --serialPort="/dev/cu.usbmodemFD3161" --enterListening
```

- You can find devices by deviceId (if running 0.6.0 or later):

```
$ node devicehelper.js find --deviceId=3b0021001747353236343033 --enterListening
```


## Using the Library

- Make sure you install the [xmldoc](https://github.com/nfarina/xmldoc) dependency, either manually or adding to your package.json:

```
npm install xmldoc
```

- Require the library into your node program:

```
var deviceHelper = require('./DeviceHelperLib.js');
```

- Scan for devices. You must do this once; you can do it more than once to re-scan:

```
deviceHelper.scan();
```

- See the examples in devicehelper.js for searching and getting data out.

## Other handy tips

- Specify the port name for particle identify to avoid the prompt to choose a device when you have multiple devices connected. You can use this to find the device id for a factory fresh Photon not yet running 0.6.0 yet. Also to get the ICCID of an Electron.

```
$ particle identify /dev/cu.usbmodemFD3161
Your device id is 3b0021001747353236343033
Your system firmware version is 0.6.1
```

- I'll probably think of other things to put here in the future.
