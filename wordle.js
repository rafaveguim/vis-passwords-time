var w, h;
// cloud is the wordle in itself
// bin is the region where the filtered out words go to
var binWidth = 150, binHeight,
    cloudWidth, cloudHeight;

// the function for font size being last used
var fFontSize, layout,
    percent = d3.format('%');

// the raw dataset and two derived subsets
var passwords   = new Array(), 
    withLetters = new Array(), 
    onlyNumbers = new Array(),
    inUse       = passwords; // the dataset currently in use

// numbers of words to appear in the cloud
var threshold = 100;

window.addEventListener("load", initialize, false);

function initialize(){
	wordleMetrics();
	layout = d3.layout.cloud()
	           .size([cloudWidth, cloudHeight])
	           .timeInterval(1)
	           .font('Trebuchet MS')
	           .rotate(0);
	configureDistributionBar();
}

function configureDistributionBar(){
    var copyPosition = function(from, to){
        to.style('width', from.style('width'))
		  .style('left', from.style('left'));
    };
    
    var hover  = function(){ copyPosition(d3.select(this), d3.select('#distrib_hover'))};
    var select = function(this_){ copyPosition(d3.select(this_), d3.select('#distrib_select'))};
    
    var unHover  = function(){d3.select('#distrib_hover').style('width',0)};
    var unSelect = function(){d3.select('#distrib_select').style('width',0)};

	d3.select('#letters')
	  .on('click', function(d){
		  select(this);
		  inUse = withLetters;
		  drawWordle(dataToVisual(topUnique(inUse, threshold)));
		  
	  })
	  .on('mouseover', hover)
	  .on('mouseout', unHover);
	
	d3.select('#noletters')
	  .on('click', function(d){
		  select(this);
		  inUse = onlyNumbers;
		  drawWordle(dataToVisual(topUnique(inUse, threshold)));
	  })
	  .on('mouseover', hover)
	  .on('mouseout', unHover);
	  
    d3.selectAll('#distrib_select')
      .on('click', function(){
        unSelect();
        inUse = passwords;
		drawWordle(dataToVisual(topUnique(inUse, threshold)));
    });  
	
}

function wordleMetrics(){
	w = width('wordle');
	binHeight = h = height('wordle');
	cloudWidth = w - binWidth;
	cloudHeight = h - height('distrib');
}

/**
 * Returns a function that determines the color of a word,
 * given a particular frequency value.
 * @param domain array in the form [min, max]
 */
function colorFunction(domain){
	var uninterp = d3.scale.linear().domain(domain).range([0,1]),
	    // fixed hue and variable lightness and saturation	
	    interp   = d3.interpolateHsl('hsl(30,100%,88%)', 'hsl(30,25%,25%)');
	
	return function(x){return interp(uninterp(x))};
}


/**
 * Returns a function that determines the font size of a word,
 * given a particular frequency value.
 * @param domain array in the form [min, max]
 */
function fontSizeFunction(domain){
	return fFontSize.range([15,80]).domain(domain);
}


/**
 * Returns the proportion of passwords that don't contain
 * letters or other symbols in a particular dataset.
 * @param pwds an array of objects that stores the passwords
 * as the attribute 'RAW' and their frequency as 'PWD_FREQUENCY'
 */
function onlyNumbersRatio(pwds){
	var total = 0, onlyNumbers = 0;
	
	pwds.forEach(function(p){
		if (p.RAW.match(/\D/)==null)	
			onlyNumbers += +p.PWD_FREQUENCY;
		total += +p.PWD_FREQUENCY;
	});
	
	return onlyNumbers/total;
}


function setData(dates){
	passwords.length = 0;
	var newData = d3.merge(dates.map(function(d){ return tree[year(d)][d] }));
	// filtering and sorting
	newData = filter(newData, filterStack)
				.filter(function(d){return d!=null})
	                .sort(function(a,b){return +b.PWD_FREQUENCY - +a.PWD_FREQUENCY});
	
	// that's for not loosing a possible reference from 'inUse' to 'passwords'
	newData.forEach(function(d,i){
		// assuming it's sorted, avoids repeated entries 
		if (newData[i-1]!=null && newData[i-1].RAW!=d.RAW) passwords.push(d); 
	});
	withLetters.length = onlyNumbers.length = 0;
	passwords.forEach(function(p){
		if (p.RAW.match(/\D/)==null)	onlyNumbers.push(p);
		                        else	withLetters.push(p);
	});
}

/**
 * Returns the first N unique elements from a collection.
 */
function topUnique(list, n){
    var top = {},
        counter = 0;

    for (var i=0; i<list.length; i++){
        var d = list[i];
        if (!top.hasOwnProperty(d.RAW)){
            top[d.RAW] = d;
            if (++counter == n)
                break;
        }
    }

    return d3.values(top);
}

