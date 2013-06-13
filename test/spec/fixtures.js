/**
 * Quick fixtures for testing that log parsing works. The example log data 
 * included is fictitious.
 * 
 * And unfortunately, I'll be ignoring line limits for this file
 */

var Fixtures = function() {

  // Here's the example log file's contents
  var logFile =
    '00.000.000.00 - - [11/Feb/2012:15:10:46 -0500] "GET / HTTP/1.1" 200 1588 "http://localhost" "Mozilla/4.0"\n' +
    '\n'+
    '00.000.000.00 - - [11/Feb/2012:15:10:46 -0500] "GET /assets/style.css HTTP/1.1" 200 2041 "http://localhost" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:46 -0500] "GET /js/jquery-1.3.2.min.js HTTP/1.1" 200 57254 "http://localhost" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/twitter.jpg HTTP/1.1" 200 2279 "http://localhost" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/contact.jpg HTTP/1.1" 200 2773 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/apic.jpg HTTP/1.1" 200 16859 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/email.jpg HTTP/1.1" 200 4679 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/anotherpic.jpg HTTP/1.1" 200 17131 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/linktosite.jpg HTTP/1.1" 200 20933 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/graphic.jpg HTTP/1.1" 200 20830 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/image.jpg HTTP/1.1" 200 20377 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/hotlink.jpg HTTP/1.1" 200 18419 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/header.jpg HTTP/1.1" 200 48980 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/topbar.jpg HTTP/1.1" 200 1610 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/blank.gif HTTP/1.1" 200 17098 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/bg.jpg HTTP/1.1" 200 25831 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/content.jpg HTTP/1.1" 200 17366 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/preview.jpg HTTP/1.1" 200 15071 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/screenshot.jpg HTTP/1.1" 200 49674 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:47 -0500] "GET /assets/temporary.jpg HTTP/1.1" 200 1458 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:48 -0500] "GET /assets/bottom.jpg HTTP/1.1" 200 55949 "http://localhost/" "Mozilla/4.0"\n' +
    '00.000.000.00 - - [11/Feb/2012:15:10:48 -0500] "GET /assets/favicon.ico HTTP/1.1" 200 1150 "-" "Mozilla/4.0"\n' +
    '00.00.00.01 - - [12/Feb/2012:15:48:19 -0500] "GET /robots.txt HTTP/1.0" 404 529\n' +
    '000.00.0.02 - - [12/Feb/2012:16:53:37 -0500] "GET /robots.txt HTTP/1.0" 404 169\n' +
    '000.00.0.02 - - [12/Feb/2012:16:53:39 -0500] "GET / HTTP/1.0" 200 3740\n' +
    '000.000.000.03 craig - [12/Feb/2012:17:58:48 -0500] "GET / HTTP/1.1" 200 3740 "-" "http://localhost/anotherurl"\n' +
    '00.000.000.004 - - [13/Feb/2012:18:13:02 -0500] "GET /robots.txt HTTP/1.1" 404 169 "-" "Mozilla/5.0"\n' +
    '000.00.000.005 - testuser [13/Feb/2012:18:16:55 -0500] "GET /robots.txt HTTP/1.1" 404 143 "-" "Mozilla/5.0 (compatible; randombot/1.0 )"\n' +
    '000.00.000.005 - testuser [13/Feb/2012:18:16:56 -0500] "GET / HTTP/1.1" 200 1588 "-" "Mozilla/5.0 (compatible; randombot/1.0 )"\n' +
    '00.000.000.006 - anotherperson [14/Feb/2012:19:32:45 -0500] "GET /robots.txt HTTP/1.1" 404 143 "-" "Mozilla/5.0"\n';

  // Here's how we expect the log to be parsed as
  expectedEntries = [
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/", "status":"200", "bytes":"1588", "referrer":"http://localhost", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/style.css", "status":"200", "bytes":"2041", "referrer":"http://localhost", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/js/jquery-1.3.2.min.js", "status":"200", "bytes":"57254", "referrer":"http://localhost", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/twitter.jpg", "status":"200", "bytes":"2279", "referrer":"http://localhost", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/contact.jpg", "status":"200", "bytes":"2773", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/apic.jpg", "status":"200", "bytes":"16859", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/email.jpg", "status":"200", "bytes":"4679", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/anotherpic.jpg", "status":"200", "bytes":"17131", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/linktosite.jpg", "status":"200", "bytes":"20933", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/graphic.jpg", "status":"200", "bytes":"20830", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/image.jpg", "status":"200", "bytes":"20377", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/hotlink.jpg", "status":"200", "bytes":"18419", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/header.jpg", "status":"200", "bytes":"48980", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/topbar.jpg", "status":"200", "bytes":"1610", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/blank.gif", "status":"200", "bytes":"17098", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/bg.jpg", "status":"200", "bytes":"25831", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/content.jpg", "status":"200", "bytes":"17366", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/preview.jpg", "status":"200", "bytes":"15071", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/screenshot.jpg", "status":"200", "bytes":"49674", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/temporary.jpg", "status":"200", "bytes":"1458", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/bottom.jpg", "status":"200", "bytes":"55949", "referrer":"http://localhost/", "userAgent":"Mozilla/4.0" },
    { "host":"00.000.000.00", "date":"11/Feb/2012", "request":"/assets/favicon.ico", "status":"200", "bytes":"1150", "referrer":"-", "userAgent":"Mozilla/4.0" },
    { "host":"00.00.00.01", "date":"12/Feb/2012", "request":"/robots.txt", "status":"404", "bytes":"529", "referrer":"", "userAgent":"" },
    { "host":"000.00.0.02", "date":"12/Feb/2012", "request":"/robots.txt", "status":"404", "bytes":"169", "referrer":"", "userAgent":"" },
    { "host":"000.00.0.02", "date":"12/Feb/2012", "request":"/", "status":"200", "bytes":"3740", "referrer":"", "userAgent":"" },
    { "host":"000.000.000.03", "date":"12/Feb/2012", "request":"/", "status":"200", "bytes":"3740", "referrer":"-", "userAgent":"http://localhost/anotherurl" },
    { "host":"00.000.000.004", "date":"13/Feb/2012", "request":"/robots.txt", "status":"404", "bytes":"169", "referrer":"-", "userAgent":"Mozilla/5.0" },
    { "host":"000.00.000.005", "date":"13/Feb/2012", "request":"/robots.txt", "status":"404", "bytes":"143", "referrer":"-", "userAgent":"Mozilla/5.0 (compatible; randombot/1.0 )" },
    { "host":"000.00.000.005", "date":"13/Feb/2012", "request":"/", "status":"200", "bytes":"1588", "referrer":"-", "userAgent":"Mozilla/5.0 (compatible; randombot/1.0 )" },
    { "host":"00.000.000.006", "date":"14/Feb/2012", "request":"/robots.txt", "status":"404", "bytes":"143", "referrer":"-", "userAgent":"Mozilla/5.0" }
  ];

 return {
    logFile: logFile,
    expectedEntries: expectedEntries
  };

}();
