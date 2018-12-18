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
var mqtt = require('mqtt');

const mqttHost = 'localhost';
var mqttClient  = mqtt.connect('mqtt://' + mqttHost);

var baseFileDir = '/home/pi/solarismon/logs';
var baseFileName = 'solarismon-store';
var mqttConnected = false;

var lineMapping = ['HA', 'BSK', 'P1', 'P2', 'TK', 'TR', 'TS', 'TV', 'V', 'Status', 'P'];

const SerialPort = require("serialport");
const Readline = require('@serialport/parser-readline')
const port = new SerialPort( sSerialPort , { baudRate: 19200 } )
const parser = port.pipe(new Readline({ delimiter: '\n' }))

const bVerbose = true;
const bStoreTextFile = true ;

var mqttTopic = "sensors/solaris"
process.env.TZ = 'Europe/Berlin';

console.log( "rotex solaris mon ", lineMapping)
console.log( format("mqtt host: %s topic: %s", mqttHost, mqttTopic) )


  parser.on('data', function(line) {
    if ( bVerbose == true )
    {
      console.log("serial: " + line);
    }
    // drop CR or LF
    line = line.replace(/(\r\n|\n|\r)/gm,"");	
    var data = parseLine(line);
    if (data != null )
    {
      if ( bStoreTextFile == true )
      {
        writeFile(data, line);
      }
      data = adjustFormat(data);
      mqttClient.publish(mqttTopic, JSON.stringify(data));
      if ( bVerbose == true )
      {
        console.log("mqtt pub: ", data);
      }
    } // parseable data?
  });


mqttClient.on('connect', function () {
  mqttConnected = true;
  console.log("mqtt->connected"); //, arguments);
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




function writeFile(data, serialLine){
    var date = data.date;	
    var year = date.getFullYear();
    var month = date.getMonth() < 9 ? '0' + (date.getMonth() + 1) : '' + (date.getMonth() + 1);	
    var day = date.getDate() < 10 ? '0' + date.getDate() : '' + date.getDate(); 
    var filedir = format('%s/%s', baseFileDir, parseInt(year) );
    if (! fs.existsSync(baseFileDir)) {
      fs.mkdir(baseFileDir);
    }
    if (! fs.existsSync(filedir)) {
      fs.mkdir(filedir);
    }
    var filename = format("%s/%s-%d-%s-%s.txt", filedir, baseFileName, year, month, day );
    var shortDate = format("%s-%s-%s %s", year, month, day, "00000000"); // date.substr(17,8) );
    fs.appendFileSync(filename, format("%s: %s\n", shortDate, serialLine || 'error'));
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
	    parts.forEach(function(p, i) {
		var name = lineMapping[i] ==='?' ? 'var' + i : lineMapping[i];
		result[name] = p;
	    });
            // avoid  { P1: 'P1 /%' } or {  HA: '§$%&/()' }
            if ( ! IsNumeric( result['HA'] ) ) { return null; }
            if ( ! IsNumeric( result['TS'] ) ) { return null; }
            if ( ! IsNumeric( result['P1'] ) ) { return null; }
            if ( ! IsNumeric( result['P'] ) ) { return null; }
            if ( result['Status'] == '' ) { result['Status']="-"; }
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


