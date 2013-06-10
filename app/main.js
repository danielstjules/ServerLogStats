/**
 * Only accepts default Apache/Nginx access log format:
 * http://httpd.apache.org/docs/2.2/logs.html#common
 * Requires that /app/charts.js and /app/log.js be loaded
 * Uses Zepto.js and d3.js
 */

var log;

/**
 * Display file input for those who don't want to use drag and drop
 */
function showFileInput() {
  $('#fileinput').css('display', 'block');
  return false;
}

/**
 * Handle the drop event. Stops the browser from just loading the file's contents 
 * and instead allows us to process the data. Also mimcs the system's copy action, 
 * which usually changes the cursor to indicate that it's a copy.
 *
 * @param  evt  The drag over event that triggered the event listener
 */
function handleDragOver(evt) {
  // Stop further propagation in DOM and cancel the event
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy';

  return false;
}

/**
 * Main function for the script. Reads the file and validates its first couple 
 * lines. If valid, it splits the file and populates the logTable. It then calls 
 * the functions necessary to organize the entries and add the charts and tables 
 * to the page.
 *
 * @param  evt  The drop or change event that triggered the event listener
 */
function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  // Log current time
  var startTime = new Date().getTime();

  // Check that we have access to the necessary APIs
  if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert('The File APIs necessary for this app are not supported by your browser.');
    return false;
  }

  // Get the uploaded file
  var files = $('#fileinput').attr('files');
  var file;

  if (files.length)
    file = files[0];
  else
    file = evt.dataTransfer.files[0];

  // Display File Info, replacing previous upload box contents
  $('#uploadbox').html('<strong>Analyzing: </strong>' + escape(file.name) +
    ' - ' + file.size + ' bytes');

  // Create new FileReader, and handle when done reading
  var reader = new FileReader();

  reader.onloadend = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
      // Only read if log file looks valid, otherwise return and refresh
      if (!isValidLogInput(evt.target.result.slice(0, 1000))) {
        $('#uploadbox').append('<br /><br />Error: File input not a valid log. ' +
          'This page will refresh automatically in 4 seconds');
        setTimeout('location.reload(true);',4000);
        return;
      }

      // Split on new line, manipulate, and store in logTable
      log = new Log(evt.target.result.split(/[\n]+/));
      log.parse();

      setupPage();

      // Done - let's show how long that took
      var endTime = new Date().getTime();
      var duration = (endTime - startTime) / 1000;

      $('#footer').html('<p>Script Execution Time: ' + duration + 's</p>');
    }
  };

  reader.readAsText(file);

  return false;
}

/**
 * Uses regex to try to match the first couple lines of the log file. If it 
 * does, then we say it's a valid log in Common Log Format.
 *
 * @param   logSegment  Sample of the log file
 * @return  boolean     True if its valid, false otherwise
 */
function isValidLogInput(logSegment) {
  // We check the second in case the first one got cut from trimming
  logSegment = logSegment.split(/[\r\n|\n]+/);
  var regExp = /^\S+ \S+ \S+ \[[^\]]+\] "[^"]*" \d+ \d+ "[^"]*" "[^"]*"/m;

  if (logSegment[0].search(regExp) == -1 && logSegment[1].search(regExp) == -1)
    return false;

  return true;
}

/**
 * Returns the hits of the first 10 elements of a sorted array.
 *
 * @param   array  The sorted array to extract the values from
 * @return  array  Contains the hits of the first ten rows of the sorted array
 */
function getTopTenValues(array) {
  // Extract top 10 values for bar graphs from sorted data
  var x = 10;
  if (array.length < 10)
    x = array.length;

  var topTen = [];
  for (var i = 0; i < x; i++) {
    topTen[i] = array[i][1];
  }

  return topTen;
}

/**
 * Adds the generated tables and bar charts to the main page.
 */
function setupPage() {
  var div;
  var tableHtml;

  // Add the traffic line chart
  $('#traffic').css('display', 'block');
  Charts.drawTrafficLineChart('#traffic', log.traffic);

  // Next all the barcharts and tables
  // Format: div id, table var, second column head, third column head
  var barChartInfo = [
    ['hosts',       log.hosts,       'Host',      'Hits'],
    ['requests',    log.requests,    'Request',   'Hits'],
    ['pages',       log.pages,       'Page',      'Hits'],
    ['ref',         log.referrers,   'Referrer',  'Hits'],
    ['refdomains',  log.refDomains,  'Domain',    'Hits'],
    ['errors',      log.errors,      'Request',   'Hits']
  ];

  // Loop through each barChartInfo element
  // and display the div, build the bar chart, and the table
  for (var i = 0; i < barChartInfo.length; i++) {
    div = $('#' + barChartInfo[i][0]);
    div.css('display', 'block');

    tableHtml = buildTableHtml(barChartInfo[i][1], barChartInfo[i][2],
        barChartInfo[i][3]);

    div.find('.container')[0].getElementsByClassName('table')[0].innerHTML = tableHtml;

    Charts.drawBarChart('#' + barChartInfo[i][0],
      getTopTenValues(barChartInfo[i][1]));

    // Get list of table rows to add event listeners to
    var links = div.find('.container')[0]
                   .getElementsByClassName('table')[0]
                   .getElementsByTagName('tr');

    // Add event listeners, but skip the row containing the table head
    for (var j = 1; j < links.length; j++) {
      $(links[j]).on('click', processOverlay);
    }
  }
}

