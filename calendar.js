/**
 * Created with JetBrains WebStorm.
 * User: Rafael
 * Date: 18/04/12
 * Time: 4:51 PM
 * To change this template use File | Settings | File Templates.
 */

var margin = {top: 19, right: 0, bottom: 20, left: 20},
    cellSize;

var day     = d3.time.format("%w"),
    month   = d3.time.format("%m"),
    week    = d3.time.format("%U"),
    year    = d3.time.format("%Y"),
    fullFormat  = d3.time.format("%Y-%m-%d"),
    mmddFormat  = d3.time.format("%m-%d");

var tree, daysOfYear;

// an array with filtering functions
var filterStack = [];

var color; // color function for calendar view

window.addEventListener("load", start, false);

function start(){

    d3.csv('calendar.csv', function(rows){
        // calendar metrics
        cellSize = (width('chart') - margin.right - margin.left)/53;

        daysOfYear = d3.nest()
            .key(function(d){return mmddFormat(new Date(d.YEAR, d.MONTH-1, d.DAY));})
            .map(rows);
        tree = d3.nest().key(function(d){return +d.YEAR;})
            .key(function(d){return new Date(d.YEAR,d.MONTH-1,d.DAY);})
            .map(rows);

        drawAggregateCalendar();
        drawBall();

        /*in the beginning those elements are not displayed for aesthetic reasons*/
        d3.select('#distrib').style('display', null);
        d3.select('#help_button').style('display', null);

        drawWordleForYears(d3.keys(tree));

        d3.select('#loading').style('display', 'none');

    })
}

/**
 * Draws an aggregate wordle for passwords corresponding
 * to all the years informed.
 * @param years array of year. It can be strings or numbers. we're robust =D
 */
function drawWordleForYears(years){
	years = years.map(function(d){return +d});
	dates = d3.merge(years.map(function(y){return d3.time.days(new Date(y++,0,1), new Date(y,0,1));}))
	wordle(dates, d3.scale.log());
}


/**
 * Draws an aggregate calendar corresponding to a range of years.
 * @param range array like [min, max], inclusive. If not informed,
 * draws the calendar aggregating all the years available.
 */
