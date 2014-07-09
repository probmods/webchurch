/* global $, require */

// var d3 = require("d3");
// d3 = require("d3");
// var vega = require("./vega.js");
var format_result = require("./util").format_result;
var _ = require("underscore"); 
var typeUtils = require("./type-utils");
var listToArray = typeUtils.listToArray;
var arrayToList = typeUtils.arrayToList; 

var maxBins = 20;
var titleOffset = 24;
var liveDelay = 50;

// input: list of rows. each row is itself a list
table = function(rows, title) {
    var arrayRows = listToArray(rows).map(function(cols) { return listToArray(cols) });

    sideEffects.push({type: 'table', data: arrayRows});
}

var horz_rect_marks = {
    type: "rect",
    from: {data:"table"},
    properties: {
        enter: {
            x: {scale:"x", field:"data.value"},
            x2: {scale:"x", value:0},
            y: {scale:"y", field:"data.item"},
            height: {scale:"y", band:true}
        },
        update: {fill: {value: "steelblue"} }
    }
}

var make_spec = function(padding, width, height, data, scales, axes, marks, title) {
    var spec = {padding: padding, width: width, height: height, data: data, scales: scales, axes: axes, marks: marks};
    if (title) {
        spec.marks.push({
            type: "text",
            properties: {
                enter: {
                    x: {value: spec.width * 0.5},
                    y: {value: -titleOffset*0.5},
                    fontSize: {value: 24},
                    text: {value: title},
                    align: {value: "center"},
                    baseline: {value: "bottom"},
                    fill: {value: "#000"}
                }
            }
        });
    }
    return spec;
}

var live_render = function(n, func, spec_maker, title) {
    var el = create_and_append_result();
    var i = 0;
    var samps = [];
    var time;

    var render = function() {
        var tmp_title = (i == n) ? title : (title || "") + "("+i+"/"+n+")";
        render_vega(spec_maker(samps, tmp_title), el);
    }

    var execute = function() {
        var iterate = function() {
            i++;
            try {
                samps.push(func());
            } catch (e) {
                kill();
            }
        }
        time = Date.now();
        while (Date.now() - time < liveDelay && i < n) {
            iterate();
        }
        if (i >= n) kill();
    }

    var kill = function() {
        clearInterval(render_pid);
        clearInterval(execute_pid);
        render();
    }
    render();
    var render_pid = setInterval(render, liveDelay);
    var execute_pid = setInterval(execute, liveDelay);  
}

var render_vega = function(spec, element) {
    vg.parse.spec(spec, function(chart) {chart({el:element, renderer:"svg"}).update();});
}

var create_and_append_result = function() {
    var el = document.createElement("div");
    $results.append(el);
    return el;
}

function Counter(arr) {
    this.counter = {};
    this.total = 0;
    this.type = "number";
    this.min = Number.MAX_VALUE;
    this.max = Number.MIN_VALUE;
    if (arr) this.update_many(arr);
};

Counter.prototype.update = function(item) {
    if (typeof item == "number") {
        this.min = Math.min(this.min, item);
        this.max = Math.max(this.max, item);
    } else {
        this.type = "string";
    }
    var key = format_result(item);
    this.counter[key] = (this.counter[key] || 0) + 1;
    this.total++;
}

Counter.prototype.update_many = function(arr) {
    for (var i = 0; i < arr.length; i++) {this.update(arr[i]);}
}

Counter.prototype.sorted_keys = function() {
    if (this.type == "number") {
        return Object.keys(this.counter).sort(function(a,b) {return b-a});
    } else {
        return Object.keys(this.counter).sort();
    }
}

Counter.prototype.keys = function() {
    if (this.type == "number") {
        return Object.keys(this.counter).map(Number);
    } else {
        return Object.keys(this.counter);
    }
}

Counter.prototype.count = function(item) {
    return this.counter[item];
}

Counter.prototype.bin = function() {
    var sorted_keys = this.sorted_keys().map(Number);
    var bin_size = (this.max - this.min) / maxBins;
    var new_counter = {};
    // TODO: A better binning system
    for (var i = 0; i < sorted_keys.length; i++) {
        var bin = Math.floor((sorted_keys[i] - this.min) / bin_size);
        bin = Math.min(bin, maxBins - 1);
        new_counter[bin*bin_size] = (new_counter[bin*bin_size] || 0) + this.count(sorted_keys[i]);
    }
    this.counter = new_counter;
    this.binned = true;
}

