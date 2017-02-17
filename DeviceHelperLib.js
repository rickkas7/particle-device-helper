
// Required module:
// https://github.com/nfarina/xmldoc
var xmldoc = require('xmldoc');

// Standard node modules:
var child_process = require('child_process');
var util = require('util');



/**
 * Module for interacting with the Particle cloud
 * 
 * The way this works is that login credentials are usually given by the command line
 * using the --login <user> <pass> command. 
 */
(function(deviceHelper) {
	
	deviceHelper.showAllKeys = false;
	
	// This property is the standard list of fields to include in JSON output
	deviceHelper.standardKeys = {'IORegistryEntryLocation':true, 'IORegistryEntryName':true, 'USB Product Name':true,
			'USB Serial Number':true, 'idProduct':true, 'idVendor':true, 
			'id':true, 'serialPort':true, 'productId':true, 'deviceId':true, 'dfu':true,
			'dfuDevice':true};

	
	deviceHelper.usbDevices = [];
	
	deviceHelper.scan = function() {

		// Default buffer is 200K, often the results will be 150K or so, so set a bigger buffer here to be safe
		var xmlString = child_process.execFileSync('ioreg', ['-p', 'IOUSB', '-l', '-a'], {maxBuffer:500000});
		
	    // Results come back in XML, parse using xmldoc
	    var doc = new xmldoc.XmlDocument(xmlString);
	    
	    // console.log("stdout=" + doc.toString());
	    
	    // The XML is plist xml, so we need to parse it specially. Using a generic XML to Javascript
	    // parser like xml2js createse pretty useless objects because of the way plist interleaves
	    // keys and values.
	    deviceHelper.plistToDict(doc.childNamed('dict'));
	    
	    // Post-processing of the data here
		for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {
			var device = deviceHelper.usbDevices[ii];

			// We use the number part of the cu serialPort path as a unique identifier for which device you 
			// want to talk to. It's unique and relatively constant. The array index isn't a good id because
			// it changes are devices go on and off USB. The deviceId is good, but we don't have it
			// for devices not yet running 0.6.0. This seems like a reasonable compromise.
			device.id = device.IORegistryEntryLocation.substring(0, device.IORegistryEntryLocation.length - 3).toUpperCase() + '1';
			
			// Create the cu serialPort path. Not positive this algorithm is correct, but it works for me.
			// In older versions of Mac OS X , the hex number was not uppercased, if I recall correctly.
			device.serialPort = '/dev/cu.usbmodem' + device.id;
			
			// The product ID, for example 6 = Photon, 10 = Electron
			device.productId = device.idProduct & 0xfff;
			
			// dfu is set to true if the device is in DFU mode
			device.dfu = (device.idProduct & 0xf000) == 0xd000;

			// The dfuDevice is what you pass to dfu-util with the -d option. This is only the USB
			// vendor and product ID, so it's only unique when there's only one Photon, for example, in
			// DFU mode.
			var dfuProduct = 0xd000 | (device.idProduct & 0xfff);
			device.dfuDevice = device.idVendor.toString(16) + ':' + dfuProduct.toString(16);
			
			// Lowercase the device ID and put it in the easier to use field deviceId
			// if there is one. There only is one if the device is running 0.6.0 or later.
			if (device['USB Serial Number'].length == 24) {
				device.deviceId = device['USB Serial Number'].toLowerCase(); 
			}
		}
		
		if (!deviceHelper.showAllKeys) {
			for(var ii = 0; ii < deviceHelper.usbDevices.length; ii++) {			
				deviceHelper.usbDevices[ii] = deviceHelper.trimOneDeviceKeys(deviceHelper.usbDevices[ii]);
			}
		}
	};

	deviceHelper.trimOneDeviceKeys = function(device) {
    	// Just a subset of useful keys from standardKeys
		var trimmed = {};
		
		for(var prop in device) {
			if (device.hasOwnProperty(prop) && deviceHelper.standardKeys[prop]) {
				trimmed[prop] = device[prop];
			}
		}
		return trimmed;
	};

	deviceHelper.enterListening = function(device) {
		child_process.execSync('stty -f ' + device.serialPort + ' 28800');
	}

	deviceHelper.enterSafeListening = function(device) {
		// I think this is a little broken. If I do this, when I exit listening mode, I go into
		// safe mode. Then if I try to enter listening mode again, it won't do it. 
		// Need to figure out what's going on here; probably best to not use this for now.
		child_process.execSync('stty -f ' + device.serialPort + ' 28800');
		child_process.execSync('echo L > ' + device.serialPort);
	}

	deviceHelper.exitListening = function(device) {
		// When in listening mode, exit it by sending an x.
		child_process.execSync('echo x > ' + device.serialPort);
	};

	deviceHelper.enterDfu = function(device) {
		child_process.execSync('stty -f ' + device.serialPort + ' 14400');
	};

	deviceHelper.exitDfu = function(device) {
		// This is a little silly but here it goes:
		// The 'leave' option causes it to exit DFU mode. But you can only use it after uploading or downloading
		// a file. So we download a little bit from the beginning of the flash, where the boot loader is, just so
		// we can do something.
		// The rm stuff is there because you can't -U to /dev/null because it won't allow you to write to a file
		// that already exists.
		child_process.execSync('rm -f /tmp/devicehelper$$.bin && dfu-util -d ' + device.dfuDevice + ' -a 0 -s 0x08000000:16:leave -U /tmp/devicehelper$$.bin && rm -f /tmp/devicehelper$$.bin');
		
	};

	deviceHelper.addValueHook = function(key, value) {
		// We only really care about IORegistryentryChildren, and we want to flatten out the
		// list because we don't care which hub they're nested under, so we do that here.
		// The value is an array of dict objects, one for each device
		if (key == 'IORegistryEntryChildren') {
			for(var ii = 0; ii < value.length; ii++) {
				// Actually, only care about Particle devices for now
				if (value[ii]['USB Vendor Name'] == 'Particle') {
					deviceHelper.usbDevices.push(value[ii]);
				}
			}
		}

	};

	deviceHelper.plistToDict = function(elem) {
		var obj = {};

		var key = null;

		for(var ii = 0; ii < elem.children.length; ii++) {
			if (elem.children[ii].name) {
				if (key == null) {
					key = elem.children[ii].val;
					// console.log("ii=" + ii + " key=" + key);
				} 
				else {
					// value
					var value = deviceHelper.plistValue(elem.children[ii]); 
					obj[key] = value;
				
					// console.log("obj key=" + key + " value=", value);
					if (deviceHelper.addValueHook) {
						deviceHelper.addValueHook(key, value);
					}
					
					key = null;
				}
			}
		}
		
		
		return obj;
	}

	deviceHelper.plistToArray = function(elem) {
		var array = [];
			
		for(var ii = 0; ii < elem.children.length; ii++) {
			if (elem.children[ii].name) {
				var value = deviceHelper.plistValue(elem.children[ii]); 
				array.push(value);
				
				// console.log("array ii=" + ii + " value=", value);
			}
		}
		
		
		return array;
	}

	deviceHelper.plistValue = function(elem) {
		var result;
		
		if (elem.name == 'integer') {
			result = parseInt(elem.val);
		}
		else
		if (elem.name == 'string') {
			result = elem.val;
		}
		else
		if (elem.name == 'true') {
			result = true;
		}
		else
		if (elem.name == 'false') {
			result = false;
		}
		else
		if (elem.name == 'array') {
			result = deviceHelper.plistToArray(elem);
		}
		else
		if (elem.name == 'dict') {
			result = deviceHelper.plistToDict(elem);
		}
		else {
			console.log("unknown elem.name=" + elem.name);					
		}
		return result;
	}
	
}(module.exports));

