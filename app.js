// Only accepts default Apache/Nginx log format at the moment
// http://httpd.apache.org/docs/2.2/logs.html#common
// Tested with up to 200MB log files
// Runs at ~10MB/s in Chrome on 2.4Ghz C2D

// Store complete log information globally for later access
var logTable = [];

// Current tables, based on selected section of the log
// Will be useful for later features
var hostTable       = [];
var requestTable    = [];
var pageTable       = [];
var refTable        = [];
var trafficTable    = [];
var errorTable      = [];
var refDomainsTable = [];

/**
 * Display file input for those who don't want to use drag and drop
 */
function showFileInput() {
    document.getElementById('fileinput').style.display = 'block';
}

/**
 * Handle the drop event. Stops the browser from just loading the file's 
 * contents and instead allows us to process the data. Also mimcs the 
 * system's copy action, which usually changes the cursor to indicate 
 * that it's a copy.
 *
 * @param  evt  The drag over event that triggered the event listener
 */
function handleDragOver(evt) {
    evt.stopPropagation(); // Stop further propogation in DOM
    evt.preventDefault(); // Cancels the event
    evt.dataTransfer.dropEffect = 'copy'; // Make it apparent that it's a copy
}

/**
 * Main function for the script. Reads the file and validates its 
 * first couple lines. If valid, it splits the file and populates 
 * the log table. It then calls the functions necessary to 
 * rank the data and add the charts and tables to the page.
 *
 * @param  evt  The drop event that triggered the event listener
 */
function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    // Check that we have access to the necessary APIs
    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        alert('The File APIs necessary for this app are not supported by your browser.');
        return;
    }

    // Get file
    var files = document.getElementById('fileinput').files;
    if (!files.length) {
        var file = evt.dataTransfer.files[0]; 
    } else {
        var file = files[0];
    }

    // Output File Info
    document.getElementById('uploadbox').innerHTML = 
        '<strong>Analyzing: </strong>' + escape(file.name)+ ' - ' + 
        file.size + ' bytes';

    // Create new FileReader, and handle when done reading
    var reader = new FileReader();
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) { // Check the ready state

            // Only read if log file looks valid, otherwise return and refresh
            if (!isValidLogInput(evt.target.result.slice(0, 1000))) {
                document.getElementById('uploadbox').innerHTML += 
                    '<br /><br /><strong>Error: </strong>File input not a valid log. This page will ' +
                    'refresh automatically in 5 seconds. Please try again.';
                setTimeout('location.reload(true);',5000);
                return;
            }

            // Split on new line, manipulate, and store in logTable
            populateLogTable(evt.target.result.split(/[\n]+/));

            var n = 100;
            hostTable       = buildHostTable(n);
            requestTable    = buildRequestTable(n);
            pageTable       = buildPageTable(n);
            refTable        = buildRefTable(n);
            errorTable      = buildErrorTable(n);
            trafficTable    = buildTrafficTable();
            requestTable    = buildRequestTable(n);
            refDomainsTable = buildRefDomainsTable(n);

            setupPage();
        }
    };

    reader.readAsText(file);
}

/**
 * Uses regex to try to match the first couple lines of the 
 * log file. If it does, then we say it's a valid log. Or at 
 * least, those two lines are in Common Log Format. We don't 
 * try to process the whole log with regex for validation 
 * as it would take far too long running in a browser.
 *
 * @param   logSegment  Sample of the log file
 * @return  boolean     True if its valid, false otherwise
 */
function isValidLogInput(logSegment) {
    // We check the second in case the first one got 
    // cut from trimming
    logSegment = logSegment.split(/[\r\n|\n]+/);
    var regExp = /^\S+ \S+ \S+ \[[^\]]+\] "[^"]*" \d+ \d+ "[^"]*" "[^"]*"/m;

    if ((logSegment[0].search(regExp) == -1) && 
        (logSegment[1].search(regExp) == -1)) {
        return false;
    }

    return true;
}

/**
 * Builds the logTable array of "associative" arrays. We then extract the host, 
 * date, request, status, bytes transferred, and referrer. 
 *
 * @param  tempFileData  An array of strings containing the lines of the log
 */