// barplot (data should be a list with two elements)
// first element is items, second element is values
// e.g., (barplot '((1 2 3) (4 5 6)))
barplot = function(data, title) {
    var myData = listToArray(data, true);
    
    
    var items = myData[0].map(format_result);
    var values = myData[1];

    var spec_values = [];
    for (var i = 0; i < items.length; i++) {
        spec_values.push({item: items[i], value: values[i]});
    }

    var padding = {
        top: 30 + (title ? titleOffset : 0),
        left: 20 + Math.max.apply(undefined, items.map(function(x) {return x.length;})) * 5,
        bottom: 50, right: 30};
    var height = 1 + items.length * 20;
    var width = 600 - padding.left;
    var data = [{name: "table", values: spec_values}];
    var scales = [
            {name: "x", range: "width", nice: true, domain: {data:"table", field:"data.value"}},
            {name: "y", type: "ordinal", range: "height", domain: {data:"table", field:"data.item"}, padding: 0.1}];
    var axes = [
        {type:"x", scale:"x", ticks: 10},
        {type:"y", scale:"y"}];
    var marks = [horz_rect_marks];

    render_vega(make_spec(padding, width, height, data, scales, axes, marks, title),
                create_and_append_result()
               );
}

var make_hist_spec = function(samps, title) {
    var counter = new Counter(listToArray(samps));
    if (counter.type == "number" && Object.keys(counter.counter).length > maxBins) counter.bin();

    var sorted_keys = counter.sorted_keys();

    var spec_values = sorted_keys.map(function(key) {return {item: key, value: counter.count(key) / counter.total}});

    var padding = {
        top: 30 + (title ? titleOffset : 0),
        left: 20 + Math.max.apply(undefined, sorted_keys.map(function(x) {return x.length;})) * 5,
        bottom: 50,
        right: 30};
    var height = 1 + sorted_keys.length * 20;
    var width = 600 - padding.left;
    var data = [{name: "table", values: spec_values}];
    var scales = [
            {name: "x", range: "width", nice: true, domain: {data:"table", field:"data.value"}},
            {name: "y", type: "ordinal", range: "height", domain: {data:"table", field:"data.item"}, padding: 0.1}];
    var axes = [{type:"x", scale:"x", ticks: 10, format: "%"}]
    var marks = [horz_rect_marks];
    if (counter.binned) {
        scales.push({name: "y_labels", nice: true, range: "height", domain: {data:"table", field:"data.item"}, padding: 0.1});
        axes.push({type:"y", scale:"y_labels"});
    } else {
        axes.push({type:"y", scale:"y"});
    }
    return make_spec(padding, width, height, data, scales, axes, marks, title);
}

hist = function(samps, title) {
    render_vega(make_hist_spec(samps, title), create_and_append_result());
}

livehist = function(n, func, title) {
    live_render(n, func, make_hist_spec, title);
}

