var serial = {};

(function() {
  'use strict';

  serial.getPorts = function() {
    return navigator.usb.getDevices().then(devices => {
      return devices.map(device => new serial.Port(device));
    });
  };

  serial.requestPort = function() {
    const filters = [
      { 'vendorId': 0x2341, 'productId': 0x8036 },
      { 'vendorId': 0x2341, 'productId': 0x8037 }, // Arduino LLC (9025),
      { 'vendorId': 0x2a03, 'productId': 0x8040 }, // Arduino LLC (10755), Leonardo ETH (32832)
    ];
    return navigator.usb.requestDevice({}).then(
      device => new serial.Port(device)
    );
  }

  serial.Port = function(device) {
    this.device_ = device;
  };

  serial.Port.prototype.connect = function() {
    let readLoop = () => {

      this.device_.transferIn(5, 64).then(result => {
        this.onReceive(result.data);
        let view = new Uint8Array(3);
        view[0] = 255;
        view[1] = 125;
        view[2] = 75;
        this.send(view);
        readLoop();
      }, error => {
        this.onReceiveError(error);
      });
    };

    return this.device_.open()
      .then(() => {
        if (this.device_.configuration === null) {
          return this.device_.selectConfiguration(1);
        }
      })
      .then(() => this.device_.claimInterface(2))
      .then(() => this.device_.controlTransferOut({
        'requestType': 'class',
        'recipient': 'interface',
        'request': 0x22,
        'value': 0x01,
        'index': 0x02
      }))
      .then(() => {
        readLoop();
      });
  };

  serial.Port.prototype.disconnect = function() {
    return this.device_.controlTransferOut({
        'requestType': 'class',
        'recipient': 'interface',
        'request': 0x22,
        'value': 0x00,
        'index': 0x02
      })
      .then(() => this.device_.close());
  };

  serial.Port.prototype.send = function(data) {
    return this.device_.transferOut(4, data);
  };
})();