function drawAggregateCalendar(years){
	var freq = freqByDayOfYear(years);
	
    if (years==null) // if no years informed, consider them all
        years = d3.keys(tree).map(function(d){return +d});
    
	
    var w  = width('chart'), h = height('chart'),
        year = 1967;
    color = d3.scale.quantile()
                .domain(d3.values(freq))
                .range(d3.range(9));

    d3.select('#chart').select('svg').remove(); // cleaning

    var svg = d3.select("#chart").append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("class", "YlGnBu")
                .append("g")
                .attr("transform", "translate(" + margin.left + ","
                + ((h - cellSize * 7) / 2) + ")");

    svg.append("text")
        .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
        .attr("text-anchor", "middle")
        .classed('legend', true)
        .text(years[0]+" to "+years[years.length-1]);
    
    var rect = svg.selectAll("rect.day")
        .data(function(d) { return d3.time.days(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) { return week(d) * cellSize; })
        .attr("y", function(d) { return day(d) * cellSize; })
        .datum(function(d){return mmddFormat(d);})
        .attr("class", function(mmdd) { return "day q" + color(freq[mmdd]) + "-9"; })
        .on('click', function(mmdd){
            selectDay(d3.select(this));
        	var dates = d3.keys(tree)
        				  .filter(function(d){return years.indexOf(+d)!=-1;})
        				  .map(function(y){return fullFormat.parse(y+'-'+mmdd);});
        	wordle(dates, d3.scale.linear());
        })
        .append('title')
        .text(function(d) { return d + ": " + freq[d].toFixed(1); });

    svg.selectAll("path.month")
        .data(function() { return d3.time.months(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);
}

function drawCalendar(year){
    var dates = freqByDate(year);

    color = d3.scale.log()
        .domain(d3.extent(d3.values(dates)))
        .range([0,8]);

    var w  = width('chart'), h = height('chart');

    d3.select('#chart').select('svg').remove(); // cleaning

    var svg = d3.select("#chart").append("svg")
            .attr("width", w)
            .attr("height", h)
            .attr("class", "YlGnBu")
            .append("g")
            .attr("transform", "translate(" + margin.left + ","
            + ((h - cellSize * 7) / 2) + ")");

    svg.append("text")
        .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
        .attr("text-anchor", "middle")
        .text(year);

    var rect = svg.selectAll("rect.day")
        .data(function() { return d3.time.days(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) { return week(d) * cellSize; })
        .attr("y", function(d) { return day(d) * cellSize; })
        .on('click', function(d){
            selectDay(d3.select(this));
            wordle([d], d3.scale.log());
        });

    rect.append("title")
        .text(function(d) { return fullFormat(d) + ': 0'; });

    svg.selectAll("path.month")
        .data(function() { return d3.time.months(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);

    rect.filter(function(d) { return d in dates; })
        .attr("class", function(d) { return "day q" + Math.round(color(dates[d])) + "-9"; })
        .select('title')
        .text(function(d) { return fullFormat(d) + ": " + dates[d].toFixed(1); });
}

/**
 * Highlights the rectangle corresponding to a day.
 * @param sel a d3 selection of the rect
 */
function selectDay(sel){
    var hl = d3.select('rect.selection');
    if (hl.empty())
        hl = d3.select('#chart')
            .select('svg')
            .select('g')
            .append('rect')
            .classed('selection', true);

    hl.attr('x', sel.attr('x'))
        .attr('y', sel.attr('y'))
        .attr('width', cellSize)
        .attr('height', cellSize);
}

/**
 * Aligns two circles
 */
function align(c1, c2){
    c1.attr('display', null);
    c1.attr('cx', d3.select(c2).attr('cx'));
    c1.attr('cy', d3.select(c2).attr('cy'));
}


function monthPath(t0) {
    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
             d0 = +day(t0), w0 = +week(t0),
             d1 = +day(t1), w1 = +week(t1);
    return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
         + "H" + w0 * cellSize + "V" + 7 * cellSize
         + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
         + "H" + (w1 + 1) * cellSize + "V" + 0
         + "H" + (w0 + 1) * cellSize + "Z";
}

function frequency(){
    return rows.map(function(d){return +d.Frequency;});
}

function crossDecades(arrays){
    arrays.map(function(a,i){
        return a.map(function(d,j){return {year:d, decade:i}})
    })
    return arrays;
}

/**
 * Modify the "ball" so that all decades are dimmed except the informed one.
 * @param i index of the decade not to be dimmed
 */
function dimDecadesExcept(i){
	d3.selectAll('g.decade')
 	  .filter(function(o,k){return i!=k})
 	  .selectAll('circle.year')
 	  .classed('dimmed', true)
 	  .classed('unclickable', true);
	d3.selectAll('g.decade')
  	  .filter(function(o,k){return i==k})
  	  .selectAll('circle.year')
      .classed('dimmed', false)
      .classed('unclickable', false);
}

/**
 * Cancel the dim effect for all decades
 */
function clearDim(){
	d3.selectAll('circle.year')
	  .classed('dimmed', false)
	  .classed('unclickable', false);
}

/**
 * Divide an array of year in groups of ten.
 * @param years array of years to be split in decades. Should start with the first year of a decade and should
 * not contain gaps.
 * @return 2-dimensional array. Each column is a decade.
 */
function decades_(years){
    var dec = d3.split(years, function(d){return d%10==0;});
    dec.forEach(function(d,i){d.unshift(d[0]-1);});
    return dec;
}

/**
 * Returns the frequency distribution of days of year.
 * If all years are desired, the parameter should be passed as null,
 * so that the function chooses a faster algorithm to compute distribution
 * (without filtering years).
 * 
 * @param years array of years, or null for all
 * @return a map of the form {08-05: 524, ...}, where there
 * are 524 occurrences for May 8.
 */
function freqByDayOfYear(years){
	var freq = {};
    if (years==null){ // if no years informed, consider them all
        d3.keys(daysOfYear).forEach(function(k){
        	var filtered = filter(daysOfYear[k], filterStack);
        	freq[k] = d3.sum(filtered.map(function(e){ return +e.PWD_FREQUENCY}));
        });
    } else {
        d3.keys(daysOfYear).forEach(function(k){
        	// filtering by year
            var dates = daysOfYear[k].filter(function(date){return years.indexOf(+date.YEAR)!=-1});
            // filtering by patterns defined by user
            filter(dates, filterStack);
            // building the frequency distribution
            freq[k] = d3.sum(dates.map(function(e){ return +e.PWD_FREQUENCY}));
        });	
    }
	return freq;
}

function freqByDate(year){
	var freq = {};
	d3.entries(tree[year]).forEach(function(entry){
	        var date = entry.key, pwds = entry.value;
		    filter(pwds, filterStack);
		    freq[date] = d3.sum(pwds.map(function(p){return +p.PWD_FREQUENCY}));
    });
	return freq;
}

function nestByDate(rows){
    return d3.nest()
        .key(function(d){return new Date(d.YEAR,d.MONTH-1,d.DAY);})
        .map(rows);
}

/**
 * Adds a new filter to the filter stack based on user input.
 */
function updateFilters(){
	if (event.keyCode != 13) return;
	
	var keys = document.getElementById("pattern_input").value;
	keys = keys.replace(' ', '');
	keys = keys.split(',');
	
	keys.forEach(function(key){
		var regex = buildRegex(key);
		filterStack.push(function(d){ return d.RAW.match(regex)==null });
	})
	
	updateViews();
}

/**
 * Reload views. Usually called after a filter is inserted or removed.
 */
function updateViews(){
	reloadBall();
	reloadCalendar();
	reloadWordle();
}

function reloadCalendar(){
	// recover the year range info from the label!! =D
	var reg = /\b\d+\b/g; // regex captures numeric sequences
	 legend = d3.select('#chart')
				   .select('text.legend')
				   .text();
	var years = legend.match(reg).map(toNumber);
	if (years.length==2) years = d3.range(years[0], years[1]+1);
	
	var freq = freqByDayOfYear(years);
	
	d3.select('#chart')
	  .selectAll("rect.day")
	  .transition()
	  .attr("class", function(d) { return "day q" + Math.round(color(freq[d])) + "-9"; });
	
}


// Obsolete function, from the time we kept the rows.
// Nesting rows all the time is too slow.
// It's a pretty function, though.
/*function freqByDayOfYear(rows){
    return d3.nest()
        .key(function(d){return mmddFormat(new Date(d.YEAR, d.MONTH-1, d.DAY));})
        .rollup(function(d){
            return d3.sum(d.map(function(e){
                return +e.PWD_FREQUENCY;
            }));
        })
        .map(rows);
}*/

// Same situation as function above
/*function freqByDate(rows){
return d3.nest()
    .key(function(d){return new Date(d.YEAR,d.MONTH-1,d.DAY);})
    .rollup(function(d){return +d[0].DATE_FREQUENCY;})
    .map(rows);
}*/
