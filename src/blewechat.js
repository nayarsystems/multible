class BleWeChat {
  constructor() {
    this.conns = {};
  }

  async _init() {
    return new Promise((resolve, reject) => {
      if (this.inited) {
        resolve();
        return;
      }

      wx.onBLEConnectionStateChange(change => {
        let conn = this.conns[change.deviceId];
        if (conn && !change.connected) {
          conn.disconnectCb(change.deviceId);
          delete this.conns[change.deviceId];
        }
      });

      wx.openBluetoothAdapter({
        success: () => {
          this.inited = true;
          resolve();
        },
        fail: e => {
          reject(e);
        }
      });
    });
  }

  async startScan(srvUUIDs, scanCb, errorCb, duplicates) {
    await this._init();

    return new Promise((resolve, reject) => {
      wx.onBluetoothDeviceFound(obj => {
        if (obj.devices) {
          for (let dev of obj.devices) {
            scanCb(BleWeChat.parseAdvertising(dev));
          }
        }
      });

      wx.startBluetoothDevicesDiscovery({
        services: srvUUIDs,
        allowDuplicatesKey: duplicates,
        interval: 0,
        success: () => {
          resolve();
        },
        fail: e => {
          errorCb(e);
          reject();
        }
      });
    });
  }

  static parseAdvertising(dev) {
    let key = BleWeChat.formatUUID(new Uint8Array(dev.advertisData, 0, 2));
    let value = new Uint8Array(dev.advertisData, 2, dev.advertisData.length);

    return {
      id: dev.deviceId,
      localName: dev.localName,
      manufacturerData: { [key]: value },
      serviceUUIDs: dev.advertisServiceUUIDs,
      serviceData: dev.serviceData,
      rssi: dev.RSSI
    };
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
    return new Promise((resolve, reject) => {
      wx.stopBluetoothDevicesDiscovery({
        success: resolve,
        fail: reject
      });
    });
  }

  async isEnabled() {
    try {
      await this._init();
    } catch (err) {
      if (err.errCode === 10001) {
        return Promise.resolve(false);
      }
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      wx.getBluetoothAdapterState({
        success: state => {
          resolve(state.available);
        },
        fail: reject
      });
    });
  }

  /* Possible values: on, off */
  async startStateNotifications(stateChangedCb) {
    return new Promise(resolve => {
      wx.onBluetoothAdapterStateChange(state => {
        stateChangedCb(state.available ? "on" : "off");
      });
      resolve();
    });
  }

  // Function not available on WeChat BLE API
  async stopStateNotifications() {
    return Promise.resolve();
  }

  async connect(deviceId, peerClosedCb) {
    await this._init();

    return new Promise(async (resolve, reject) => {
      wx.createBLEConnection({
        deviceId,
        timeout: 3000,
        success: () => {
          this.conns[deviceId] = {
            disconnectCb: peerClosedCb
          };
          resolve();
        },
        fail: reject
      });
    });
  }

  async disconnect(deviceId) {
    return new Promise((resolve, reject) => {
      wx.closeBLEConnection({
        deviceId,
        success: resolve,
        fail: reject
      });
    });
  }

  async isConnected(deviceId) {
    return new Promise((resolve, reject) => {
      wx.getConnectedBluetoothDevices({
        services: [],
        success: res => {
          if (res.devices) {
            for (let dev of res.devices) {
              if (dev.deviceId === deviceId) {
                resolve(true);
                return;
              }
            }
          }
          resolve(false);
        },
        fail: reject
      });
    });
  }

  async write(deviceId, srvUUID, charUUID, data) {
    return new Promise((resolve, reject) => {
      wx.writeBLECharacteristicValue({
        deviceId,
        serviceId: srvUUID,
        characteristicId: charUUID,
        value: data,
        success: resolve,
        fail: reject
      });
    });
  }

  async writeWithoutResponse(deviceId, srvUUID, charUUID, data) {
    return this.write(deviceId, srvUUID, charUUID, data);
  }

  async startNotification(deviceId, srvUUID, charUUID, dataCb) {
    return new Promise((resolve, reject) => {
      wx.onBLECharacteristicValueChange(res => {
        dataCb(res.value);
      });

      wx.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId: srvUUID,
        characteristicId: charUUID,
        state: true,
        success: resolve,
        fail: reject
      });
    });
  }

  async stopNotification(deviceId, srvUUID, charUUID) {
    return new Promise((resolve, reject) => {
      wx.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId: srvUUID,
        characteristicId: charUUID,
        state: false,
        success: resolve,
        fail: reject
      });
    });
  }
}

exports.BleWeChat = BleWeChat;
