module.exports = function (api) {
  api.registerPlatform("homebridge-govee-josh", GoveeJosh);
};

var GoveeJosh = (function () {

  let homebridge, homebridgeLog;
  let govees = {};
  function GoveeJosh(log, config, api) {
    this.log = log;
    this.api = api;

    this.log("GoveeJosh called");

    homebridge = api;
    homebridgeLog = log;

    startNoble();
  };

  GoveeJosh.prototype = {
    configureAccessory: function (accessory) {
      this.log("configureAccessory called");

      accessory.on('identify', function () {
        this.log("Identify requested: " + accessory.displayName);
      });

      govees[accessory.UUID] = accessory;

    },
  };


  function goveeFound (peripheral) {
    const uuid = homebridge.hap.uuid.generate(peripheral.id);
    let accessory = govees[uuid];
    if (!accessory) {
      homebridgeLog('new goveeFound: ' + peripheral.id);
      accessory = new homebridge.platformAccessory(peripheral.id, uuid);
      accessory.addService(homebridge.hap.Service.TemperatureSensor, uuid);
      accessory.addService(homebridge.hap.Service.HumiditySensor, uuid);
      homebridge.registerPlatformAccessories('homebridge-govee-josh', 'homebridge-govee-josh', [accessory]);
      govees[peripheral.id] = accessory;
    }
    return accessory;
  };

  function startNoble () {
    const noble = require('@abandonware/noble');

    function discoverGovees () {
      noble.startScanningAsync('ec88');
      setTimeout(() => {
        noble.stopScanning();
      }, 20000);
    }

    process.env.NOBLE_REPORT_ALL_HCI_EVENTS = "1";
    noble.on('stateChange', async (state) => {
      homebridgeLog('noble state change: ' + state);
      if (state === 'poweredOn') {
        discoverGovees();
      } else {
        noble.stopScanning();
      }
    });

    noble.on('scanStop', async () => {
      homebridgeLog.debug('scanStop');
      setTimeout(() => { discoverGovees(); }, 40000);
    });

    noble.on('discover', (function (peripheral) {
      const { address, advertisement } = peripheral;
      if (advertisement && advertisement.manufacturerData) {
        let hex = advertisement.manufacturerData;
        if (hex[2] == 1) {
          govee = goveeFound(peripheral);
          let encodedData = parseInt(hex.toString("hex").substring(8, 14), 16);
          let tempIsNegative = false;
          if (encodedData & 0x800000) {
            tempIsNegative = true;
            encodedData = encodedData ^ 0x800000;
          }
          let tempInC = encodedData / 10000;
          if (tempIsNegative) {
            tempInC = 0 - tempInC;
          }
          const temperatureService = govee.getService(homebridge.hap.Service.TemperatureSensor);
          temperatureService.updateCharacteristic(homebridge.hap.Characteristic.CurrentTemperature, tempInC);
          const tempInF = (tempInC * 9) / 5 + 32;
          humidity = (encodedData % 1000) / 10;
          const humidityService = govee.getService(homebridge.hap.Service.HumiditySensor);
          humidityService.updateCharacteristic(homebridge.hap.Characteristic.CurrentRelativeHumidity, humidity)
          homebridgeLog(`${govee.UUID} temp: ${tempInF} humidity: ${humidity}`);
        }
      }
    }));
  };

  return GoveeJosh;
}());
