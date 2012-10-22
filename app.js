// Only accepts default Apache/Nginx log format at the moment
// http://httpd.apache.org/docs/2.2/logs.html#common
// Tested with up to 200MB log files
// Runs at ~10MB/s in Chrome on 2.4Ghz C2D

// Store complete log information globally for later access
var logTable = [];
// Current tables, based on selected section of the log
var hostTable = [];
var requestTable = [];
var pageTable = [];
var refTable = [];
var trafficTable = [];
var errorTable = [];
var refDomainsTable = [];

/**
 * Display file input for those who don't want to use drag and drop
 */
function showFileInput() {
    document.getElementById('fileinput').style.display = "block";
}

/**
 * Handle the drop event. Stops the browser from just loading the file's 
 * contents and instead allows us to process the data. Also mimcs the 
 * system's copy action, which usually changes the cursor to indicate 
 * that it's a copy.
 *
 * @param  evt The dragover event that triggered the event listener
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
 * @param  evt The drop event that triggered the event listener
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
            if(!isValidLogInput(evt.target.result.slice(0, 1000))) {
                document.getElementById('uploadbox').innerHTML += 
                    '<br /><br /><strong>Error: </strong>File input not a valid log. This page will ' +
                    'refresh automatically in 5 seconds. Please try again.';
                setTimeout("location.reload(true);",5000);
                return;
            }

            // Split on new line, manipulate, and store in logTable
            populateLogTable(evt.target.result.split(/[\r\n|\n]+/));

            var n = 100;
            buildHostTable(n);
            buildRequestTable(n);
            buildPageTable(n);
            buildRefTable(n);
            buildErrorTable(n);
            buildTrafficTable();
            buildRequestTable(n);
            // Grab N+1 because we assume the top entry is their domain
            buildRefDomainsTable(n+1)

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
 * @param logSegment Sample of the log file
 * @return boolean True if its valid, false otherwise
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
 * Builds the logTable array of hashes. We then extract the host, date,
 * request, status, bytes transferred, and referrer. 
 *
 * @param tempFileData  An array of strings containing the lines of the log
 */
function populateLogTable(tempFileData) {
    var startPos = 0, 
        endPos   = 0;

    for(var i = 0; i < tempFileData.length; i++) {
        // RegEx was too slow, so we're losing simplicity in favour of performance
        // Table with: Host, date, requests, http status, bytes transferred, and ref
        logTable[i] = {};

        // Match Host
        endPos = tempFileData[i].indexOf(" -");
        logTable[i]['host'] = tempFileData[i].substring(0,endPos);

        // Match date with format: dd/MMM/y
        startPos = tempFileData[i].indexOf("[", endPos) + 1;
        endPos = tempFileData[i].indexOf(" ", startPos);
        logTable[i]['date'] = tempFileData[i].substring(startPos,endPos-9);
        
        // Match requests
        startPos = tempFileData[i].indexOf("/", endPos);
        endPos = tempFileData[i].indexOf(" ", startPos);
        logTable[i]['requests'] = tempFileData[i].substring(startPos,endPos);

        // Match http status
        startPos = tempFileData[i].indexOf("\" ", endPos) + 2;
        endPos = startPos + 3;
        logTable[i]['status'] = tempFileData[i].substring(startPos,endPos);

        // Match bytes
        startPos = endPos + 1;
        endPos = tempFileData[i].indexOf(" ", startPos);
        logTable[i]['bytes'] = tempFileData[i].substring(startPos,endPos);

        // Match ref
        startPos = tempFileData[i].indexOf("\"", endPos) + 1;
        endPos = tempFileData[i].indexOf('"', startPos);
        logTable[i]['ref'] = tempFileData[i].substring(startPos,endPos);
    } 
}

/**
 * Builds a two dimensional array containing the number of hits 
 * and total bandwidth transferred in MB per day
 */
