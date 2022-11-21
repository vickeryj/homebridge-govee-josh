const noble = require('@abandonware/noble');

module.exports = function (api) {
  api.registerAccessory("homebridge-govee–josh", GoveeJosh);
};
var GoveeJosh = (function () {

  let homebridge, homebridgeLog, temperatureService, humidityService;
  function GoveeJosh(log, config, api) {
    this.log = log;
    this.api = api;

    this.log("GoveeJosh called");

    homebridge = api;
    homebridgeLog = log;
    temperatureService = new api.hap.Service.TemperatureSensor(config.name);
    humidityService = new api.hap.Service.HumiditySensor(config.name);
  };

  GoveeJosh.prototype = {
    identify: function (callback) {
        this.log("Identify requested!");
        callback();
    },
    getServices: function () {
      this.log("getServices called");
      const informationService = new this.api.hap.Service.AccessoryInformation();
      informationService
         .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Govee")
          .setCharacteristic(this.api.hap.Characteristic.Model, "H5102")
      return [informationService, temperatureService, humidityService];
    },
  };


  process.env.NOBLE_REPORT_ALL_HCI_EVENTS = "1";
  noble.on('stateChange', async (state) => {
    homebridgeLog('noble state change: ' + state);
    if (state === 'poweredOn') {
      noble.startScanningAsync('ec88');
    } else {
      noble.stopScanning();
    }
  });

  noble.on('scanStop', async () => {
    setTimeout(() => {
      noble.startScanningAsync('ec88');
    }, 60000);
  });


  noble.on('discover', (function (peripheral) {
    const { address, advertisement } = peripheral;
    if (advertisement && advertisement.manufacturerData) {
      let hex = advertisement.manufacturerData;
      if (hex[2] == 1) {
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
        temperatureService.updateCharacteristic(homebridge.hap.Characteristic.CurrentTemperature, tempInC);
        const tempInF = (tempInC * 9) / 5 + 32;
        humidity = (encodedData % 1000) / 10;1
        humidityService.updateCharacteristic(homebridge.hap.Characteristic.CurrentRelativeHumidity, humidity)
        homebridgeLog.debug(`temp: ${tempInF} humidity: ${humidity}`);
        noble.stopScanning();
      }
    }
  }));
  return GoveeJosh;
}());
