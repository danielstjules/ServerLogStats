describe('Log', function() {
  var log;

  beforeEach(function() {
    log = new Log(Fixtures.logFile);
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

});
