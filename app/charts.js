/**
 * Module that uses d3.js to draw the line and bar charts
 * Has 3 public functions: drawLineChart, drawBarChart, and drawTrafficLineChart
 */

var Charts = function() {
  // Date is formatted as dd/MMM/y
  var parseDate = d3.time.format('%d/%b/%Y').parse;

  // Use a custom tick format for line charts
  var customTimeFormat = timeFormat([
    [d3.time.format("%Y"),    function() { return true; }],
    [d3.time.format("%b"),    function(d) { return d.getMonth(); }],
    [d3.time.format("%b %d"), function(d) { return d.getDate() != 1; }],
    [d3.time.format("%a %d"), function(d) { return d.getDay() && d.getDate() != 1; }],
    [d3.time.format("%I %p"), function(d) { return d.getHours(); }],
    [d3.time.format("%I:%M"), function(d) { return d.getMinutes(); }],
    [d3.time.format(":%S"),   function(d) { return d.getSeconds(); }],
    [d3.time.format(".%L"),   function(d) { return d.getMilliseconds(); }]
  ]);

  /**
   * Helps build the custom tick format used in line charts
   *
   * @param  array  Accepts a two-dimensional array of time formats and functions
   */
  function timeFormat(formats) {
    return function(date) {
      var i = formats.length - 1;
      var f = formats[i];

      while (!f[1](date))
        f = formats[--i];

      return f[0](date);
    };
  }

  /**
   * Creates an SVG-based line chart with d3.js and appends it to a div. Generates 
   * a single y axis and line.
   *
   * @param  string  The ID of the div to append the SVG
   * @param  array   n by 3 table. Columns are index, date, and requests.
   */
  function publicDrawLineChart(container, array) {
    // TODO: Make it an interactive graph s.t. on mouse-over,
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
        date: parseDate(d.date),
        requests: parseInt(d.hits, 10)
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
   * Creates an SVG-based barChart with a max 10 bars and appends it to a div.
   *
   * @param  container  The ID of the div to append the SVG
   * @param  data       An array with 10 integers
   */
  function publicDrawBarChart(container, data) {
    var width = 384,
      height = 240,
      numTicks = 8,
      i = 0,
      j = 0,
      pos = 0;

    // Need distinct values for y's ordinal scale
    var yDomain = [];
    for (var k = 1; k <= data.length; k++)
      yDomain.push(k);

    var x = d3.scale.linear()
      .domain([0, d3.max(data)])
      .range([0, width - 24]);

    var y = d3.scale.ordinal()
      .domain(yDomain)
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

    // Impose a minimum width for bars
    barChart.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
        .attr('y',
          function(d) {
            pos = y.rangeBand() * i;
            i += 1;
            return pos;
          })
        .attr('width',
          function(d) {
            if (x(d) > 3)
              return x(d);
            else
              return 3;
          })
        .attr('height', y.rangeBand());

    // Draw hits within bars, but only if sufficiently wide
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
          function() {
            pos = (y.rangeBand() * j) + y.rangeBand() / 2 + 4;
            j += 1;
            return pos;
          })
        .attr('text-anchor', 'end')
        .text(String);

    barChart.append('line')
      .attr('y1', 0)
      .attr('y2', height-40)
      .style('stroke', '#2e3031');
  }

  /**
   * Creates an SVG-based line chart with d3.js and appends it to a div. Generates 
   * two y axis, with two lines: one for requests per day, and one for bandwidth 
   * per day.
   *
   * @param  string  The ID of the div to append the SVG
   * @param  array   n by 4 table. Columns are [int date, date, hits, bandwidth]
   */
  function publicDrawTrafficLineChart(container, array) {
    var margin = {top: 20, right: 6, bottom: 30, left: 16};
    var width = 760;
    var height = 200;

    var data = array.map(function(d) {
      return {
        date: parseDate(d.date),
        requests: parseInt(d.hits, 10),
        bandwidth: parseFloat(d.bandwidth)
      };
    });

    // Get the length of the labels on the y-axes, and adjust margins/width
    var y1Max = d3.max(data, function(d) { return d.requests; });
    var y2Max = d3.max(data, function(d) { return d.bandwidth; });

    margin.left += 6 * String(y1Max).length;
    margin.right += 6 * String(y2Max).length;
    width -= margin.left + margin.right;

    var lineChart = d3.select(container).append('svg')
      .attr('class', 'lineChart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var x = d3.time.scale().range([0, width]);
    var y1 = d3.scale.linear().range([height, 0]);
    var y2 = d3.scale.linear().range([height * 2 / 3, 0]);

    var xAxis = d3.svg.axis()
      .scale(x)
      .tickFormat(customTimeFormat)
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

 return {
      drawLineChart: publicDrawLineChart,
      drawBarChart: publicDrawBarChart,
      drawTrafficLineChart: publicDrawTrafficLineChart
  };

}();
