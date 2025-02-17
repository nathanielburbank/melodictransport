Radar = function(_parentElement, options) {

    this.parentElement = _parentElement;
    this.options = _.defaults(options, {
        width: 800,
        height: 800,
        margin: {
            top: 40,
            right: 40,
            bottom: 40,
            left: 40
        },
        showLabels: true,
        years: [2000, 2014]
    });

    this.initVis();
}


/*
 *  Initialize radar chart
 */

Radar.prototype.initVis = function() {
    var vis = this;

    /************
     * SCALES
     * **********/
    var margin = vis.options.margin;
    var width = vis.width = vis.options.width - margin.left - margin.right;
    var height = vis.height = vis.options.height - margin.top - margin.bottom;
    var threshold = Math.min(vis.width, vis.height);
    vis.radius = threshold / 1.5 - (.2 * threshold);

    /************
     * LEGEND AND CHART TITLE
     * **********/
    var titleCenterX = (width / 2);
    var legendStartX = (width / 2) - 75;
    var legendLineLength = 20;
    var legendTextWidth = 40;
    var legendSpacer = 10;
    var legendTextY = 70;
    var legendLineY = 65;
    vis.legend = d3.select(vis.parentElement).append("svg")
        .attr("class", "center-block")
        .attr('width', width)
        .attr('height', 90)
        .append('g')
        .attr("id", "radar-legend");

    vis.legend.append("text")
        .attr("class", "radar-title")
        .attr("id", "radar-title-item")
        .attr("x", titleCenterX)
        .attr("dy", "20")
        .attr("text-anchor", "middle")
        .text("Item by")

    vis.legend.append("text")
        .attr("class", "radar-title")
        .attr("id", "radar-title-demographic")
        .attr("x", titleCenterX)
        .attr("dy", "45")
        .attr("text-anchor", "middle")
        .text("Demographic")

    vis.legend.append("path")
        .datum([
            [legendStartX, legendLineY],
            [legendStartX + legendLineLength, legendLineY]
        ])
        .attr("class", "plot-0")
        .attr("d", d3.svg.line());

    vis.legend.append("circle")
        .attr("class", "plot-0")
        .attr("cx", legendStartX)
        .attr("cy", legendLineY)
        .attr("r", 3);


    vis.legend.append("text")
        .attr("class", "legend")
        .attr("id", "legend-0-text")
        .attr("x", legendStartX + legendLineLength + legendSpacer)
        .attr("dy", legendTextY)
        .text("1984");

    vis.legend.append("path")
        .datum([
            [legendStartX + legendLineLength + legendTextWidth + (legendSpacer * 2), legendLineY],
            [legendStartX + legendLineLength + legendTextWidth + (legendSpacer * 2) + legendLineLength, legendLineY]
        ])
        .attr("class", "plot-1")
        .attr("d", d3.svg.line());

    vis.legend.append("circle")
        .attr("class", "plot-1")
        .attr("cx", legendStartX + legendLineLength + legendTextWidth + (legendSpacer * 2))
        .attr("cy", legendLineY)
        .attr("r", 3);

    vis.legend.append("text")
        .attr("class", "legend")
        .attr("id", "legend-1-text")
        .attr("x", (legendStartX + (legendLineLength * 2) + (legendSpacer * 3) + legendTextWidth))
        .attr("dy", legendTextY)
        .text("2014");



    /************
     * INITIALIZE MAIN SVG
     * **********/
    var svg = vis.svg = d3.select(vis.parentElement).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "center-block")
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");



    /************
     * INITIALIZE RING AND SPOKE GROUPS
     * **********/
    var ringGroup = vis.ringGroup = vis.svg.append("g")
        .attr("class", "r axis");

    var spokeGroup = vis.spokeGroup = vis.svg.append("g").attr("class", "a axis");


    /************
     * SCALES
     * **********/
    vis.values = d3.scale.linear().range([0, vis.radius]);

    vis.dimensions = d3.scale.ordinal();


    /************
     * RADIAL LINE GENERATOR
     * **********/
    vis.line = d3.svg.line.radial()
        .radius(function(d) {
            return (d[0]);
        })
        .angle(function(d) {
            return (d[1] * Math.PI / 180); // + (Math.PI / 2);
        });

    /************
     * TOOLTIPS
     * **********/
    vis.tip = d3.tip().attr('class', 'd3-tip radar').html(function(d) {
        return d;
    });
    vis.fetchData();
}



