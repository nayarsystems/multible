class BleCordova {
  startScan(srvUUIDs, scanCb, errorCb, duplicates) {
    console.log("BleCordova.startScan");
    this.scanning = true;

    window.ble.startScanWithOptions(
      srvUUIDs,
      { reportDuplicates: duplicates },
      dev => {
        // console.log(`DEV: ${JSON.stringify(dev)}`);
        const data = BleCordova.parseAdvertising(dev);
        // console.log(`parsed data: ${JSON.stringify(data)}`);
        Object.assign(dev, data);
        scanCb(dev);
      },
      err => {
        errorCb(err);
      }
    );
  }

  static parseAdvertising(device) {
    if (window.device.platform === "iOS") {
      return BleCordova.parseAdvertisingIos(device);
    }
    return BleCordova.parseAdvertisingAndroid(device);
  }

  static parseAdvertisingIos(device) {
    /*
        "kCBAdvDataLocalName": "demo",
        "kCBAdvDataManufacturerData": {}, // arraybuffer data not shown
        "kCBAdvDataServiceUUIDs": [
            "721b"
        ],  
        "kCBAdvDataIsConnectable": true,
        "kCBAdvDataServiceData": {
            "BBB0": {}   // arraybuffer data not shown
        },

    */

    return {
      localName: device.advertising.kCBAdvDataLocalName,
      manufacturerData: device.advertising.kCBAdvDataManufacturerData,
      serviceUUIDs: device.advertising.kCBAdvDataServiceUUIDs,
      serviceData: device.advertising.kCBAdvDataServiceData,
      txPowerLevel: device.advertising.kCBAdvDataTxPowerLevel
    };
  }

  static parseAdvertisingAndroid(device) {
    /*
    const FIELDS = {
      0x01: "FLAGS",
      0x02: "SERVICE_UUIDS_16_BIT_PARTIAL",
      0x03: "SERVICE_UUIDS_16_BIT_COMPLETE",
      0x04: "SERVICE_UUIDS_32_BIT_PARTIAL",
      0x05: "SERVICE_UUIDS_32_BIT_COMPLETE",
      0x06: "SERVICE_UUIDS_128_BIT_PARTIAL",
      0x07: "SERVICE_UUIDS_128_BIT_COMPLETE",
      0x08: "LOCAL_NAME_SHORT",
      0x09: "LOCAL_NAME_COMPLETE",
      0x0a: "TX_POWER_LEVEL",
      0x16: "SERVICE_DATA",
      0xff: "MANUFACTURER_SPECIFIC_DATA"
    };
    */

    const arr = new Uint8Array(device.advertising);
    const data = {};
    let i = 0;

    // console.log(`advertising: ${JSON.stringify(arr)}`);

    while (i < arr.length) {
      const length = arr[i++] - 1;
      if (length === -1) {
        break;
      }

      const type = arr[i++];
      // console.log(`type=${type} length=${length}`);

      switch (type) {
        case 0x01:
          data.flags = arr[i];
          i += length;
          break;
        case 0x02:
        case 0x03: {
          i = BleCordova.extractUUIDs(arr, data, i, length, 2);
          break;
        }
        case 0x04:
        case 0x05: {
          i = BleCordova.extractUUIDs(arr, data, i, length, 4);
          break;
        }
        case 0x06:
        case 0x07: {
          i = BleCordova.extractUUIDs(arr, data, i, length, 16);
          break;
        }
        case 0x08:
        case 0x09: {
          let fieldData = new Uint8Array(arr.buffer, i, length);
          data.localName = new window.TextDecoder("utf-8").decode(fieldData);
          i += length;
          break;
        }
        case 0x0a: {
          let intArray = new Int8Array(arr);
          data.txPowerLevel = intArray[i];
          i += length;
          break;
        }
        case 0x16: {
          if (!("serviceData" in data)) {
            data.serviceData = {};
          }

          let key = this.formatUUID(new Uint8Array(arr.buffer, i, 2));
          let value = new Uint8Array(arr.buffer, i + 2, length - 2);
          data.serviceData[key] = value;

          i += length;
          break;
        }
        case 0xff: {
          if (!("manufacturerData" in data)) {
            data.manufacturerData = {};
          }

          let key = this.formatUUID(new Uint8Array(arr.buffer, i, 2));
          let value = new Uint8Array(arr.buffer, i + 2, length - 2);
          data.manufacturerData[key] = value;

          i += length;
          break;
        }
        default:
          if (!("unknown" in data)) {
            data.unknown = {};
          }

          data.unknown[type] = new Uint8Array(arr.buffer, i, length);
          i += length;
      }
    }

    return data;
  }

  static extractUUIDs(binData, parsedData, index, length, uuidNumBytes) {
    let uuids = [];
    let remaining = length;
    let i = index;

    while (remaining > 0) {
      uuids.push(
        this.formatUUID(new Uint8Array(binData.buffer, i, uuidNumBytes))
      );
      i += uuidNumBytes;
      remaining -= uuidNumBytes;
    }

    if (!("serviceUUIDs" in parsedData)) {
      parsedData.serviceUUIDs = [];
    }

    parsedData.serviceUUIDs = parsedData.serviceUUIDs.concat(uuids);

    return i;
  }

  static formatUUID(array) {
    let result = "";

    for (let i = 0; i < array.length; i++) {
      let value = array[i].toString(16);
      if (value.length === 1) {
        value = `0${value}`;
      }
      result = value + result;
    }

    if (result.length === 32) {
      result = `${result.slice(0, 8)}-${result.slice(8, 12)}-${result.slice(
        12,
        16
      )}-${result.slice(16, 20)}-${result.slice(20, result.length)}`;
    }

    return result;
  }

  async stopScan() {
    if (!this.scaning) {
      return Promise.resolve();
    }
    this.scaning = false;

    return new Promise((resolve, reject) => {
      // window.ble.stopScan(resolve, reject);
    });
  }

  isEnabled() {}

  startStateNotifications(stateChangedCb) {}

  connect(deviceId, peerClosedCb) {}

  disconnect(deviceId) {}

  startNotification(deviceId, srvUUID, charUUID, dataCb) {}

  stopNotification(deviceId, srvUUID, charUUID) {}

  writeWithoutResponse(deviceId, srvUUID, charUUID, data) {}

  write(deviceId, srvUUID, charUUID, data) {}
}

exports.BleCordova = BleCordova;
