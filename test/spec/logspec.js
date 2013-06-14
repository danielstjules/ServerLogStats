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
        if (Fixtures.expectedEntries[i].date == '11/Feb/2012')
          bandwidth += parseInt(Fixtures.expectedEntries[i].bytes, 10);
      }
      var bandwidthInMB = ((bandwidth) / (1024 * 1024)).toFixed(2);

      var traffic = log.parseTraffic();
      expect(traffic[0].bandwidth).toEqual(bandwidthInMB);
    });

    it('counts each request as a hit for that day', function() {
      var hits = 0;
      for (var i = 0; i < Fixtures.expectedEntries.length; i++) {
        if (Fixtures.expectedEntries[i].date == '11/Feb/2012')
          hits += 1;
      }

      var traffic = log.parseTraffic();
      expect(traffic[0].hits).toEqual(hits);
    });

    it('can return only those that match a given property', function() {
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

  // Test parseHosts()
  describe('parseHosts()', function() {
    it('returns an array of hosts along with # of requests they made', function() {
      var hosts = log.parseHosts(100);
      // 00.000.000.00 should have 22 hits
      expect(hosts[0][1]).toEqual(22);
      expect(hosts.length).toEqual(7);
    });

    it('orders the hosts in descending order of hits', function() {
      var hosts = log.parseHosts(100);
      var requests = hosts[0][1];

      for (var i = 1; i < hosts.length; i++) {
        expect(hosts[i][1] <= requests).toBeTruthy();
        requests = hosts[i][1];
      }
    });

    it('can return only those that match a given property', function() {
      var hosts = log.parseHosts(100, 'date', '13/Feb/2012');
      var expected = [
        ['000.00.000.005', 2],
        ['00.000.000.004', 1]
      ];
      expect(hosts.length).toEqual(2);
      expect(hosts).toEqual(expected);
    });
  });

  // Test parseRequests
  describe('parseRequests()', function() {
    it('returns an array of requests along with # of hits', function() {
      var requests = log.parseRequests(100);
      // /robots.txt should have 5 hits
      expect(requests[0][1]).toEqual(5);
      expect(requests.length).toEqual(24);
    });

    it('orders the requests in descending order of hits', function() {
      var requests = log.parseRequests(100);
      var hits = requests[0][1];

      for (var i = 1; i < requests.length; i++) {
        expect(requests[i][1] <= hits).toBeTruthy();
        hits = requests[i][1];
      }
    });

    it('can return only those that match a given property', function() {
      var requests = log.parseRequests(100, 'date', '13/Feb/2012');
      var expected = [
        ['/robots.txt', 2],
        ['/', 1]
      ];
      expect(requests.length).toEqual(2);
      expect(requests).toEqual(expected);
    });
  });

  // Test parsePages
  describe('parsePages()', function() {
    it('ignores common media file extensions', function() {
      var pages = log.parsePages(100);
      // Only '/' and '/test.html' should be considered a page in Fixtures. All 
      // others are images, style sheets, or text files
      expect(pages.length).toEqual(2);
    });

    it('ignores queries and fragments in the URI', function() {
      var pages = log.parsePages(100);
      // '/test.html?order_by=name#downloads' should become '/test.html'
      expect(pages[1][0]).toEqual('/test.html');
    });

    it('returns an array of pages along with # of hits', function() {
      // '/'' has 3 hits
      var pages = log.parsePages(100);
      expect(pages[0][1]).toEqual(3);
    });

    it('orders the pages in descending order of hits', function() {
      var pages = log.parsePages(100);
      var hits = pages[0][1];

      for (var i = 1; i < pages.length; i++) {
        expect(pages[i][1] <= hits).toBeTruthy();
        hits = pages[i][1];
      }
    });

    it('can return only those that match a given property', function() {
      var pages = log.parsePages(100, 'date', '13/Feb/2012');
      var expected = [['/', 1]];
      expect(pages.length).toEqual(1);
      expect(pages).toEqual(expected);
    });
  });

});
