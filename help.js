/**
 * Created with JetBrains WebStorm.
 * User: 100457636
 * Date: 21/11/12
 * Time: 10:51 AM
 * To change this template use File | Settings | File Templates.
 */

d3.select('#help_button')
    .select('a')
    .on('click', function(){
       d3.select('#help_panel')
           .style('display', 'block');
    });

d3.select('#help_panel')
    .on('click', function(){
       d3.select(this)
           .style('display', 'none');
    });