function populateLogTable(tempFileData) {
    var startPos = 0, 
        endPos   = 0;

    for (var i = 0; i < tempFileData.length; i++) {
        // RegEx was too slow, so we're losing simplicity in favour of performance
        // Table with: Host, date, requests, http status, bytes transferred, and ref
        logTable[i] = {};

        // Match Host
        endPos = tempFileData[i].indexOf(' -');
        logTable[i]['host'] = tempFileData[i].substring(0,endPos);

        // Match date with format: dd/MMM/y
        startPos = tempFileData[i].indexOf('[', endPos) + 1;
        endPos = tempFileData[i].indexOf(' ', startPos);
        logTable[i]['date'] = tempFileData[i].substring(startPos,endPos-9);
        
        // Match requests
        startPos = tempFileData[i].indexOf('/', endPos);
        endPos = tempFileData[i].indexOf(' ', startPos);
        logTable[i]['request'] = tempFileData[i].substring(startPos,endPos);

        // Match http status
        startPos = tempFileData[i].indexOf('" ', endPos) + 2;
        endPos = startPos + 3;
        logTable[i]['status'] = tempFileData[i].substring(startPos,endPos);

        // Match bytes
        startPos = endPos + 1;
        endPos = tempFileData[i].indexOf(' ', startPos);
        logTable[i]['bytes'] = tempFileData[i].substring(startPos,endPos);

        // Match ref
        startPos = tempFileData[i].indexOf('"', endPos) + 1;
        endPos = tempFileData[i].indexOf('"', startPos);
        logTable[i]['ref'] = tempFileData[i].substring(startPos,endPos);

        // Match user_agent info
        startPos = tempFileData[i].indexOf('"', endPos + 1) + 1;
        endPos = tempFileData[i].indexOf('"', startPos);
        logTable[i]['userAgent'] = tempFileData[i].substring(startPos,endPos);
    }
}

/**
 * Builds a two dimensional array containing the number of hits 
 * and total bandwidth transferred in MB per day
 *
 * @param   string  The column of the log table to match against
 * @param   string  The string to match against the column
 * @return  array   Contains the hit count and bandwidth for each day
 */
function buildTrafficTable(column, match) {
    var trafficHash = {};
    var megaByte = 1024 * 1024;
    
    for (var i = 0; i < logTable.length; i++) {
        // filter out hits that don't match our criteria
        if (typeof column !== 'undefined' && 
            typeof match !== 'undefined' && 
            logTable[i][column] != match)
                continue;

        var date = Date.parse(logTable[i]['date'])
        if (isNaN(date) == false) {
            // Increment traffic
            if (typeof trafficHash[logTable[i]['date']] === 'undefined') {
                trafficHash[logTable[i]['date']] = [date, 1, parseInt(logTable[i]['bytes'])];
            } else {
                trafficHash[logTable[i]['date']][1]++;
                trafficHash[logTable[i]['date']][2] += parseInt(logTable[i]['bytes']);
            }
        }
    }

    var outputTable = [];
    for (var key in trafficHash) {
        outputTable.push([trafficHash[key][0],key, trafficHash[key][1], 
            (trafficHash[key][2] / megaByte).toFixed(2)]);
    }

    return outputTable.sort();
}

/**
 * Builds the hostTable, in which each row corresponds to a host and 
 * its number of requests. The table is N in size and is in 
 * descending order.
 *
 * @param   n       Number of top rows to include
 * @param   string  The column of the log table to match against
 * @param   string  The string to match against the column
 * @return  array   The host table
 */
function buildHostTable(n, column, match) {
    var hostHash = {};
    
    for (var i = 0; i < logTable.length; i++) {

        // filter out hosts that don't match our criteria
        if (typeof column !== 'undefined' && 
            typeof match !== 'undefined' && 
            logTable[i][column] != match)
                continue;

        // Increment host frequency
        if (typeof hostHash[logTable[i]['host']] === 'undefined') {
            hostHash[logTable[i]['host']] = 1;
        } else {
            hostHash[logTable[i]['host']]++;
        }
    }

    return getTopNFromHash(hostHash,n);
}

/**
 * Builds a requests table, in which each row corresponds to a request url 
 * and the number of occurences. The table is N in size and is in 
 * descending order. If the host is given, then only matches those requests
 * made by that host.
 *
 * @param   n      Number of top rows to include
 * @param   host   Host to filter requests by
 * @return  array  The request table
 */
function buildRequestTable(n, host) {
    var requestsHash = {};
    var match = true;
    
    for (var i = 0; i < logTable.length; i++) {

        // filter out requests that don't match our host, if given
        if (typeof host !== 'undefined' && logTable[i]['host'] != host)
            continue;
            
        // Increment requests frequency
        if (typeof requestsHash[logTable[i]['request']] === 'undefined') {
            requestsHash[logTable[i]['request']] = 1;
        } else {
            requestsHash[logTable[i]['request']]++;
        }
    }

    return getTopNFromHash(requestsHash,n);
}