function buildTrafficTable() {
    var trafficHash = {};
    var megaByte = 1024 * 1024;
    
    for(var i = 0; i < logTable.length; i++) {
        var date = Date.parse(logTable[i]['date'])
        if (isNaN(date) == false) {
            // Increment traffic
            if (typeof trafficHash[logTable[i]['date']] === "undefined") {
                trafficHash[logTable[i]['date']] = [date, 1, parseInt(logTable[i]['bytes'])];
            } else {
                trafficHash[logTable[i]['date']][1]++;
                trafficHash[logTable[i]['date']][2] += parseInt(logTable[i]['bytes']);
            }
        }
    }

    for (var key in trafficHash) {
        trafficTable.push([trafficHash[key][0],key, trafficHash[key][1], 
            (trafficHash[key][2] / megaByte).toFixed(2)]);
    }

    trafficTable.sort();
}

/**
 * Builds the hostTable, in which each row corresponds to a host and 
 * its number of requests. The table is N in size and is in 
 * descending order.
 *
 * @param n  Number of top rows to include
 */
function buildHostTable(n) {
    var hostHash = {};
    
    for(var i = 0; i < logTable.length; i++) {
        // Increment host frequency
        if (typeof hostHash[logTable[i]['host']] === "undefined") {
            hostHash[logTable[i]['host']] = 1;
        } else {
            hostHash[logTable[i]['host']]++;
        }
    }

    hostTable = getTopNFromHash(hostHash,n);
}

/**
 * Builds the requestTable, in which each row corresponds to a request url 
 * and the number of occurences. The table is N in size and is in 
 * descending order.
 *
 * @param n  Number of top rows to include
 */
function buildRequestTable(n) {
    var requestsHash = {};
    
    for(var i = 0; i < logTable.length; i++) {
        // Increment requests frequency
        if (typeof requestsHash[logTable[i]['requests']] === "undefined") {
            requestsHash[logTable[i]['requests']] = 1;
        } else {
            requestsHash[logTable[i]['requests']]++;
        }
    }

    requestTable = getTopNFromHash(requestsHash,n);
}

/**
 * Builds the pageTable, in which each row corresponds to a page and 
 * its number of requests. Each request is checked against a 
 * list of common media extensions to ensure that it's indeed 
 * a page. The table is N in size and is in descending order.
 *
 * @param n  Number of top rows to include
 */
function buildPageTable(n) {
    // Helper for ignoring common media file extensions
    function isNotMedia(url) {
        extensions = [
            'jpg', 'jpeg', 'pdf', 'mp3', 'rar',
            'exe', 'wmv', 'doc', 'avi', 'ppt',
            'mpg', 'mpeg', 'tif', 'wav', 'psd',
            'txt', 'bmp', 'css', 'js', 'png',
            'gif', 'swf', 'dmg', 'flv', 'gz'
        ];
        for (var i = 0; i < extensions.length; i++) {
            if (url.indexOf("." + extensions[i]) != -1) {
                return false;
            }  
        }
        return true;
    }

    var pageHash = {};
    
    for(var i = 0; i < logTable.length; i++) {
        if(isNotMedia(logTable[i]['requests'])) {
            // Increment requests frequency
            if (typeof pageHash[logTable[i]['requests']] === "undefined") {
                pageHash[logTable[i]['requests']] = 1;
            } else {
                pageHash[logTable[i]['requests']]++;
            }
        }
    }

    pageTable = getTopNFromHash(pageHash,n);
}


/**
 * Builds the refTable, in which each row corresponds to a referrer and 
 * its number of requests. The table is N in size and is in 
 * descending order. We remove blank referrers from the results.
 *
 * @param n  Number of top rows to include
 */
function buildRefTable(n) {
    var refHash = {};
    
    for(var i = 0; i < logTable.length; i++) {
        // Increment ref frequency
        if (typeof refHash[logTable[i]['ref']] === "undefined") {
            refHash[logTable[i]['ref']] = 1;
        } else {
            refHash[logTable[i]['ref']]++;
        }
    }

    delete refHash['-'];
    delete refHash[''];

    refTable = getTopNFromHash(refHash,n);
}

/**
 * Builds the errorTable, in which each row corresponds to a 404 and 
 * its number of requests. The table is N in size and is in 
 * descending order.
 *
 * @param n  Number of top rows to include
 */
function buildErrorTable(n) {
    var errorHash = {};
    
    for(var i = 0; i < logTable.length; i++) {
        // Increment error frequency
        if (logTable[i]['status'] ==  '404') {
            if (typeof errorHash[logTable[i]['requests']] === "undefined") {
                errorHash[logTable[i]['requests']] = 1;
            } else {
                errorHash[logTable[i]['requests']]++;
            }
        }
    }

    errorTable = getTopNFromHash(errorHash,n);
}