/**
 * Draws Wordle
 * @param dates array of dates
 * @param fFont d3 scale function that determines the font size,
 * e.g., d3.scale.log()
 */
function wordle(dates, fFontSize){
	this.fFontSize = fFontSize;
	setData(dates);
	
    var onlyNumbers = onlyNumbersRatio(passwords); // count it before splicing
    
    drawWordle(dataToVisual(topUnique(inUse, threshold)));
    updateDistributionBar(onlyNumbers);
}

function dataToVisual(data){
    var extent   = d3.extent(data.map(function(d){return +d.PWD_FREQUENCY;})),
	    color    = colorFunction(extent),
	    fontSize = fontSizeFunction(extent);

	return data.map(function(d){
		return {text: d.RAW, size: fontSize(+d.PWD_FREQUENCY),
    		color: color(+d.PWD_FREQUENCY),
            value: +d.PWD_FREQUENCY};
	});
}

/**
 * Draws wordle
 * @param words array of objects containing the following
 * attributes: text, size, color, and value.
 */
function drawWordle(words){
	plotWords([], true); //reset cloud
    // reset "filtered out" region
    getFilteredTexts().data([]).exit().remove();
    
    var onWord = function(d){plotWords([d], false)},
        onEnd = function(d){plotWords(d, true)};
    
    layoutCloud(words, onWord, onEnd);
}

/**
 * Updates distribution bar
 * @param onlyNumbers proportion of only-number
 * passwords, 0-1.
 */
function updateDistributionBar(onlyNumbers){
	d3.select('#letters')
	  .datum(1-onlyNumbers)
      .style('width', percent)
      .style('left', function(d){return percent(1-d)});
    d3.select('#noletters')
      .datum(onlyNumbers)
      .style('width', percent)
      .style('left', 0);
}

/**
 * Plots a collection of words on the screen
 * @param words collection of words
 * @param scratch if true, clear the previous words before
 * plotting. Otherwise, plot over the existent words. 
 */
function plotWords(words, scratch){
	if (scratch==null) scratch = true;
    
    // append svg only if necessary
    d3.select('#wordle').selectAll('svg')
        .data([null])
        .enter().insert('svg', '#distrib')
        .attr('class', 'Greys')
        .attr('width', w)
        .attr('height', h)
        .append('g')
        .classed('cloud', true)
        .attr('transform', 'translate('+cloudWidth/2+','+cloudHeight/2+')')
        .append('text')
        .attr('class','hover');

    svg = d3.select('#wordle').select('svg').select('g');

    var words = scratch ? words : svg.selectAll('text').data().concat(words);
    
    var bound = svg.selectAll('text').data(words);
    bound.exit().remove();
    bound.enter().append("text");

    svg.selectAll('text').call(cloudSetter);
}

/**
 * Transfers a password from the cloud to the "filtered out" region.
 * The context ('this') is of the selection of a single text element. 
 * @param d data associated with the text element
 */
function filterOut(d){
	var binOffset = w - binWidth;
	
	d3.select(this)
	  .transition()
	  .each('end', function(d){
		  // creating a corresponding element and placing it in the "filtered out" region
		  var out = getFilteredTexts().data();
		  out.push(d);
		  getFilteredTexts().data(out).enter().append('text')
		    .classed('filtered-out', true);
		  getFilteredTexts().attr('text-anchor', 'start')
		    .attr('x', binOffset)
		    .attr('y', function(d,i){return (i+1)*22;})
		    .text(function(d){return d.text;})
		    .on('mouseover',function(){d3.select(this).style('fill', 'gray')})
		    .on('mouseout',function(){d3.select(this).style('fill', null)})
		    .on('click', backToCloud);
		  
		 d3.select(this).style('display', 'none');
		 
		 var cloudData = getCloudTexts().data();
		 // adding a word to replace the one we just made 'disabled'
		 if ( (newcomer = inUse[cloudData.length]) != null){
			 cloudData.push({text: newcomer.RAW, value: +newcomer.PWD_FREQUENCY});
			 getCloudTexts().data(cloudData)
							   .enter()
							   .append('text')
							   .call(cloudSetter);
		 }
		 
		 updateCloud();
	  })
	  .attr('transform', function(d){
		  var x = binOffset - cloudWidth/2,
		      y = (getFilteredTexts().data().length + 1)*22 - cloudHeight/2;
		  return 'translate('+ [x,y] +')';		  
	  })
	  .attr('text-anchor', 'start')
	  .style('font-size', '20px');
}