var make_density_spec = function(samps, title, with_hist) {
    function kernelDensityEstimator(counter, kernel, scale) {
        var density_values = [];
        var keys = Object.keys(counter.counter);
        for (var i = 0; i <= maxBins; i++) {
            var x = counter.min + (counter.max - counter.min) / maxBins * i;
            var kernel_sum = 0;
            for (var j = 0; j < keys.length; j++) {
                kernel_sum += kernel((x - keys[j]) / scale) * counter.count(keys[j]);
            }
            density_values.push({item: x, value: kernel_sum / samps.length / scale});
        }
        return density_values;
    }

    function epanechnikovKernel(u) {
            return Math.abs(u) <= 1 ? .75 * (1 - u * u) : 0;
    }

    var counter = new Counter(listToArray(samps));

    var padding = {top: 30 + (title ? titleOffset : 0), left: 45, bottom: 50, right: 30};
    var data = [{name: "density", values: kernelDensityEstimator(counter, epanechnikovKernel, 3)}];
    var height = 300;
    var width = 600 - padding.left;
    var scales = [
            {name: "x_density", type: "ordinal", range: "width", domain: {data:"density", field:"data.item"}, padding: 0.1},
            {name: "x_labels", nice: true, range: "width", domain: {data:"density", field:"data.item"}, padding: 0.1},
            {name: "y", range: "height", nice: true, domain: {data:"density", field:"data.value"}}];
    var axes = [
        {type:"x", scale:"x_labels"},
        {type:"y", scale:"y", ticks: 10, format: "%"}];
    var marks = [{
            type: "line",
            from: {data:"density"},
            properties: {
                enter: {
                    x: {scale:"x_density", field: "data.item"},
                    y: {scale:"y", field: "data.value"},
                    strokeWidth: {value: 3},
                    stroke: {value: "black"}
                }
            }
    }];

    if (with_hist) {
        counter.bin();
        var hist_data = counter.keys().map(function(key) {return {item: key, value: counter.count(key) / counter.total}});
        data.push({name: "hist", values: hist_data});
        scales.push({name: "x_hist", type: "ordinal", range: "width", domain: {data:"hist", field:"data.item"}, padding: 0.1});
        marks.unshift({
            type: "rect",
            from: {data: "hist"},
            properties: {
                enter: {
                    x: {scale:"x_hist", field: "data.item"},
                    width: {scale:"x_hist", band: true},
                    y: {scale:"y", field: "data.value"},
                    y2: {scale:"y", value: 0}
                },
                update: {fill: {value: "steelblue"}}
            }
        })
    }

    return make_spec(padding, width, height, data, scales, axes, marks, title);
}

density = function(samps, title, with_hist) {
    render_vega(make_density_spec(samps, title, with_hist), create_and_append_result());
}

livedensity = function(n, func, title, with_hist) {
    live_render(n, func, function(samps, title) {return make_density_spec(samps, title, with_hist)}, title);
}

var make_plot_spec = function(data, title) {
    var padding = {top: 30 + (title ? titleOffset : 0), left: 45, bottom: 50, right: 30};
    var data_values = listToArray(data).map(function(datum) {return {x: datum[0], y: datum[1]}});
    var data = [{name: "points", values: data_values}];
    var height = 300;
    var width = 600 - padding.left;
    var scales = [
            {name: "x", range: "width", nice: true, domain: {data:"points", field:"data.x"}},
            {name: "y", range: "height", nice: true, domain: {data:"points", field:"data.y"}},
            {name: "y_labels", reverse: true, range: "height", nice: true, domain: {data:"points", field:"data.y"}}];
    var axes = [
        {type:"x", scale:"x", offset: {scale: "y_labels", value: 0}},
        {type:"y", scale:"y", offset: {scale: "x", value: 0}}];
    var marks = [{
        type: "symbol",
        from: {data:"points"},
        properties: {
            enter: {
                x: {scale:"x", field: "data.x"},
                y: {scale:"y", field: "data.y"},
                size: {value: 50},
                fill: {value:"steelblue"},
                fillOpacity: {value: 0.8}
            }
        }
    }];
    return make_spec(padding, width, height, data, scales, axes, marks, title);
}

scatter = function(samps, title) {
    render_vega(make_plot_spec(samps, title), create_and_append_result());
}

livescatter = function(n, func, title) {
    live_render(n, func, make_plot_spec, title);
}

var make_lineplot_spec = function(data, title) {
    var spec = make_plot_spec(data, title);
    spec.marks.push({
        type: "line",
        from: {data:"points", transform: [{type: "sort", by: "data.x"}]},
        properties: {
            enter: {
                x: {scale:"x", field: "data.x"},
                y: {scale:"y", field: "data.y"},
                stroke: {value: "steelblue"},
                strokeWidth: {value: 2}
            }
        }
    });
    // spec.axes.map(function(axis) {delete axis.offset})
    return spec;
}

lineplot = function(samps, title) {
    render_vega(make_plot_spec(samps, title), create_and_append_result());
}

livelineplot = function(n, func, title) {
    live_render(n, func, make_lineplot_spec, title);
}

multiviz = function() {
};


module.exports = {
    hist: hist
}
