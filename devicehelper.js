// Tool to help manage Photon and Electron devices connected to a Mac
// This really only works on the Mac; it uses the ioreg program that's only available on the Mac,
// and the mapping between USB devices and serial ports is Mac-specific.

// Before you begin:
// From the directory where devicehelper.js lives:
// npm install xmldoc yargs

// yargs argument parser (successor to optimist)
// https://www.npmjs.com/package/yargs
var argv = require('yargs')
	.usage('Usage: $0 <command> [options]')
	.command('list', 'List devices')
	.demandCommand(1)
	.argv;

var cmd = argv._[0];

// The deviceHelper library does most of the actual work here
var deviceHelper = require('./DeviceHelperLib.js');

// The default is to trim away unimportant keys, but if you really want all of them, use the --all option
if (argv.all) {
	deviceHelper.showAllKeys = true;
}

// Scan for devices, required before doing much of anything
deviceHelper.scan();


if (cmd == 'list') {

    if (argv.json) {
        // Return data in JSON, suitable for programmatic processing
    	// node devicehelper.js list --json
    	// node devicehelper.js list --json --all
        console.log(JSON.stringify(deviceHelper.usbDevices));            	
    }
    else
    if (argv.csv) {
    	// Return field in a comma separated list
    	// node devicehelper.js list --csv="id,deviceId"
    	for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {
    		var out = '';
    		var fields = argv.csv.split(',');
    		for(var jj = 0; jj < fields.length; jj++) {
    			if (out != '') {
    				out += ',';
    			}
    			out += deviceHelper.usbDevices[ii][fields[jj]];
    		}
    		console.log(out);
    	}
    }
    else
    if (argv.ids) {
    	// Return a list of ids, one per line:
    	// node devicehelper.js list --ids    	
    	// The id is a unique string that identifiers a port. It's the unique part of the 
    	// /dev/cu.usbmodem string.
    	for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {
    		console.log(deviceHelper.usbDevices[ii].id);
    	}
    }
    else
    if (argv.serialPorts) {
    	// Return a list of serial port names, one per line:
    	// node devicehelper.js list --serialPorts 	
    	for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {
    		console.log(deviceHelper.usbDevices[ii].serialPort);
    	}
    }
}
else
if (cmd == 'find') {
	var device;
	
	if (argv.id) {
		// Find a device by its id (unique part of the /dev/cu.usbmodem string)
		// node devicehelper.js find --id=FD1331 --enterListening 
    	for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {
    		if (deviceHelper.usbDevices[ii].id == argv.id) {
    			device = deviceHelper.usbDevices[ii];
    			break;
    		}
    	}			
	}
	else
	if (argv.serialPort) {
		// node devicehelper.js find --serialPort="/dev/cu.usbmodemFD1331" --enterListening 
    	for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {
    		if (deviceHelper.usbDevices[ii].serialPort == argv.serialPort) {
    			device = deviceHelper.usbDevices[ii];
    			break;
    		}
    	}						
	}
	else
	if (argv.deviceId) {
		// node devicehelper.js find --deviceId="" --enterListening 
    	for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {
    		if (deviceHelper.usbDevices[ii].deviceId == argv.deviceId) {
    			device = deviceHelper.usbDevices[ii];
    			break;
    		}
    	}									
	}
	if (device != undefined) {
		if (argv.output) {
			// Output as
			if (argv.output == 'json') {
				console.log(JSON.stringify(device));
			}
			else {
				// Otherwise assume a field name like id, serialPort, deviceId, or an USB field name like IORegistryEntryName	
				console.log(device[argv.output]);
			}
		}
		
		if (argv.enterDfu) {			
			if (argv.onlyOne) {
				// If the --onlyOne flag is specified, put this device in DFU mode and put any other
				// devices out of DFU mode
		    	for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {
		    		if (deviceHelper.usbDevices[ii].id != device.id && deviceHelper.usbDevices[ii].dfu) {
		    			deviceHelper.exitDfu(deviceHelper.usbDevices[ii]);
		    		}
		    	}
			}
			
			deviceHelper.enterDfu(device);
		}
		
		if (argv.exitDfu) {
			deviceHelper.exitDfu(device);
		}
		
		if (argv.enterListening) {
			deviceHelper.enterListening(device);
		}
		
		// See note in implementation in the library for why this is commented out
		// if (argv.enterSafeListening) {
		//	enterSafeListening(device);
		//}
		
		if (argv.exitListening) {
			deviceHelper.exitListening(device);
		}			
	}
	else {
		console.log("device not found");
	}
}
else {
	console.log("unknown command");
}




