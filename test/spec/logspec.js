describe("Log", function() {
  var log;
  var parsedLog;

  beforeEach(function() {
    log = new Log(Fixtures.logFile);
    parsedLog = Fixtures.expectedEntries;
  });

  it("contains spec with an expectation", function() {
    expect(true).toBe(true);
  });
});
