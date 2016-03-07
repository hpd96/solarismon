// SolarisMon ROTEX RPS3
//   read measurements from serial port "CONF" and create MQTT messages

// tested with: "R3 V.4.0"

// sample:
//
// SOLARIS R3 V.4.0 Nov  4 2010 13:23:29 ROTEX GmbH Ser.-Nr: 000001273683
// Zyklus /s:30
// HA;BK;P1 /%;P2;TK /°C;TR /°C;TS /°C;TV /°C;V /l/min;ERROR;P/W
// 0;0;0;0;38;38;44;31;0,0;;0

var sSerialPort = "/dev/ttyAMA0";

var fs = require('fs');
var format = require('util').format;
var serialport = require("serialport");
var mqtt = require('mqtt');

var mqttClient  = mqtt.connect('mqtt://localhost');
var SerialPort = serialport.SerialPort;

var baseFileName = '/home/pi/solarismon/solarismon-store';
var mqttConnected = false;

var lineMapping = ['HA', 'BSK', 'P1', 'P2', 'TK', 'TR', 'TS', 'TV', 'V', 'Status', 'P'];

var serial = new SerialPort(  sSerialPort , {
  baudrate: 19200,
  parser: serialport.parsers.readline("\r")
});

var bStoreTextFile = false;
var bVerbose = false;

var mqttTopic = "sensors/solaris"
process.env.TZ = 'Europe/Berlin';


serial.on("open", function () {
  console.log('serial open');
  serial.on('data', function(line) {
    // drop CR or LF
    line = line.replace(/(\r\n|\n|\r)/gm,"");	
    var data = parseLine(line);
    if (data != null )
    {
      writeFile(data);
      data = adjustFormat(data);
      mqttClient.publish(mqttTopic, JSON.stringify(data));
      if ( bVerbose == true )
      {
        console.log(data);
      }
    } // parseable data?
  });
});


mqttClient.on('connect', function () {
  mqttConnected = true;
  console.log("mqtt->connected", arguments);
});

mqttClient.on('reconnect', function () {
  mqttConnected = true;
  console.log("mqtt->reconnected", arguments);
});

mqttClient.on('offline', function () {
  mqttConnected = false;
  console.log("mqtt->offline", arguments);
});

mqttClient.on('close', function () {
  mqttConnected = false;
  console.log("mqtt->close", arguments);
});

mqttClient.on('error', function (e) {
  mqttConnected = false;
  console.log("mqtt->error", arguments);
});




function writeFile(data){
    var date = data.date;	
    var year = date.getFullYear();
    var month = date.getMonth() < 9 ? '0' + (date.getMonth() + 1) : '' + (date.getMonth() + 1);	
    var day = date.getDate() < 10 ? '0' + date.getDate() : '' + date.getDate(); 
    var filename = format("%s-%d-%s-%s.txt", baseFileName, year, month, day );
    if ( bStoreTextFile == true )
    {
        fs.appendFileSync(filename, format("%s: %s\n", data.date, data.line || 'error'));
    }
}

function IsNumeric(num) {
     return (num >=0 || num < 0);
}

function parseLine(line) {
    var result = null;
    if (typeof line == 'string' || line instanceof String) {
  	var parts = line.split(';', lineMapping.length);
	if(parts.length === lineMapping.length) {
            result = {date: new Date()};
            result.line = line;
	    parts.forEach(function(p, i) {
		var name = lineMapping[i] ==='?' ? 'var' + i : lineMapping[i];
		result[name] = p;
	    });
            // avoid  { P1: 'P1 /%' } or {  HA: '§$%&/()' }
            if ( ! IsNumeric( result['HA'] ) ) { return null; }
            if ( ! IsNumeric( result['TS'] ) ) { return null; }
            if ( ! IsNumeric( result['P1'] ) ) { return null; }
            if ( ! IsNumeric( result['P'] ) ) { return null; }
	} // no ';'
	else
	{
          if ( line.indexOf('ROTEX')>=0 || line.indexOf('Zyklus')>=0 )
          {
            console.log( line );
          }
          else
          {
	    console.log( 'parser problem ' + line );
          }
        }
    } // is a string
    return result;
}

// convert german "," float separator to "."
function adjustFormat(data) {
    if(data.V){
        data.V = data.V.replace(/,/g, '.');
    }
    return data;
}