/**
 * Creates a string with the necessary HTML to present the tables that we 
 * generated containing the top N results.
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
    var rank = i + 1;
    tableHtml += '<tr><td>' + rank + '</td>' +
                 '<td>' + array[i][0] + '</td>' +
                 '<td>' + array[i][1] + '</td>' +
                 '</tr>\n';
  }

  tableHtml += '</table>';

  return tableHtml;
}

/**
 * Generates an overlay with additional information when a table row is clicked.
 *
 * @param  evt  The click event that triggered the listener
 */
function processOverlay(evt) {
  // Dim the screen and disable the scrollbar
  var body = $('body');
  var overlay = $('<div />', { id: 'overlay' });
  body.css('overflow', 'hidden');
  body.append(overlay);

  // Generate the popup and append it to the overlay
  var popup = $('<div />', { id: 'popup' });
  overlay.append(popup);

  var query = this.getElementsByTagName('td')[1].innerHTML;

  // Get section id, ie: <div id="hosts" class="section">
  var section = $(this).closest('.section').attr('id');

  // Render data for hosts, including: User Agent, Top Requests, and Top Pages
  if (section == 'hosts') {
    // Use the first occurrence of user-agent (ignore changes)
    var userAgent = '';
    for (var i = 0; i < log.logTable.length; i++) {
      if (log.logTable[i]['host'] == query && log.logTable[i]['userAgent']) {
        userAgent = log.logTable[i]['userAgent'];
        break;
      }
    }

    // Generate a list of the most common requests by that host
    var topRequests = '<div class="table left">' +
      buildTableHtml(log.parseRequests(1000, query), 'Request', 'Hits') +
      '</div>';

    // Generate a list of the most common pages requested by that host
    var topPages = '<div class="table right">' +
      buildTableHtml(log.parsePages(1000, query), 'Page', 'Hits') +
      '</div>';

    // Add the the tables to the popup
    popup.html('<p><strong>Host:</strong> ' + query + '</p>' +
               '<p><strong>User Agent:</strong> ' + userAgent + '</p>' +
               topRequests + topPages + '<div class="cl"></div>');
  }

  // TODO: Figure out what information we'd like to display for a ref domain. 
  // IE: Page Rank, most common referring pages, traffic from that website, etc
  else if (section == 'refdomains') {
    popup.html('Coming Soon');
  }

  // Render data for all other sections. So far, this includes a single line 
  // chart showing requests over time, and a table for requesting hosts
  else {
    var sectionInfo = {
      'requests' : {columnName : 'request', htmlTitle : 'Request' },
      'pages'    : {columnName : 'request', htmlTitle : 'Page'    },
      'ref'      : {columnName : 'ref',     htmlTitle : 'Referrer'},
      'errors'   : {columnName : 'request', htmlTitle : 'Error'   }
    };

    // Generate a list of the most common hosts, with a limit of 1000
    var filteredHostsTable = log.parseHosts( 1000,
      sectionInfo[section]['columnName'], query);

    var topHosts = '<div class="table right">' +
      buildTableHtml(filteredHostsTable, 'Host', 'Hits') + '</div>';

    // Add the table and line chart to the popup
    popup.html('<p><strong>' + sectionInfo[section]['htmlTitle'] +
      ':</strong> ' + query + '</p>' + topHosts);

    Charts.drawLineChart('#popup',
      log.parseTraffic(sectionInfo[section]['columnName'], query));
  }

  // Append a close link and add the corresponding event listener
  popup.append('<br /><a id="close">Click to Close</a><div class="cl"></div>');
  $('#close').on('click', removeOverlay);

  return false;
}

/**
 * Removes the overlay element from the document body, restoring the previous 
 * screen. Also re-enables the page's scrollbar.
 *
 * @param  evt  The click event that triggered the listener
 */
function removeOverlay(evt) {
  $('body').css('overflow', 'visible');
  $('#overlay').remove();

  return false;
}

// Add the listeners
var uploadBox = $('#uploadbox');
uploadBox.on('dragover', handleDragOver);
uploadBox.on('drop', handleFileSelect);

$('#showfileinput').on('click', showFileInput);
$('#fileinput').on('change', handleFileSelect);
