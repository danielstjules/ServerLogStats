describe('Log', function() {
  var log;

  beforeEach(function() {
    log = new Log(Fixtures.logFile);
    log.parse();
  });

  it('has a parse function defined', function() {
    expect(log.parse).toBeDefined();
  });

  it('has a parse function defined for each parsed log attribute', function() {
    expect(log.parseHosts).toBeDefined();
    expect(log.parseRequests).toBeDefined();
    expect(log.parsePages).toBeDefined();
    expect(log.parseReferrers).toBeDefined();
    expect(log.parseTraffic).toBeDefined();
    expect(log.parseErrors).toBeDefined();
    expect(log.parseRefDomains).toBeDefined();
  });

  // Test parse()
  describe('parse()', function() {
    it('should ignore blank lines', function() {
      log.parse();
      expect(log.logTable.length).toEqual(Fixtures.expectedEntries.length);
    });

    it('creates the expected logTable', function() {
      log.parse();
      expect(log.logTable).toEqual(Fixtures.expectedEntries);
    });

    it('fills the parsed log attributes', function() {
      log.parse();
      expect(log.hosts.length).toBeGreaterThan(0);
      expect(log.requests.length).toBeGreaterThan(0);
      expect(log.pages.length).toBeGreaterThan(0);
      expect(log.referrers.length).toBeGreaterThan(0);
      expect(log.traffic.length).toBeGreaterThan(0);
      expect(log.errors.length).toBeGreaterThan(0);
      expect(log.refDomains.length).toBeGreaterThan(0);
    });

    it('calls the various parse functions to fill those attributes', function() {
      log.parse();
      expect(log.hosts).toEqual(log.parseHosts(100));
      expect(log.requests).toEqual(log.parseRequests(100));
      expect(log.pages).toEqual(log.parsePages(100));
      expect(log.referrers).toEqual(log.parseReferrers(100));
      expect(log.traffic).toEqual(log.parseTraffic(100));
      expect(log.errors).toEqual(log.parseErrors(100));
      expect(log.refDomains).toEqual(log.parseRefDomains(100));
    });
  });

  // Test parseTraffic()
  describe('parseTraffic()', function() {
    it('returns an array of objects with: unixTime, date, hits, bandwidth', function() {
      var traffic = log.parseTraffic();

      expect(traffic[0].unixTime).toBeDefined();
      expect(traffic[0].date).toBeDefined();
      expect(traffic[0].hits).toBeDefined();
      expect(traffic[0].bandwidth).toBeDefined();
    });

    it('orders objects returned by their date', function() {
      var traffic = log.parseTraffic();
      var lastTime = 0;
      for (var i = 0; i < traffic.length; i++) {
        expect(traffic[i].unixTime).toBeGreaterThan(lastTime);
        lastTime = traffic[i].unixTime;
      }
    });

    it('returns bandwidth in MB', function() {
      var bandwidth = 0;
      for (var i = 0; i < Fixtures.expectedEntries.length; i++) {
        if (Fixtures.expectedEntries[i].date == "11/Feb/2012")
          bandwidth += parseInt(Fixtures.expectedEntries[i].bytes, 10);
      }
      var bandwidthInMB = ((bandwidth) / (1024 * 1024)).toFixed(2);

      var traffic = log.parseTraffic();
      expect(traffic[0].bandwidth).toEqual(bandwidthInMB);
    });

    it('counts each request as a hit for that day', function() {
      var hits = 0;
      for (var i = 0; i < Fixtures.expectedEntries.length; i++) {
        if (Fixtures.expectedEntries[i].date == "11/Feb/2012")
          hits += 1;
      }

      var traffic = log.parseTraffic();
      expect(traffic[0].hits).toEqual(hits);
    });

    it('should be able to restrict entries to those that match an IP', function() {
      // Match against those with host 000.00.000.005
      // That is, Fixtures.expectedEntries[27] and Fixtures.expectedEntries[28]
      var host = '000.00.000.005';
      var bandwidth = parseInt(Fixtures.expectedEntries[27]['bytes'], 10) +
        parseInt(Fixtures.expectedEntries[28]['bytes'], 10);
      var bandwidthInMB = ((bandwidth) / (1024 * 1024)).toFixed(2);

      var expected = [{ 'date': '13/Feb/2012', 'hits': 2, bandwidth: bandwidthInMB }];
      var traffic = log.parseTraffic('host', host);
      delete traffic[0].unixTime;

      expect(traffic.length).toEqual(1);
      expect(traffic).toEqual(expected);
    });
  });

});