Radar.prototype.fetchData = function() {
    var vis = this;
    var demographicCode = vis.demographicCode = $("#radar-demo-picker").val();
    var demographicName = vis.demographicName = $("#radar-demo-picker option[value='" + demographicCode + "']").text();
    var itemCode = vis.itemCode = $("#radar-item-picker").val();
    var itemName = vis.itemName = $("#radar-item-picker option[value='" + itemCode + "']").text();


    //Get the data for the selected Demographic and Item
    var _data = ds.queryDemographic({
        demographic: demographicCode,
        item: itemCode
    });
    vis.data = ds.toDimensions(_data);
    vis.wrangleData();
}

// To avoid triggering the fetch data a bunch of time when we set many filters at once, we can throttle the function
// Radar.prototype.fetchData = _.throttle(Radar.prototype.fetchData, 500);


/*
 *  Data wrangling
 */

Radar.prototype.wrangleData = function() {
    var vis = this;

    //Fetch the years from the timeline
    vis.options.years = timeline.selectedYears();

    //Set the value type (adjusted dollars, raw dollars, etc)
    vis.valueType = d3.select("#value-type-radar").property("value");

    var allValues = vis.data.map(function(characteristic) {
        var valuesForCharacteristic = [];
        _.each(vis.options.years, function(selectedYear) {
            var yearData = _.where(characteristic.values, {
                year: selectedYear
            })[0];
            var value = yearData ? yearData[vis.valueType] : 0;
            valuesForCharacteristic.push(value);
        })
        return valuesForCharacteristic;
    });

    vis.maxValue = d3.max(_.flatten(allValues));

    // Update the visualization
    vis.updateVis();
}


/*
 *  The drawing function
 */