/**
 * Builds the pageTable, in which each row corresponds to a page and 
 * its number of requests. Each request is checked against a 
 * list of common media extensions to ensure that it's indeed 
 * a page. The table is N in size and is in descending order.
 * If the host is given, then only matches those pages requested 
 * by that host.
 *
 * @param   n      Number of top rows to include
 * @param   host   Host to filter pages by
 * @return  array  The pages table
 */
function buildPageTable(n, host) {
    // Helper for ignoring common media file extensions
    function isNotMedia(url) {
        extensions = [
            'jpg', 'jpeg', 'pdf', 'mp3', 'rar',
            'exe', 'wmv',  'doc', 'avi', 'ppt',
            'mpg', 'mpeg', 'tif', 'wav', 'psd',
            'txt', 'bmp',  'css', 'js',  'png',
            'gif', 'swf',  'dmg', 'flv', 'gz'
        ];
        for (var i = 0; i < extensions.length; i++) {
            if (url.indexOf('.' + extensions[i]) != -1) {
                return false;
            }  
        }
        return true;
    }

    var pageHash = {};
    
    for (var i = 0; i < logTable.length; i++) {
        // filter out requests that don't match our host, if given
        if (typeof host !== 'undefined' && logTable[i]['host'] != host)
            continue;

        if (isNotMedia(logTable[i]['request'])) {
            // Increment requests frequency
            if (typeof pageHash[logTable[i]['request']] === 'undefined') {
                pageHash[logTable[i]['request']] = 1;
            } else {
                pageHash[logTable[i]['request']]++;
            }
        }
    }

    delete pageHash[''];

    return getTopNFromHash(pageHash,n);
}


/**
 * Builds the refTable, in which each row corresponds to a referrer and 
 * its number of requests. The table is N in size and is in 
 * descending order. We remove blank referrers from the results.
 *
 * @param  n  Number of top rows to include
 */
function buildRefTable(n) {
    var refHash = {};
    
    for (var i = 0; i < logTable.length; i++) {
        // Increment ref frequency
        if (typeof refHash[logTable[i]['ref']] === 'undefined') {
            refHash[logTable[i]['ref']] = 1;
        } else {
            refHash[logTable[i]['ref']]++;
        }
    }

    delete refHash['-'];
    delete refHash[''];

    return getTopNFromHash(refHash,n);
}

/**
 * Builds the errorTable, in which each row corresponds to a 404 and 
 * its number of requests. The table is N in size and is in 
 * descending order.
 *
 * @param  n  Number of top rows to include
 */
function buildErrorTable(n) {
    var errorHash = {};
    
    for (var i = 0; i < logTable.length; i++) {
        // Increment error frequency
        if (logTable[i]['status'] ==  '404') {
            if (typeof errorHash[logTable[i]['request']] === 'undefined') {
                errorHash[logTable[i]['request']] = 1;
            } else {
                errorHash[logTable[i]['request']]++;
            }
        }
    }

    return getTopNFromHash(errorHash,n);
}

/**
 * Builds the refDomainsTable, in which each row corresponds to an 
 * external referring domain and its number of requests. The table 
 * is N in size and is in descending order. We drop the top result 
 * as we assume its the log owner's domain.
 *
 * @param  n  Number of top rows to include
 */
function buildRefDomainsTable(n) {
    var refDomainsHash = {};
    
    for (var i = 0; i < logTable.length; i++) {
        var refDomain = logTable[i]['ref'];

        refDomain = refDomain.replace('http://',  '');
        refDomain = refDomain.replace('https://', '');
        refDomain = refDomain.replace('www.',     '');

        var endPos = refDomain.indexOf('/');
        var refDomain = refDomain.substring(0,endPos).toLowerCase();

        // Increment ref domain frequency
        if (typeof refDomainsHash[refDomain] === 'undefined') {
            refDomainsHash[refDomain] = 1;
        } else {
            refDomainsHash[refDomain]++;
        }
    }

    delete refDomainsHash['-'];
    delete refDomainsHash[''];

    // Assume top result is your domain, and we only want external
    var outputTable = getTopNFromHash(refDomainsHash,n+1);
    outputTable.shift();

    return outputTable;
}

