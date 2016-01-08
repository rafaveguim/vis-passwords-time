
function width(el) { return document.getElementById(el).clientWidth;  }
function height(el){ return document.getElementById(el).clientHeight; }

function replaceAt(s, index, char) {
    return s.substr(0, index) + char + s.substr(index + 1);
}

function buildRegex(pattern) {
    var reg = [],
        scape = '\n' 
        counter = 1;
    
    for (var i = 0; i < pattern.length; i++) {
        var c = pattern.charAt(i);
        
        if (c==scape) continue;
        
        reg[i] = '(\\d)';
        
        for (var k = i + 1; k < pattern.length; k++) {
            if (c == pattern.charAt(k)){
                pattern = replaceAt(pattern, k, '\n');
                reg[k] = '\\' + counter;
            }
        }
        
        counter++;
    }
    
    return new RegExp(reg.join(''));
}

/**
 * Given an array of filtering functions,
 * apply them all against an array of passwords and
 * returns the resulting array.
 * @param pwds array of passwords (data rows)
 * @param filterStack array of functions
 * 
 */
//function filter(pwds, filterStack){
//	filterStack.forEach(function(f){pwds = pwds.filter(f)});
//	return pwds;
//}

/**
 * Given an array of filtering functions,
 * apply them all against an array of passwords and
 * returns the resulting array.
 * @param pwds array of passwords (data rows)
 * @param filterStack array of functions
 * 
 */
function filter(pwds, filterStack){
	var pwd;
    for (var i=pwds.length-1; i>=0; i--){
    	pwd = pwds[i];
    	// test if the password matches at least one 'denied' pattern
    	if (filterStack.some(function(f){return !f(pwd)}))
    		pwds.splice(i,1);
    }
	return pwds;
}

function toNumber(d){
	return +d;
}