ServerLogStats
==============

A web app that uses javascript and HTML5's FileApi to generate graphs, charts and tables for apache/nginx server logs. This allows log processing from within the browser, without the logs and visitor information ever hiting a server. As of right now, only the Common Log Format is supported. Using Regex on such large files from within a browser isn't viable, so I'll have to come up with an intuitive way of accomodating other formats. The app has been tested on files of up to 200MB in size, and processes them at a rate of ~10MB/s. You can see it in action at <http://serverlogstats.com/>

![screenshot](http://serverlogstats.com/screenshot.gif)

Licensing
---------

Licensed under the GPLv3. See LICENSE.txt for details.