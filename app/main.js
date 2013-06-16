/**
 * Only accepts default Apache/Nginx access log format:
 * http://httpd.apache.org/docs/2.2/logs.html#common
 * Requires that /app/charts.js and /app/log.js be loaded
 * Uses Zepto.js, Handlebars.js, and d3.js
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

  // Handlebars template for updating #uploadbox
  var source = $('#uploaded-template').html();
  var template = Handlebars.compile(source);
  var uploadbox = $('#uploadbox');

  // Check that we have access to the necessary APIs
  if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    uploadbox.html(template({ 'browserIncompatible': true }));
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
  var fileInfo = { 'fileName': escape(file.name), 'fileSize': file.size };
  uploadbox.html(template(fileInfo));

  // Create new FileReader, and handle when done reading
  var reader = new FileReader();

  reader.onloadend = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
      log = new Log(evt.target.result);

      // Display error if the log file is invalid, then return and refresh
      if (!log.isValid()) {
        fileInfo['fileError'] = true;
        uploadbox.html(template(fileInfo));
        setTimeout('location.reload(true);', 4000);
        return;
      }

      // Parse the log and update the page
      log.parse();
      setupPage();

      // Done - let's show how long that took
      var endTime = new Date().getTime();
      var duration = (endTime - startTime) / 1000;

      var timeTemplate = Handlebars.compile($('#time-template').html());
      $('#footer').html(timeTemplate({ 'duration': duration }));
    }
  };

  reader.readAsText(file);

  return false;
}

/**
 * Creates an array of objects from a two dimensional array, for use with 
 * Handlebars. Adds the rank to each row.
 *
 * @param   array  Two dimensional array to format
 * @return  array  An array of objects with properties: rank, name and value
 */
function formatTableRows(array) {
  var rows = [];
  for (i = 0; i < array.length; i++) {
    var row = array[i];
    rows.push({ 'rank': i + 1, 'name': row[0], 'value': row[1] });
  }

  return rows;
}

/**
 * Adds the generated tables and bar charts to the main page.
 */
function setupPage() {
  var div;
  var tableHtml;

  var source = $('#section-template').html();
  var template = Handlebars.compile(source);

  // Add the traffic line chart
  $('#traffic').css('display', 'block');
  Charts.drawTrafficLineChart('#traffic', log.traffic);

  // Next all the barcharts and tables
  // Format: div id, table var, second column head, third column head
  var sectionInfo = [
    ['hosts',       log.hosts,       'Host',      'Hits'],
    ['requests',    log.requests,    'Request',   'Hits'],
    ['pages',       log.pages,       'Page',      'Hits'],
    ['ref',         log.referrers,   'Referrer',  'Hits'],
    ['refdomains',  log.refDomains,  'Domain',    'Hits'],
    ['errors',      log.errors,      'Errors',    'Hits']
  ];

  // Loop through each barChartInfo element
  // and display the div, build the bar chart, and the table
  for (var i = 0; i < sectionInfo.length; i++) {
    var j;

    var section = {
      'id': sectionInfo[i][0],
      'sectionName': sectionInfo[i][2] + 's',
      'colOne': sectionInfo[i][2],
      'colTwo': sectionInfo[i][3],
      'rows': formatTableRows(sectionInfo[i][1])
    };

    var html = template(section);
    $('#content').append(html);

    // Get top ten values, add the bar chart
    divID = '#' + sectionInfo[i][0];
    var topTen = sectionInfo[i][1].slice(0,10);
    for (j = 0; j < topTen.length; j++) {
      topTen[j] = topTen[j][1];
    }

    Charts.drawBarChart(divID, topTen);

    // Display the section
    div = $(divID);
    div.css('display', 'block');

    // Get list of table rows to add event listeners to
    var links = div.find('.container')[0]
                   .getElementsByClassName('table')[0]
                   .getElementsByTagName('tr');

    // Add event listeners, but skip the row containing the table head
    for (j = 1; j < links.length; j++) {
      $(links[j]).on('click', processOverlay);
    }
  }
}

/**
 * Generates an overlay with additional information when a table row is clicked.
 *
 * @param  evt  The click event that triggered the listener
 */
function processOverlay(evt) {
  var query = this.getElementsByTagName('td')[1].innerHTML;

  // Get section id, ie: <div id="hosts" class="section">
  var section = $(this).closest('.section').attr('id');

  // TODO: Figure out what information we'd like to display for a ref domain
  if (section == 'refdomains')
    return;

  // Dim the screen and disable the scrollbar
  var body = $('body');
  body.css('overflow', 'hidden');

  var source = $('#modal-template').html();
  var template = Handlebars.compile(source);

  // For hosts, display userAgent and requests
  if (section == 'hosts') {
    // Generate a list of the most common requests by that host
    var requestsTable = {
      'colOne': 'Request',
      'colTwo': 'Hits',
      'rows': formatTableRows(log.parseRequests(1000, 'host', query)),
      'query': query,
      'title': 'Host',
      'extraTitle': 'User Agent',
      'extraInfo': log.getUserAgent(query)
    };

    // Add modal, then draw line chart
    body.append(template(requestsTable));
    Charts.drawLineChart('#modal', log.parseTraffic('host', query));
  }

  // Render data for all other sections. So far, this includes a single line 
  // chart showing requests over time, and a table for requesting hosts
  else {
    var sectionInfo = {
      'requests' : { 'columnName': 'request',  'htmlTitle': 'Request' },
      'pages'    : { 'columnName': 'request',  'htmlTitle': 'Page' },
      'ref'      : { 'columnName': 'referrer', 'htmlTitle': 'Referrer' },
      'errors'   : { 'columnName': 'request',  'htmlTitle': 'Error' }
    };

    // Generate a list of the most common hosts, with a limit of 1000
    var column = sectionInfo[section]['columnName'];
    var hosts = log.parseHosts(1000, column, query);
    var hostsTable = {
      'colOne': 'Host',
      'colTwo': 'Hits',
      'rows': formatTableRows(hosts),
      'query': query,
      'title': sectionInfo[section]['htmlTitle']
    };

    // Add modal, then draw line chart
    body.append(template(hostsTable));
    Charts.drawLineChart('#modal', log.parseTraffic(column, query));
  }

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

// Register the table partial
Handlebars.registerPartial('table', $('#table-partial').html());

// Add the listeners
var uploadBox = $('#uploadbox');
uploadBox.on('dragover', handleDragOver);
uploadBox.on('drop', handleFileSelect);

$('#showfileinput').on('click', showFileInput);
$('#fileinput').on('change', handleFileSelect);