/**
 * Pushes the key/val pairs from a hash into an array and
 * sorts it by its value. It then trims the results to be 
 * less than or equal to n in size.
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
    return array.filter(function(){return true});
}

/**
 * Returns the first 10 elements of a sorted array.
 *
 * @param   array  The sorted array to extract the values from
 * @return  array  The first ten rows of the sorted array
 */
function getTopTenValues(array) {
    // Extract top 10 values for bar graphs
    // from sorted data
    var topTen = [];
    for (var i = 0; i < 10; i++) {
        topTen[i] = array[i][1];
    }
    return topTen;
}

/**
 * Creates a string containing the necessary HTML for the tables 
 * that we generate containing the top N (100) results.
 *
 * @param   array   The sorted array to extract the values from
 * @param   colOne  Table heading for keys
 * @param   colTwo  Table heading for the values
 * @return  string  The table's HTML
 */
function buildTableHtml(array, colOne, colTwo) {
    var tableHtml = '<table><tr><th class="rank">Rank</th>' +
                    '<th class="colone">' + colOne + '</th>' +
                    '<th class="coltwo">' + colTwo + '</th></tr>';
    for (var i = 0; i < array.length; i++) {
        var rank = i +1;
        tableHtml += '<tr><td>' + rank + '</td>' +
                    '<td>' + array[i][0] + '</td>' +
                    '<td>' + array[i][1] + '</td>' +
                    '</tr>\n';
    }
    tableHtml += '</table>';

    return tableHtml;
}

/**
 * Generates overlay with additional information when 
 * a table row is clicked.
 *
 * @param  evt  The click event that triggered the listener
 */
function processOverlay(evt) {
    var overlay = document.createElement('div');
    overlay.setAttribute('id', 'overlay');
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);

    var popup = document.createElement('div');
    popup.setAttribute('id', 'popup');
    overlay.appendChild(popup);

    var query = this.getElementsByTagName('td')[1].innerHTML;

    // Get section id, ie: <div id="hosts">
    var section = this.parentNode.parentNode.parentNode.parentNode.parentNode.id;

    // Render data for hosts, including:
    // User Agent, Top Requests, and Top Pages
    if (section == 'hosts') {
        // Look for a first occurence of user-agent
        // Assume it doesn't change often enough 
        // to warrant listing multiple
        var userAgent = '';
        for (var i = 0; i < logTable.length; i++) {
            if (logTable[i]['host'] == query && logTable[i]['userAgent'] != '') {
                userAgent = logTable[i]['userAgent'];
                break;
            }
        }

        // Generate a list of the most common requests by that host
        var topRequests = "";
        topRequests = '<div class="table left">' + 
                      buildTableHtml(buildRequestTable(1000, query), 'Request', 'Hits') +
                      '</div>';

        // Generate a list of the most common pages requested by that host
        var topPages = "";
        topPages = '<div class="table right">' + 
                   buildTableHtml(buildPageTable(1000, query), 'Page', 'Hits') +
                   '</div>';

        popup.innerHTML = '<p><strong>Host:</strong> ' + query + '</p>' +
                          '<p><strong>User Agent:</strong> ' + userAgent + '</p>' +
                          topRequests + topPages + '<div class="cl"></div>';

    }

    // TODO: Figure out what information we'd like to display
    // for a referring domain. Ie: Page Rank, most common 
    // referring pages, traffic from that website, etc
    else if (section == 'refdomains') {
        popup.innerHTML = 'Coming Soon';
    }

    // Render data for all other sections, including:
    // Traffic line chart, and Top Requesting Hosts
    else {
        var sectionInfo = {
            'requests' : {columnName : 'request', htmlTitle : 'Request' },
            'pages'    : {columnName : 'request', htmlTitle : 'Page'    },
            'ref'      : {columnName : 'ref',     htmlTitle : 'Referrer'},
            'errors'   : {columnName : 'request', htmlTitle : 'Error'   }
        }

        // Generate a list of the most common hosts
        var topHosts = "";
        topHosts = '<div class="table right">' + 
                   buildTableHtml(
                       buildHostTable(1000, sectionInfo[section]['columnName'], query), 
                       'Host', 'Hits'
                   ) + '</div>';

        popup.innerHTML = '<p><strong>' + sectionInfo[section]['htmlTitle'] + 
                          ':</strong> ' + query + '</p>' + topHosts;

        drawLineChart(
            '#popup',
            buildTrafficTable(sectionInfo[section]['columnName'], query)
        );

        popup.innerHTML += '<div class="cl"></div>';
    }

    popup.innerHTML += '<br /><a id="close">Click to Close</a>' +
    '<div class="cl"></div>';

    var close = popup.getElementsByTagName('a')[0];
    close.addEventListener('click', removeOverlay, false);
}