/**
 * Sends a password from the 'filtered out' region to the cloud.
 * The context ('this' variable) refers to the selection of a single text
 * element.
 * @param o data associated with the text element
 */
function backToCloud(o){
	// removes it from the filtered out region 
	d3.select(this).remove();
	// add this password back to the cloud
	getCloudTexts().filter(function(d){return d==o})
	               .transition()
	               .style('font-size', '40px')
	               .style('display', null)
	               .attr('transform', 'translate('+[0,0]+')')
	               .each('end', function(){
	                	// updates filtered out region (y-position)
                        	getFilteredTexts().attr('y', function(d,i){return (i+1)*22;});
                        	// updates cloud
                        	updateCloud();
	               });

}

function updateCloud(){
	data = getCloudTexts().filter(function(d){return d3.select(this).style('display')!='none'})
	                      .data();
	var extent = d3.extent(data.map(function(d){return d.value})),
	    color = colorFunction(extent),
	    fontSize = fontSizeFunction(extent);
	
	var words = data.map(function(d){
        return {text: d.text, size: fontSize(d.value),
    		color: color(d.value), value: d.value};
		});

	var onEnd = function (newWords) {
		var updated = d3.nest()
		                .key(function(d){return d.text})
		                .rollup(function(array){return array[0]})
		                .map(newWords);
		
		var freq = newWords.map(function(d){return d.value});
		var duration = d3.scale.log().domain(d3.extent(freq)).range([250,1000]);
		
		// making invisible that words that don't appear in the new set
		d3.select('g.cloud').selectAll('text')
		  .filter(function(d){return updated[d.text]==null})
		  .style('font-size', 0);
		
		// updating words that remain
		d3.select('g.cloud').selectAll('text')
		.filter(function(d){return updated[d.text]!=null})
		  .transition()
		  .style('text-anchor', 'middle')
		  .duration(function(d){return duration(d.value)})
		  .style("font-size", function(d) { return updated[d.text].size + "px"; })
		  .attr("transform", function(d) {
			  return "translate(" + [ updated[d.text].x, updated[d.text].y] +
			  ")rotate(" + updated[d.text].rotate + ")";
          })
          .attr('fill', function(d){ return updated[d.text].color; });
		
//		// returns the set resulting from subtracting (newWords - words)
//		var diff = newWords.filter(function(d){
//			return !words.some(function(k){return k.text==d.text})
//		})
//		
//		// including the words that don't appear before
//		var data = d3.select('g.cloud').selectAll('text').data().concat(diff);
//		d3.select('g.cloud').selectAll('text')
//		  .data(data)
//		  .enter()
//		  .append('text')
//		  .call(cloudSetter)
//		  
//		console.log(diff);
	}
	
	layoutCloud(words, null, onEnd);
}

function cloudSetter(sel){
    sel.style("font-size", function(d) { return d.size ? d.size + "px" : 0; })
       .attr("text-anchor", "middle")
       .attr("transform", function(d) {
    	   // prevents the words to be drawn outside the drawing region
    	   return (d.x>cloudWidth/2 || d.y>cloudHeight/2 || d.x<-cloudWidth/2 || d.y<-cloudHeight/2)
    	   ? "translate(-10000,-10000)" : "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";

       })
       .attr('fill', function(d){return d.color!=null ? d.color : null;})
       .text(function(d) { return d.text; })
       .on('mouseover', function(d){
    	   var c = d3.hsl(d3.select(this).attr('fill'));
    	   var hl = c.l > 0.5 ? c.darker() : c.brighter();
    	   d3.select(this)
    	     .attr('fill', hl.toString())
    	     .attr('original_color', c.toString());
        })
        .on('mouseout', function(d){
    	   var c = d3.select(this).attr('original_color');
    	   d3.select(this)
    	     .attr('fill', c)
    	     .attr('originalColor', null);
        })
       .on('click', filterOut)
       .append('title')
       .text(function(d){return d.value;});
}

function reloadWordle(){
	filter(passwords, filterStack),
	filter(withLetters, filterStack),
	filter(onlyNumbers, filterStack);
	
	drawWordle(dataToVisual(inUse.slice(0, threshold)));
}

function layoutCloud(words, onWord, onEnd){
	layout.stop();
    layout.words(words)
	      .fontSize(function(d) { return d.size; })
	      .color(function(d){return d.color;})
	      .value(function(d){return d.value;})
	      .on("word", function(d){if (onWord) onWord(d)})
	      .on("end", function(d){if (onEnd) onEnd(d)}) 
	      .start();
}

function getFilteredTexts(){
	return d3.select('#wordle').select('svg').selectAll('text.filtered-out');
}

function getCloudTexts(){
	return d3.select('#wordle').select('svg').select('g.cloud').selectAll('text');
}

