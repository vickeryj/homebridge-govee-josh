module.exports = function (api) {
  console.log("registering goveeTemperature");
  api.registerAccessory("homebridge-govee–josh", GoveeTemperature);
};
var GoveeTemperature = (function () {

  let tempC;

  function GoveeTemperature(log, config, api) {
    this.log = log;
    this.api = api;
    tempC = 100;
    console.log("goveeTemperature called");
    this.log("goveeTemperature called");
    this.homebridgeService = new api.hap.Service.TemperatureSensor(config.name);
    this.homebridgeService.getCharacteristic(api.hap.Characteristic.CurrentTemperature)
      .setProps({ minValue: -100, maxValue: 100 })
      .on("get", this.getTemperature);
  };

  GoveeTemperature.prototype = {
    identify: function (callback) {
        this.log("Identify requested!");
        callback();
    },
    getServices: function () {
      console.log("getServices called");
      if (!this.homebridgeService)
          return [];
      const informationService = new this.api.hap.Service.AccessoryInformation();
      informationService
         .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Govee")
          .setCharacteristic(this.api.hap.Characteristic.Model, "H5102")
      console.log("returning services");
      return [informationService, this.homebridgeService];
    },
    getTemperature: function (callback) {
      console.log("getTemperature called");
      callback(null, tempC);
    },
  };



  const noble = require('@abandonware/noble');

  console.log("noble required");

  process.env.NOBLE_REPORT_ALL_HCI_EVENTS = "1"; 
  noble.on('stateChange', async (state) => {
    console.log('state change: ' + state);
    if (state === 'poweredOn') {
      noble.startScanningAsync('ec88');
    } else {
      noble.stopScanning();
    }
  });

  noble.on('scanStop', async () => {
    setTimeout(() => {
      noble.startScanningAsync('ec88');
    }, 5000);
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
        tempC = tempInC;
        const tempInF = (tempInC * 9) / 5 + 32;
        const humidity = (encodedData % 1000) / 10;1
        console.log(`${tempInF} ${humidity}`);
        noble.stopScanning();
      }
    }
  }));
  return GoveeTemperature;
}());
