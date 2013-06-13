/**
 * Given the file contents of an Apache/Nginx log, parses the log data
 */

function Log(logFile) {
  // Table with: host, date, request, status (http status), bytes (transferred), 
  // referrer and userAgent. Example access: logTable[1]['request']
  this.logTable    = [];

  // Parsed info, based on current selection of the log
  this.hosts       = [];
  this.requests    = [];
  this.pages       = [];
  this.referrers   = [];
  this.traffic     = [];
  this.errors      = [];
  this.refDomains  = [];

  /**
   * Pushes the key/val pairs from a hash into an array and sorts it by its value. 
   * It then trims the results to be less than or equal to n in size.
   *
   * @param  array  The hash to manipulate
   * @param  n      Number of top rows to include
   */
  function getTopNFromHash(hash, n) {
    // Assign top N from Hash to array
    var array = [];
    for (var key in hash) {
      array.push([key, hash[key]]);
    }

    // Sort on frequency, in descending order
    array.sort(function (a, b) {
      return b[1] - a[1];
    });

    // Keep top n or less and return
    array.length = n;

    return array.filter(function(){
      return true;
    });
  }

  /**
   * Builds the logTable array of hashes. We extract the host, date, request, 
   * status, bytes transferred, and referrer and store in the logTable.
   * Then calls functions to parse the logTable itself.
   */
  this.parse = function () {
    var startPos = 0;
    var endPos   = 0;

    // Split log file on new line
    var logEntries = logFile.split(/[\n]+/);

    for (var i = 0; i < logEntries.length; i++) {
      // Ignore blank lines
      if(!logEntries[i])
        continue;

      // RegEx is too slow for this, so we trade simplicity for performance
      this.logTable[i] = {};
      line = logEntries[i];

      // Match Host
      endPos = line.indexOf(' ');
      this.logTable[i]['host'] = line.substring(0, endPos);

      // Match date with format: dd/MMM/y
      // If we see a hyphen at the given index, we know identd and userid were n/a
      if (line.charAt(endPos + 3) === '-')
        startPos = endPos + 6;
      else
        startPos = line.indexOf('[', endPos) + 1;

      // For endPos, assume default strftime
      // TODO: Parse first line of log to determine strftime format in advance
      endPos = line.indexOf(' ', startPos + 16);
      this.logTable[i]['date'] = line.substring(startPos, endPos-9);

      // Match requests
      startPos = line.indexOf('/', endPos);
      endPos = line.indexOf(' ', startPos);
      this.logTable[i]['request'] = line.substring(startPos, endPos);

      // Match http status
      startPos = line.indexOf('" ', endPos) + 2;
      endPos = startPos + 3;
      this.logTable[i]['status'] = line.substring(startPos, endPos);

      // Match bytes
      startPos = endPos + 1;
      endPos = line.indexOf(' ', startPos);
      this.logTable[i]['bytes'] = line.substring(startPos, endPos);

      // Match ref
      startPos = line.indexOf('"', endPos) + 1;
      endPos = line.indexOf('"', startPos);
      this.logTable[i]['referrer'] = line.substring(startPos, endPos);

      // Match user_agent info
      startPos = line.indexOf('"', endPos + 1) + 1;
      endPos = line.indexOf('"', startPos);
      this.logTable[i]['userAgent'] = line.substring(startPos, endPos);
    }

    // Build individual tables; store top 100 for each
    var n = 100;
    this.hosts       = this.parseHosts(n);
    this.requests    = this.parseRequests(n);
    this.pages       = this.parsePages(n);
    this.referrers   = this.parseReferrers(n);
    this.errors      = this.parseErrors(n);
    this.traffic     = this.parseTraffic();
    this.requests    = this.parseRequests(n);
    this.refDomains  = this.parseRefDomains(n);
  };

  /**
   * Builds a sorted two dimensional array containing the number of hits and total 
   * bandwidth transferred in MB per day. Also takes arguments for filtering the 
   * traffic based on a matching criteria.
   *
   * @param   column  The column of the log table to match against
   * @param   match   The string for which to check equality
   * @return  array   Table with columns: [int date, string date, hits, bandwidth]
   */
  this.parseTraffic = function(column, match) {
    var traffic = {};
    var megaByte = 1024 * 1024;
    var bytesTransferred = 0;

    for (var i = 0; i < this.logTable.length; i++) {
      // Filter out hits that don't match our criteria, if given
      if (!column && !match && this.logTable[i][column] != match)
          continue;

      var date = Date.parse(this.logTable[i]['date']);
      if (!isNaN(date)) {
        bytesTransferred = parseInt(this.logTable[i]['bytes'], 10);
        // Increment traffic
        if (!traffic[this.logTable[i]['date']]) {
          traffic[this.logTable[i]['date']] = [date, 1, bytesTransferred];
        } else {
          traffic[this.logTable[i]['date']][1]++;
          traffic[this.logTable[i]['date']][2] += bytesTransferred;
        }
      }
    }

    // traffic[key][0] is the date stored as the number of seconds since 
    // January 1, 1970. So we can sort on that column.
    var output = [];
    for (var key in traffic) {
      output.push([
        traffic[key][0], key, traffic[key][1],
        (traffic[key][2] / megaByte).toFixed(2)
      ]);
    }

    return output.sort();
  };

  /**
   * Builds the hostTable, in which each row corresponds to a host and its number 
   * of requests. The table is n in size and is in descending order.
   *
   * @param   n       Number of top rows to include
   * @param   column  The column of the log table to match against
   * @param   match   The string for which to check equality
   * @return  array   Table with columns [host, hits]
   */
  this.parseHosts = function(n, column, match) {
    var hosts = {};

    for (var i = 0; i < this.logTable.length; i++) {
      // filter out hosts that don't match our criteria
      if (!column && !match && this.logTable[i][column] != match)
          continue;

      // Increment host frequency
      if (!hosts[this.logTable[i]['host']])
        hosts[this.logTable[i]['host']] = 1;
      else
        hosts[this.logTable[i]['host']]++;
    }

    return getTopNFromHash(hosts, n);
  };

  /**
   * Builds a sorted requests table, in which each row contains the request url and 
   * the number of occurences. The table is N in size and is in descending order. 
   * If host is given, then only matches those requests made by that host.
   *
   * @param   n      Number of top rows to include
   * @param   host   Host to filter requests by
   * @return  array  Table with columns [host, hits]
   */
  this.parseRequests = function(n, host) {
    var requests = {};
    var match = true;

    for (var i = 0; i < this.logTable.length; i++) {
      // filter out requests that don't match our host, if given
      if (host && this.logTable[i]['host'] != host)
        continue;

      // Increment requests frequency
      if (!requests[this.logTable[i]['request']])
        requests[this.logTable[i]['request']] = 1;
      else
        requests[this.logTable[i]['request']]++;
    }

    return getTopNFromHash(requests, n);
  };

  /**
   * Builds a sorted page table, in which each row corresponds to a page and its 
   * number of requests. Each request is checked against a list of common media 
   * extensions to ensure that it's indeed a page. The table is n in size and in 
   * descending order. If the host is given, then it only matches pages requested 
   * by that host.
   *
   * @param   n      Number of top rows to include
   * @param   host   Host to filter pages by
   * @return  array  Table with columns [page, hits]
   */
  this.parsePages = function(n, host) {
    // Helper for ignoring common media file extensions
    function isNotMedia(url) {
      extensions = [
        'jpg', 'jpeg', 'pdf', 'mp3', 'rar', 'exe', 'wmv',  'doc', 'avi', 'ppt',
        'mpg', 'mpeg', 'tif', 'wav', 'psd','txt', 'bmp',  'css', 'js',  'png',
        'gif', 'swf',  'dmg', 'flv', 'gz'
      ];
      for (var i = 0; i < extensions.length; i++) {
        if (url.indexOf('.' + extensions[i]) != -1)
          return false;
      }
      return true;
    }

    var pages = {};

    for (var i = 0; i < this.logTable.length; i++) {
      // filter out requests that don't match our host, if given
      if (host && this.logTable[i]['host'] != host)
        continue;

      if (isNotMedia(this.logTable[i]['request'])) {
        // Increment requests frequency
        if (!pages[this.logTable[i]['request']])
          pages[this.logTable[i]['request']] = 1;
        else
          pages[this.logTable[i]['request']]++;
      }
    }

    delete pages[''];

    return getTopNFromHash(pages, n);
  };


  /**
   * Builds a sorted ref table, in which each row corresponds to an http referrer 
   * and the number of requests originating from that location. The table is n in 
   * size and is in descending order. Ignores blank http referrers.
   *
   * @param   n      Number of top rows to include
   * @return  array  Table with columns [ref, hits]
   */
  this.parseReferrers = function(n) {
    var referrers = {};

    for (var i = 0; i < this.logTable.length; i++) {
      // Increment ref frequency
      if (!referrers[this.logTable[i]['referrer']])
        referrers[this.logTable[i]['referrer']] = 1;
      else
        referrers[this.logTable[i]['referrer']]++;
    }

    // Remove blank referrers from the results
    delete referrers['-'];
    delete referrers[''];

    return getTopNFromHash(referrers, n);
  };

  /**
   * Builds a sorted error table, in which each row corresponds to a 404 and its 
   * number of requests. The table is n in size and is in descending order.
   *
   * @param   n      Number of top rows to include
   * @return  array  Table with columns [request, hits]
   */
  this.parseErrors = function(n) {
    var errors = {};

    for (var i = 0; i < this.logTable.length; i++) {
      // Increment error frequency
      if (this.logTable[i]['status'] ==  '404') {
        if (!errors[this.logTable[i]['request']])
          errors[this.logTable[i]['request']] = 1;
        else
          errors[this.logTable[i]['request']]++;
      }
    }

    return getTopNFromHash(errors, n);
  };

  /**
   * Builds the referring domains table, in which each row corresponds to an 
   * external referring domain and its number of requests. The table is N in size 
   * and is in descending order.
   *
   * @param   n      Number of top rows to include
   * @return  array  Table with columns [ref, hits]
   */
  this.parseRefDomains = function(n) {
    var refDomains = {};

    for (var i = 0; i < this.logTable.length; i++) {
      var refDomain = this.logTable[i]['referrer'];

      refDomain = refDomain.replace('http://',  '');
      refDomain = refDomain.replace('https://', '');
      refDomain = refDomain.replace('www.',     '');

      var endPos = refDomain.indexOf('/');
      refDomain = refDomain.substring(0, endPos).toLowerCase();

      // Increment ref domain frequency
      if (!refDomains[refDomain])
        refDomains[refDomain] = 1;
      else
        refDomains[refDomain]++;
    }

    delete refDomains['-'];
    delete refDomains[''];

    // Assume top result is your domain, and we only want external
    var outputTable = getTopNFromHash(refDomains, n);

    return outputTable;
  };

}
