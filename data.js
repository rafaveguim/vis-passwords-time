/**
 * Created with JetBrains WebStorm.
 * User: Rafa
 * Date: 18/04/12
 * Time: 5:26 PM
 * To change this template use File | Settings | File Templates.
 */


function yearRange(rows){
    d3.extent(rows.map(function(d){return d.Year;}));
}