/**
 * Removes the overlay element from the document body, 
 * restoring the previous screen. Also re-enables the 
 * page's scrollbar.
 *
 * @param  evt  The click event that triggered the listener
 */
function removeOverlay(evt) {
    document.body.style.overflow = 'visible';
    document.body.removeChild(document.getElementById('overlay'));
}

/**
 * Adds the generated tables and bar charts to the page.
 */
function setupPage() {
    var div = document.getElementById('traffic');
    div.style.display = 'block';
    drawTrafficLineChart('#traffic', trafficTable);

    // Next all the barcharts and tables
    // Format: div id, table var, col1 of table, col2 of table
    var barChartInfo = [
        ['hosts',       hostTable,        'Host'],
        ['requests',    requestTable,     'Request'],
        ['pages',       pageTable,        'Page'],
        ['ref',         refTable,         'Referrer'],
        ['refdomains',  refDomainsTable,  'Domain'],
        ['errors',      errorTable,       'Request']
    ];

    // Loop through each barChartInfo element
    // and display the div, build the bar chart, and the table
    for (var i = 0; i < barChartInfo.length; i++) {
        div = document.getElementById(barChartInfo[i][0]);
        div.style.display = 'block';
        div.getElementsByClassName('container')[0]
            .getElementsByClassName('table')[0]
            .innerHTML = buildTableHtml(
                barChartInfo[i][1], 
                barChartInfo[i][2], 
                'Hits');
        drawBarChart('#' + barChartInfo[i][0], getTopTenValues(barChartInfo[i][1]));

        // Get list of table rows to add event listeners to
        var links = div.getElementsByClassName('container')[0]
                        .getElementsByClassName('table')[0]
                        .getElementsByTagName('tr');

        // Add event listeners, but skip the row containing the table head
        for (var j = 1; j < links.length; j++) {
            links[j].addEventListener('click', processOverlay, false);
        }
    }
}

/**
 * Creates an SVG-based line chart with d3.js and appends it 
 * to a div. Generates a single y axis and line.
 *
 * @param  string  The ID of the div to append the SVG
 * @param  array   3 by n table. Columns are index, date, 
 *                 and requests.
 */
function drawLineChart(container, array) {
    // TODO: Make it an interactie graph s.t. on mouseover,
    // we can see the x-axis value (date)
    var margin = {top: 20, right: 0, bottom: 30, left: 40};
    var width = 320;
    var height = 208;

    var lineChart = d3.select(container).append('svg')
        .attr('class', 'lineChart interactive')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Date is formatted as dd/MMM/y
    var parseDate = d3.time.format('%d/%b/%Y').parse;

    var x = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left');

    var line = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.requests); });

    var data = array.map(function(d) {
        return {
            date: parseDate(d[1]),
            requests: d[2]
        }; 
    });

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain(d3.extent(data, function(d) { return d.requests; }));

    lineChart.append('g')
        .attr('class', 'y axis')
        .call(yAxis)
        .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 14)
            .style('text-anchor', 'end')
            .text('Requests');

    lineChart.append('path')
        .datum(data)
        .attr('class', 'line')
        .attr('d', line);
}

/**
 * Creates an SVG-based barChart with d3.js and appends it 
 * to a div. Based on the documentation for the library:
 * http://mbostock.github.com/d3/tutorial/bar-1.html
 *
 * @param  container  The ID of the div to append the SVG
 * @param  data       An array with 10 elements
 */
