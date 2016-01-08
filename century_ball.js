/**
 * Draws a radial representation for years.
 * It consists of concentric 'orbits', where years, represented
 * by small ellipses, lie over.
 * Each orbit corresponds to a decade.
  */
function drawBall(){
    var w = width('ball'), h = height('ball');

    var years = yearsFreq(),
        decades = decades_(d3.keys(years).sort());

    var color = d3.scale.quantile()
        .domain(d3.values(years))
        .range(d3.range(9));

    var svg = d3.select("#ball").append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("class", "YlGnBu"); // refer to ColorBrewer CSS

    // a base layer to capture 'outside' clicks
    svg.append('rect')
        .attr('class', 'invisible')
        .attr('width' , w)
        .attr('height', h)
        .on('click', function(d,i){
            selection.attr('display','none');
            ringSelected.style('display', 'none');
            clearDim();
            drawAggregateCalendar();
            drawWordleForYears(d3.keys(tree));
        });

    // everything is drawn in this shifted g
    svg = svg.append("g")
             .attr('transform','translate('+w/2+','+h/2+')');

    // appending 'ring lanes'
    svg.append("g")
        .attr("class", "ring")
        .selectAll("circle")
        .data(d3.range(decades.length))
        .enter().append("circle")
        .attr("r", radius);
    
    // an invisible 'base ring' to broaden the clicking area of rings
    svg.select('g.ring')
       .selectAll("circle.mask")
       .data(d3.range(decades.length))
       .enter().append("circle")
       .attr('class', 'mask')
       .style('stroke-width', 6)
       .attr("r", radius)
       .on('mouseover', function(d){
    	   ringHover.style('display', null);
    	   ringHover.attr('r', radius(d));
       })
       .on('mouseout', function(){
    	   ringHover.style('display', 'none');
       })
       .on('click', function(d, i){
    	   dimDecadesExcept(i);
    	   ringSelected.style('display', null);
    	   ringSelected.attr('r', radius(d));
    	   selection.attr('display', 'none');
    	   var years = d3.range(i*10+1900, i*10+1910);
    	   drawAggregateCalendar(years);
    	   drawWordleForYears(years);
       });
    
    var ringSelected = svg.select('g.ring')
                          .append('circle')
                          .attr('class', 'selection decade_selection'),
        ringHover = svg.select('g.ring')
				       .append('circle')
				       .attr('class', 'hover decade_hover')
				       .style('pointer-events', 'none');

    // appending 'internal labels' (1940s, 1990s..)
    svg.append('g')
    	.attr('class', 'internal_label')
    	.selectAll('text')
    	.data(decades.map(function(a){return a[0];}))
    	.enter().append('text')
    	.text(function(d,i){return i<3 ? '' : d+'s';})
    	.attr('transform', function(d,i){return	'rotate(0)'
    		+ 'translate(0,3)'
    		+ 'translate(0,'+ radius(i) +') ';})
    	.attr('text-anchor', 'middle');

    // 'external labels' (1, 2, 3... 10)
    svg.append("g")
        .selectAll('text')
	    .data(d3.range(10))
	    .enter().append('text')
        .attr('class', 'external_label')
	    .attr("x", function(d,i){
	         return radius(decades.length)*Math.cos(angle(i));
	     })
	     .attr("y", function(d,i){
	    	var y = radius(decades.length)*Math.sin(angle(i));
	    	return y + d3.select(this).style('font-size').replace(/\D+/,'')/2;
	     })
	    .text(String)
	    .attr('cursor', 'hand')
	    .on('click', function(d){
	    	var years = svg.selectAll('circle.year')
		    	   .classed('dimmed', true)
		    	   .classed('unclickable', true)
		    	   .filter(function(y){return (y.year+'')[3]==d})
		    	   .classed('dimmed', false)
		    	   .classed('unclickable', false)
		    	   .data()
		    	   .map(function(d){return +d.year});
		    drawAggregateCalendar(years);
	    	ringSelected.style('display', 'none');
	    	drawWordleForYears(years);
	    });

    var hover = svg.append('circle')
        .attr('class','year_hover')
        .attr('display','none')
        .attr('r',7);

    // two-levels of data-binding here. decades -> svg:g; years -> svg:circle
    svg.selectAll("g.decade")
        .data(decades)
        .enter()
        .append("g")
        .attr("class", "decade")
      .selectAll("circle")
        .data(function(a,i){ // cross decades with years
            return a.map(function(d,j){
                return {year:+d, decade:i, freq: years[+d]}
            })
        })
        .enter()
        .append("circle")
        .attr("cx", function(d,i){ return radius(d.decade)*Math.cos(angle(i)); })
        .attr("cy", function(d,i){ return radius(d.decade)*Math.sin(angle(i)); })
        .attr("r", 4)
        .attr("class", function(d) { return "q" + color(d.freq) + "-9"; })
        .classed("year", true)
        .on("click", function(d){
            drawCalendar(d.year);
            align(selection, this);
            selection.style('fill', d3.select(this).style('fill'));
            drawWordleForYears([d.year]);
        })
        .on("mouseover", function(){ align(hover, this); })
        .on("mouseout", function(){ hover.attr('display','none') })
        .append("title")
        .text(function(d){return d.year+': '+d.freq;});

    var selection = svg.append('circle')
            .attr('class','selection year_selection')
            .attr('display','none')
            .attr('r',7);
}

function reloadBall(){
	var years = yearsFreq();
	
	var color = d3.scale.quantile()
			    .domain(d3.values(years))
			    .range(d3.range(9));
	
	var data = d3.select("#ball")
				 .selectAll('circle.year')
				 .data();
	data.forEach(function(d){d.freq = years[d.year]});
	
	d3.select("#ball")
	  .selectAll('circle.year')
	  .attr("class", function(d) { return "q" + color(d.freq) + "-9"; });
	  
}

/**
 * Returns a map with the frequency of every year.
 * Takes into consideration the filter stack.
 */
function yearsFreq(){
	// if there's no filter, call the old, fast function
	if (filterStack.length==0) return oldYearsFreq();
	
	var years = {};
    d3.keys(tree).forEach(function(k){
    	var pwds = d3.merge(d3.values(tree[k]));
    	pwds = filter(pwds, filterStack);
    	var sum = 0;
    	pwds.forEach(function(p){sum += +p.PWD_FREQUENCY});
        years[k] = sum;
    });
    return years;
}

/**
 * This function doesn't account for filters,
 * so it's way faster. This is mainly because it
 * doesn't count at password level, but at date level.
 */
function oldYearsFreq(){
	var years = {};
	d3.keys(tree).forEach(function(k){
	    years[k] = d3.sum(d3.values(tree[k]).map(function(u){
	        return +u[0].DATE_FREQUENCY;
	    }))
	});
	return years;
}



// computes radius for an orbit o
function radius(o){return o*17+17;};

//computes the angle for an index i [0..9] in radians
function angle(i) {return 36*i*Math.PI/180};