/**
 * Builds the refDomainsTable, in which each row corresponds to an 
 * external referring domain and its number of requests. The table 
 * is N in size and is in descending order. We drop the top result 
 * as we assume its the log owner's domain.
 *
 * @param n  Number of top rows to include
 */
function buildRefDomainsTable(n) {
    var refDomainsHash = {};
    
    for(var i = 0; i < logTable.length; i++) {
        // Increment ref domain frequency
        var refDomain = logTable[i]['ref'];
        refDomain = refDomain.replace("http://","");
        refDomain = refDomain.replace("https://","");
        refDomain = refDomain.replace("www.","");
        var endPos = refDomain.indexOf('/');
        var refDomain = refDomain.substring(0,endPos).toLowerCase();
        if (typeof refDomainsHash[refDomain] === "undefined") {
            refDomainsHash[refDomain] = 1;
        } else {
            refDomainsHash[refDomain]++;
        }
    }

    delete refDomainsHash['-'];
    delete refDomainsHash[''];

    refDomainsTable = getTopNFromHash(refDomainsHash,n);
    // Assume top result is your domain, and we only want external
    refDomainsTable.shift();
}

/**
 * Pushes the key/val pairs from a hash into an array and
 * sorts it by its value. It then trims the results to be 
 * less than or equal to n in size.
 *
 * @param hash  The hash to manipulate
 * @param n     Number of top rows to include
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
 * @param array  The sorted array to extract the values from
 * @return  The first ten rows of the sorted array
 */
function getTopTenValues(array) {
    // Extract top 10 values for bar graphs
    // from sorted data
    var topTen = [];
    for(var i = 0; i < 10; i++) {
        topTen[i] = array[i][1];
    }
    return topTen;
}

/**
 * Creates a string containing the necessary HTML for the tables 
 * that we generate containing the top N (100) results.
 *
 * @param array  The sorted array to extract the values from
 * @param colOne Table heading for keys
 * @param colTwo Table heading for the values
 * @return  String containing the table's HTML
 */
function buildTableHtml(array, colOne, colTwo) {
    var tableHtml = '<table><tr><th class="rank">Rank</th>' +
                    '<th class="colone">' + colOne + '</th>' +
                    '<th class="coltwo">' + colTwo + '</th></tr>';
    for(var i = 0; i < array.length; i++) {
        var rank = i +1;
        tableHtml += '<tr><td>' + rank + '</td>' +
                    '<td>' + array[i][0] + '</td>' +
                    '<td>' + array[i][1] + '</td>' +
                    '</tr>\n';
    }
    tableHtml += "</table>";

    return tableHtml;
}

/**
 * Adds the generated tables and bar charts to the page.
 */
function setupPage() {
    // Later, for the traffic/bandwidth graph
    // var div = document.getElementById('traffic');
    // div.style.display = 'block';

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
    } 
}

/**
 * Creates an SVG-based barChart with d3.js and appends it 
 * to a div. Based on the documentation for the library:
 * http://mbostock.github.com/d3/tutorial/bar-1.html
 *
 * @param container  The ID of the div to append the SVG
 * @param data       An array with 10 elements
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

    barChart.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
            .attr('y', y)
            .attr('width', x)
            .attr('height', y.rangeBand());

    barChart.selectAll('.bar')
        .data(data)
        .enter()
        .append('text')
            .attr('class', 'bar')
            .attr('x', x)
            .attr('y', 
                function(d) { 
                    return y(d) + y.rangeBand() / 2;
                })
            .attr('dx', -3)
            .attr('dy', '.38em')
            .attr('text-anchor', 'end')
            .text(String);

    barChart.append('line')
        .attr('y1', 0)
        .attr('y2', height-40)
        .style('stroke', '#2e3031');
}

// Add the listeners
var uploadBox = document.getElementById('uploadbox');
uploadBox.addEventListener('dragover', handleDragOver, false);
uploadBox.addEventListener('drop', handleFileSelect, false);

var showFileInputLink = document.getElementById('showfileinput');
showFileInputLink.addEventListener('click', showFileInput, false);

var fileInput = document.getElementById('fileinput');
fileInput.addEventListener('change', handleFileSelect, false);