Radar.prototype.updateVis = function() {

    var vis = this;

    /************
     * LEGEND
     * **********/
    d3.select("#legend-0-text").text(vis.options.years[0]);
    d3.select("#legend-1-text").text(vis.options.years[1]);
    d3.select("#radar-title-item").text(vis.itemName + " by");
    d3.select("#radar-title-demographic").text(vis.demographicName);


    /************
     * SCALES
     * **********/
    vis.values
        .domain([0, vis.maxValue]);

    vis.dimensions
        .domain(vis.data.map(function(v, a, i) {
            return v.dimension;
        }))
        .range(d3.range(0, 360, (360 / vis.data.length)));


    /************
     * RINGS
     * **********/
    var rings = vis.ringGroup.selectAll("g")
        .data(vis.values.ticks(5).slice(1));

    rings
        .enter()
        .append("g")
        .attr("class", "ring");

    rings.exit().remove();

    //Circles
    rings.selectAll("circle").remove();
    rings
        .append("circle")
        .attr("r", vis.values);


    //Labels
    rings.selectAll("text").remove();
    rings.append("text")
        .attr("y", function(d) {
            return -vis.values(d) - 4;
        })
        .attr("transform", "rotate(" + (vis.dimensions.range()[1] / 2) + ")") //ring labels halfway btwn noon and 1
        .style("text-anchor", "middle")
        .text(function(d) {
            return vis.formatValue(d);
        });




    /************
     * VALUE LINES
     * **********/

    vis.svg.selectAll(".radar-plot-line").remove();
    _.each(vis.options.years, function(plotYear, ix, array) {
        var vis = this;
        var yearLineData = vis.data.map(function(v, a, i) {
            var yearData = _.where(v.values, {
                year: plotYear
            })[0];
            var value = yearData ? yearData[vis.valueType] : 0;
            if (value !== 0) {
                return [
                    vis.values(value),
                    vis.dimensions(v.dimension)
                ];
            } else {
                return [];
            }
        });
        var yearData = _.where(vis.data[0].values, {
            year: plotYear
        })[0];
        var value = yearData ? yearData[vis.valueType] : 0;
        if (value !== 0) {
            yearLineData.push([
                vis.values(value),
                vis.dimensions(vis.data[0].dimension)
            ]);
        }

        yearLineData = yearLineData.filter(function(v){return (v.length > 0);});

        vis.svg.append("g")
            .attr("class", "radar-plot-line")
            .attr("id", "plot-" + plotYear)
            .append("path")
            .datum(yearLineData)
            .attr("class", "line plot-" + ix)
            .attr("d", vis.line);
    }, vis);



    /************
     * SPOKES
     * **********/
    //Groups
    var spokes = vis.spokeGroup
        .selectAll("g")
        .data(vis.data);

    spokes
        .enter()
        .append("g");

    spokes
        .attr("transform", function(d) {
            return "rotate(" + (vis.dimensions(d.dimension) - 90) + ")";
        });

    spokes.exit().remove();

    //Lines
    spokes.selectAll("line").remove();
    spokes.append("line")
        .attr("class", "spoke")
        .attr("x2", vis.radius);

    //Value Point - added here because can't attach event handlers to svg 'path markers'
    spokes.selectAll("circle").remove();
    vis.svg.selectAll(".d3-tip .radar").remove();
    for (var i = 0; i < vis.options.years.length; i++) {
        var plotYear = vis.options.years[i];
        spokes.append("circle")
            .attr("class", "marker-circle plot-" + i)
            .attr("cx", function(d) {
                var yearData = _.where(d.values, {
                    year: plotYear
                })[0];
                var value = yearData ? yearData[vis.valueType] : 0;
                $.data(this, "value", value);
                $.data(this, "year", plotYear);
                return vis.values(value);
            })
            .attr("cy", 0)
            .attr("r", 5)
            .on("mouseenter", function(e) {
                var unitSymbol = (vis.valueType == "percen")
                var displayValue = $.data(this, "value") == 0 ? "No Data" : vis.formatValue(Math.round($.data(this, "value")));
                vis.tip.show($.data(this, "year") + "<br>" + radarDimensionName(e.dimension) + "<br>" + displayValue);
            })
            .on("mouseout", function(e) {
                vis.tip.hide();
            })
            .call(vis.tip);
    }



    //Labels
    if (vis.options.showLabels) {
        spokes.selectAll("text").remove();
        spokes.append("text")
            .attr("x", vis.radius + 10)
            .attr("dy", ".35em")
            .style("text-anchor", function(d) {
                return "middle";
                //return vis.dimensions(d.dimension) < 360 && vis.dimensions(d.dimension) > 180 ? "end" : null;
            })
            .attr("transform", function(d) {
                var position = vis.dimensions(d.dimension);
                var rotation = position < 270 && position > 90 ? "-90" : "90";
                return "rotate(" + rotation + " " + (vis.radius + 10) + ",0)";
            })
            .text(function(d) {
                return radarDimensionName(d.dimension);
            });
    }



}

Radar.prototype.formatValue = function(value){
    var vis = this;
    var prefix = suffix = "";
    if (_.contains(['adjustedValue', 'value'], vis.valueType))
        prefix = "$";
    if (vis.valueType === "valuePercentIncome")
        suffix = "%";
    return prefix + value.toString() + suffix;
}


function radarDimensionName(fullDimensionLabel) {
    return fullDimensionLabel.split("-").splice(2, 99).join("-");
}