function drawBarChart(container, data) {
    var width = 384;
    var height = 240;
    var numTicks = 8;

    var x = d3.scale.linear()
        .domain([0, d3.max(data)])
        .range([0, width - 24]);

    var y = d3.scale.ordinal()
        .domain(data)
        .rangeBands([0, height - 40]);

    var barChart = d3.select(container).append('svg')
        .attr('class', 'barChart')
        .attr('width', width)
        .attr('height', height)
        .append('g')
            .attr('transform', 'translate(10,15)');

    barChart.selectAll('line')
        .data(x.ticks(numTicks))
        .enter()
        .append('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', 0)
            .attr('y2', height - 40)
            .style('stroke', '#595959');

    barChart.selectAll('.rule')
        .data(x.ticks(numTicks))
        .enter()
        .append('text')
            .attr('class', 'rule')
            .attr('x', x)
            .attr('y', 0)
            .attr('dy', height - 28)
            .attr('text-anchor', 'middle')
            .text(String);

    // Draw rectangles, forcing a bar to display 
    // even if it would barely be visible
    barChart.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
            .attr('y', y)
            .attr('width', 
                function(d) {
                    if (x(d) > 3)
                        return x(d);
                    else
                        return 3;
                })
            .attr('height', y.rangeBand());

    // Draw hits within bars, but don't display 
    // hits if the bar is too short
    barChart.selectAll('.bar')
        .data(data)
        .enter()
        .append('text')
            .attr('class', 'bar')
            .attr('x', function(d) { 
                    if (x(d) > 30)
                        return x(d) - 4;
                    else
                        return x(d) - 200;
                })
            .attr('y', 
                function(d) { 
                    return y(d) + y.rangeBand() / 2 + 4;
                })
            .attr('text-anchor', 'end')
            .text(String);

    barChart.append('line')
        .attr('y1', 0)
        .attr('y2', height-40)
        .style('stroke', '#2e3031');
}

/**
 * Creates an SVG-based line chart with d3.js and appends it 
 * to a div. Generates two y axis, with two lines: one for 
 * requests per day, and one for bandwidth per day.
 *
 * @param  string  The ID of the div to append the SVG
 * @param  array   4 by n table. Columns are index, date, 
 *                 requests, bandwidth.
 */
function drawTrafficLineChart(container, array) {
    var margin = {top: 20, right: 20, bottom: 30, left: 40};
    var width = 680;
    var height = 200;

    var lineChart = d3.select(container).append('svg')
        .attr('class', 'lineChart')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Date is formatted as dd/MMM/y
    var parseDate = d3.time.format('%d/%b/%Y').parse;

    var x = d3.time.scale().range([0, width]);
    var y1 = d3.scale.linear().range([height, 0]);
    var y2 = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');

    var y1Axis = d3.svg.axis()
        .scale(y1)
        .orient('left');

    var y2Axis = d3.svg.axis()
        .scale(y2)
        .orient('right');

    var rLine = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y1(d.requests); });

    var bLine = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y2(d.bandwidth); });

    var data = array.map(function(d) {
        return {
            date: parseDate(d[1]),
            requests: d[2],
            bandwidth: d[3]
        }; 
    });

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y1.domain(d3.extent(data, function(d) { return d.requests; }));
    y2.domain(d3.extent(data, function(d) { return d.bandwidth; }));

    lineChart.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    lineChart.append('g')
        .attr('class', 'y axis')
        .call(y1Axis)
        .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 14)
            .style('text-anchor', 'end')
            .text('Requests');

    lineChart.append('g')
        .attr('class', 'y2 axis')
        .attr('transform', 'translate(' + width + ',0)')
        .call(y2Axis)
        .append('text')
            .attr('y', -7)
            .attr('transform', 'rotate(-90)')
            .style('text-anchor', 'end')
            .text('Bandwidth (MB)');

    lineChart.append('path')
        .datum(data)
        .attr('class', 'bLine')
        .attr('d', bLine);

    lineChart.append('path')
        .datum(data)
        .attr('class', 'rLine')
        .attr('d', rLine);

    // Add the legend for the two lines
    lineChart.append('svg:rect')
        .attr('fill', '#43bf60' )
        .attr('x', width - 120)
        .attr('y', 0)
        .attr('width', 14)
        .attr('height', 14);

    lineChart.append('svg:text')
        .attr('x', width - 100)
        .attr('y', 10)
        .text('Requests');

    lineChart.append('svg:rect')
        .attr('fill', '#595959' )
        .attr('x', width - 120)
        .attr('y', 30)
        .attr('width', 14)
        .attr('height', 14);

    lineChart.append('svg:text')
        .attr('x', width - 100)
        .attr('y', 40)
        .text('Bandwidth');
}

// Add the listeners
var uploadBox = document.getElementById('uploadbox');
uploadBox.addEventListener('dragover', handleDragOver, false);
uploadBox.addEventListener('drop', handleFileSelect, false);

var showFileInputLink = document.getElementById('showfileinput');
showFileInputLink.addEventListener('click', showFileInput, false);

var fileInput = document.getElementById('fileinput');
fileInput.addEventListener('change', handleFileSelect, false);