// Tool to help manage Photon and Electron devices connected to a Mac
// This really only works on the Mac; it uses the xxx program that's only available on the Mac,
// and the mapping between USB devices and serial ports is Mac-specific.

// Before you begin:
// From the directory where devicehelper.js lives:
// npm install xmldoc yargs

// Required modules:
// https://github.com/nfarina/xmldoc
var xmldoc = require('xmldoc');

// yargs argument parser (successor to optimist)
// https://www.npmjs.com/package/yargs
var argv = require('yargs')
	.usage('Usage: $0 <command> [options]')
	.command('list', 'List devices')
	.demandCommand(1)
	.argv;

var execFile = require('child_process').execFile;

var util = require('util');

var cmd = argv._[0];
// console.log("cmd=" + cmd);

var standardKeys = {'IORegistryEntryLocation':true, 'IORegistryEntryName':true, 'USB Product Name':true,
		'USB Serial Number':true, 'idProduct':true, 'idVendor':true, 
		'id':true, 'serialPort':true, 'productId':true, 'deviceId':true, 'dfu':true };


var usbDevices = [];

//Default buffer is 200K, often the results will be 150K or so, so set a bigger buffer here to be safe
execFile('ioreg', ['-p', 'IOUSB', '-l', '-a'], {maxBuffer:500000}, function(err, stdout, stderr) {
    if (err) throw err;
    
    // Results come back in XML, parse using xmldoc
    var doc = new xmldoc.XmlDocument(stdout);
    
    // console.log("stdout=" + doc.toString());
    
    // The XML is plist xml, so we need to parse it specially. Using a generic XML to Javascript
    // parser like xml2js createse pretty useless objects because of the way plist interleaves
    // keys and values.
    plistToDict(doc.childNamed('dict'));
    
    // Post-processing of the data here
	for(var ii = 0; ii < usbDevices.length; ii++) {
		var data = usbDevices[ii];

		// We use the number part of the cu serialPort path as a unique identifier for which device you 
		// want to talk to. It's unique and relatively constant. The array index isn't a good id because
		// it changes are devices go on and off USB. The deviceId is good, but we don't have it
		// for devices not yet running 0.6.0. This seems like a reasonable compromise.
		data.id = data.IORegistryEntryLocation.substring(0, data.IORegistryEntryLocation.length - 3).toUpperCase() + '1';
		
		// Create the cu serialPort path. Not positive this algorithm is correct, but it works for me.
		// In older versions of Mac OS X , the hex number was not uppercased, if I recall correctly.
		data.serialPort = '/dev/cu.usbmodem' + data.id;
		
		// The product ID, for example 6 = Photon, 10 = Electron
		data.productId = data.idProduct & 0xfff;
		
		// dfu is set to true if the device is in DFU mode
		data.dfu = (data.idProduct & 0xf000) == 0xd000;
		
		// Lowercase the device ID and put it in the easier to use field deviceId
		// if there is one. There only is one if the device is running 0.6.0 or later.
		if (data['USB Serial Number'].length == 24) {
			data.deviceId = data['USB Serial Number'].toLowerCase(); 
		}
	}

    if (!argv.all) {
    	// Just a subset of useful keys from standardKeys
    	for(var ii = 0; ii < usbDevices.length; ii++) {
    		var orig = usbDevices[ii];
    		var trimmed = {};
    		
    		for(var prop in orig) {
    			if (orig.hasOwnProperty(prop) && standardKeys[prop]) {
    				trimmed[prop] = orig[prop];
    			}
    		}
    		usbDevices[ii] = trimmed;
    	}            	
    }    

    if (cmd == 'list') {

	    if (argv.json) {
	        // Return data in JSON, suitable for programmatic processing
	        console.log(JSON.stringify(usbDevices));            	
	    }
	    else
	    if (argv.csv) {
	    	// Return field in a comma separated list
	    	// node devicehelper.js list --csv="id,deviceId"
	    	for(var ii = 0; ii < usbDevices.length; ii++) {
	    		var out = '';
	    		var fields = argv.csv.split(',');
	    		for(var jj = 0; jj < fields.length; jj++) {
	    			if (out != '') {
	    				out += ',';
	    			}
	    			out += usbDevices[ii][fields[jj]];
	    		}
	    		console.log(out);
	    	}
	    }
	    else
	    if (argv.ids) {
	    	for(var ii = 0; ii < usbDevices.length; ii++) {
	    		console.log(usbDevices[ii].id);
	    	}
	    }
	    else
	    if (argv.serialPorts) {
	    	for(var ii = 0; ii < usbDevices.length; ii++) {
	    		console.log(usbDevices[ii].serialPort);
	    	}
	    }
    }
    else
	if (cmd == 'find') {
		var device;
		
		if (argv.id) {
	    	for(var ii = 0; ii < usbDevices.length; ii++) {
	    		if (usbDevices[ii].id == argv.id) {
	    			device = usbDevices[ii];
	    			break;
	    		}
	    	}			
		}
		else
		if (argv.serialPort) {
	    	for(var ii = 0; ii < usbDevices.length; ii++) {
	    		if (usbDevices[ii].serialPort == argv.serialPort) {
	    			device = usbDevices[ii];
	    			break;
	    		}
	    	}						
		}
		else
		if (argv.deviceId) {
	    	for(var ii = 0; ii < usbDevices.length; ii++) {
	    		if (usbDevices[ii].deviceId == argv.deviceId) {
	    			device = usbDevices[ii];
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
			
			if (argv.dfu) {
				execFile('stty', ['-f', device.serialPort, '14400'], function(err, stdout, stderr) {
				    if (err) throw err;
				});
			}
			if (argv.listening) {
				execFile('stty', ['-f', device.serialPort, '28800'], function(err, stdout, stderr) {
				    if (err) throw err;
				});				
			}
		}
		else {
			console.log("device not found");
		}
	}
	else {
		console.log("unknown command");
	}
    
});	

	



function plistToDict(elem) {
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
				var value = plistValue(elem.children[ii]); 
				obj[key] = value;
			
				// console.log("obj key=" + key + " value=", value);
				
				// We only really care about IORegistryentryChildren, and we want to flatten out the
				// list because we don't care which hub they're nested under, so we do that here.
				// The value is an array of dict objects, one for each device
				if (key == 'IORegistryEntryChildren') {
					for(var jj = 0; jj < value.length; jj++) {
						// Actually, only care about Particle devices for now
						if (value[jj]['USB Vendor Name'] == 'Particle') {
							usbDevices.push(value[jj]);
						}
					}
				}
				
				key = null;
			}
		}
	}
	
	
	return obj;
}

function plistToArray(elem) {
	var array = [];
		
	for(var ii = 0; ii < elem.children.length; ii++) {
		if (elem.children[ii].name) {
			var value = plistValue(elem.children[ii]); 
			array.push(value);
			
			// console.log("array ii=" + ii + " value=", value);
		}
	}
	
	
	return array;
}

function plistValue(elem) {
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
		result = plistToArray(elem);
	}
	else
	if (elem.name == 'dict') {
		result = plistToDict(elem);
	}
	else {
		console.log("unknown elem.name=" + elem.name);					
	}
	return result;
}

