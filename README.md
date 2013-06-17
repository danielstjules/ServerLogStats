ServerLogStats
==============

ServerLogStats is a Web App that uses JavaScript and HTML5's FileApi to process Apache/Nginx server logs.  This allows for log processing from within the browser, on the client-side, and without the logs and visitor information ever touching a server. It then generates charts and tables based on visitor info.

It's been built with the following libraries:
*  Zepto.js: the lightweight jQuery alternative
*  D3.js: for creating svg charts
*  Handlebars.js: for separating view from logic

As of right now, only the NCSA Common Log Format and Combined Log Format are supported. Using Regex on such large files from within a browser isn't viable, which is the reason for the limited format. The app has been tested on files of up to 200MB in size, and processes them at a rate of ~10MB/s using a 2.4Ghz Core 2 Duo MacBook Pro. You can see it in action at <http://serverlogstats.com/>

In addition, you can run our Jasmine test suite by going to <http://serverlogstats.com/test/SpecRunner.html>

![screenshot](http://serverlogstats.com/screenshot.jpg)

Licensing
---------

Licensed under the GPLv3. See LICENSE.txt for details.
