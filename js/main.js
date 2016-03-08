angular.module('iterograph', ['ngRoute', 'ngAnimate', 'ui.bootstrap'])

.config(function ($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'partial/main.html',
            controller: 'GraphController',
            controllerAs : 'graph'
        })
        .otherwise({
            redirectTo: '/'
        });
})

.constant('config', {
})

.service('svgManipulator', function() {
    return {
        'toPNG' : toPNG
    }

    function toPNG(svgElement, config, cb) {
        var svg = d3.select(svgElement.cloneNode(true)),
            width = config.dimension,
            height = config.dimension,
            //svgWidthAttr = svg.style('width'),
            svgComputedWidth = d3.select(svgElement).node().getBoundingClientRect().width,
            scaleFactor = width / svgComputedWidth,
            background = svg.style('background-color');
        /*var filterFe = svg.select('#roughpaper').select('feDiffuseLighting'),
            filterParam = filterFe.attr('surfaceScale');*/

        // Append filter defs
        var filterDefs = document.querySelector('#svg-filter-defs');
        filterDefs && svg.append('defs').html(filterDefs.innerHTML);

        svg.attr('width', width);
        svg.attr('height', height);
        //!gallery.filtered && svg.style('background-color', 'none');
        config.transparent && svg.style('background', 'none');
        svg.selectAll('.shape-group')
            .style('stroke-width', function(d) {
                return parseFloat(d3.select(this).style('stroke-width')) * scaleFactor
            });
        //filterFe.attr('surfaceScale', filterParam * scaleFactor);

        var svgData = new XMLSerializer().serializeToString( svg.node() );

        /*svg.attr('width', null);
        svg.attr('height', null);
        svg.style('background-color', background);
        svg.selectAll('.shape-group')
            .style('stroke-width', function(d) {
                return parseFloat(d3.select(this).style('stroke-width')) / scaleFactor
            });*/
        //filterFe.attr('surfaceScale', filterParam );

        var canvas = document.createElement( "canvas" );
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext( "2d" );

        var img = document.createElement( "img" );
        img.setAttribute( "src", "data:image/svg+xml;base64," + btoa( svgData ) );

        img.onload = function() {
            ctx.drawImage( img, 0, 0 );
            //window.open(canvas.toDataURL('image/png'));
            cb(canvas.toDataURL('image/png'), img, ctx.getImageData(0,0,width,height).data);
        }
    }
})

.controller('GraphController',
            ['$scope', '$routeParams', 'graphSettings', function($scope, $routeParams, graphSettings) {
    var graph = this;

    graph.style = graphSettings.style;
    graph.lock = graphSettings.lock;
    graph.layers = graphSettings.layers;
    // graph.filtered = graphSettings.filtered;
    //graph.background = graphSettings.background;
    graph.propertyDef = graphSettings.propertyDef;
    graph.selectedLayerIdx = 0;
    graph.loading = true;

    init();

    function init() {
        var imageID = $routeParams.imageID;

        graphSettings.layers.splice(0, graphSettings.layers.length)
        if (imageID) {
            var imageURL = 'http://i.imgur.com/' + imageID + '.png'  + '?' + new Date().getTime();
            var image = new Image();
            image.src = imageURL;
            image.crossOrigin = "";
            image.onload = function() {
                var data = steg.decode(image);
                if (data) {
                    var settings = JSON.parse(data);
                    graphSettings.loadData(settings);
                } else {
                    console.log('Unable to find settings in image data. Use random.');
                    graphSettings.addRandomLayer();
                }
                graph.loading = false;
                $scope.$apply();
            }
            image.onerror = function() {
                console.log('Unable to load image. Use random.');
                graphSettings.addRandomLayer();
                graph.loading = false;
                $scope.$apply();
            }
        } else {
            graphSettings.addRandomLayer();
            graph.loading = false;
        }
    }

    graph.addScaleColor = function (scale) {
        graphSettings.addScaleColor(scale)
    }

    graph.removeScaleColor = function (scale) {
        graphSettings.removeScaleColor(scale)
    }

    graph.addLayer = function() {
        //graph.layers.push(angular.copy(graph.layers[graph.selectedLayerIdx]));
        graphSettings.addLayer(angular.copy(graph.layers[graph.selectedLayerIdx]));
        graph.selectedLayerIdx = graph.layers.length-1;
    }

    graph.removeCurrentLayer = function() {
        graph.layers.splice(graph.selectedLayerIdx, 1);
        graph.selectedLayerIdx = graph.layers.length-1;
    }

    graph.randomize = function(layer) {
        var l = layer || graph.layers[graph.selectedLayerIdx];
        graphSettings.randomizeLayer(l);
    }

    graph.clear = function(layer) {
        var l = layer || graph.layers[graph.selectedLayerIdx];
        graphSettings.clearLayer(l);
    }

    graph.selectLayer = function(idx) {
        graph.selectedLayerIdx = idx;
        $scope.$apply();
    }

    graph.selectedLayerIdx = 0;
}])

.directive('scaleInput', [function() {
    return {
        restrict: 'EA',
        scope: {
            'data' : '=',
            'type' : '@',
            'max'  : '='
        },
        link: function(scope, element, attrs) {

            scope.type = scope.type || 'none';

            function f(a, fn) {
                return function(d) {
                    return fn ? fn(d[a]) : d[a];
                }
            }

            /*var tip = d3.tip().attr('class', 'd3-tip').html(function(d) {
                        return Math.round(d.x*100) + '% :' + Math.floor(d.y);
                      });*/

            var boxSize = {w:200,h:100},
                margin = 20,
                width = boxSize.w-margin;//svg.node().offsetWidth-margin,
                height = boxSize.h-margin;//svg.node().offsetHeight-margin;
            //d3.select(element[0]).append('input')
            var svg = d3.select(element[0])
                .append("svg")
                    .attr("viewBox", "0 0 "+boxSize.w+" "+2*margin)
                    .attr("preserveAspectRatio", "xMidYMid meet")
                    .style({
                        'background' :  '#FFF',
                        'width': '100%'
                    })
                //.call(tip)
                .on('dblclick', function() {
                    var coord = d3.mouse(this);
                    var point = {x:x.invert(coord[0]), y:y.invert(coord[1])};
                    var i = 0;
                    while (point.x > scope.data.domain[i]) {i++}
                    addPoint(i,point);
                    //render();
                })
                .on('mouseenter', expand)
                .on('mouseleave', collapse);

            var dragging = false, out = true;;

            function collapse() {
                out = true;
                if (dragging) {
                    return;
                }
                svg.transition().duration(500).attr('viewBox', "0 0 "+boxSize.w+" "+2*margin);
                    y .range([margin,margin]);
                    svg.select('.scale-area').style('opacity', 0);
                    svg.select('.x.axis').transition().style('opacity', 0);
                    render(true);
            }

            function expand() {
                out = false;
                svg.transition().duration(500).attr('viewBox', "0 0 "+boxSize.w+" "+boxSize.h);
                    y.range([boxSize.h-margin, margin])
                    svg.select('.scale-area').style('opacity', 1);
                    svg.select('.x.axis').transition().style('opacity', 1);
                    render(true);
            }

            var x = d3.scale.linear()
                        .domain([0,1])
                        .range([margin,width])
                        .clamp(true);
            var y = d3.scale.linear()
                        .domain([0,scope.max])
                        //.range([height, margin])
                        .range([margin,margin])
                        .clamp(true);
            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(10)
                .tickSize(-height+margin)
                .tickPadding(10)
                .tickFormat(function(d) {
                    if (d==0) {
                        return '0%';
                    }
                    if (d==1) {
                        return '100%';
                    }
                    return '';
                });

            var yAxis = d3.svg.axis()
                .scale(y)
                .ticks(4)
                .orient("right");

            var drag = d3.behavior.drag()
                            .on("drag", dragged)
                            .on("dragstart", function() {dragging=true})
                            .on("dragend", function() {
                                dragging=false
                                if (out) {
                                    collapse();
                                }
                            });

            var lineFunction = d3.svg.line()
                          .x(f('x', x))
                          .y(f('y', y))
                          .interpolate("linear");

            var areaFunction = d3.svg.area()
                          .x(f('x', x))
                          .y0(f('y', y))
                          .y1(height)
                          .interpolate("linear");

            var size = d3.scale.linear()
                        .domain([0,scope.max])
                        .range([4, 15])
                        .clamp(true);
            var stroke = d3.scale.linear()
                        .domain([0,scope.max])
                        .range([0, 8])
                        .clamp(true);

            svg.append('path')
                .attr('class', 'scale-area')
                .style({
                    'fill' : '#EEE',
                    'opacity' : 0
                });

            svg.append("g")
                  .attr("class", "x axis")
                  .attr("transform", "translate(0," + height + ")")
                  .style('opacity', 0)
                  .call(xAxis);

            svg.append("g")
                  .attr("class", "y axis")
                  //.attr("transform", "translate(" + width + ",0)")
                  .call(yAxis);
            

            svg.append('path')
                .attr('class', 'scale-line')
                .style({
                    'stroke-width' : 2,
                    'stroke' : 'grey',
                    'fill' : 'none'
                });

            var text = svg.append('text')
                .attr('class', 'scale-info')
                .attr('y', 10)

            function updateInfoText(d) {
                text.text( Math.floor(d.y)+' at '+Math.round(d.x*100) + '% ');
            }

            function dragged(d,i) {
                    d.y = y.invert(d3.event.y) ; //y.invert(height+d3.event.y);
                    if (i>0 && i<scope.data.domain.length-1) {
                        d.x = x.invert(d3.event.x);
                    }
                    scope.$apply(function(){
                        scope.data.range[i]=d.y;
                        scope.data.domain[i]=d.x;
                    });
                    updateInfoText(d);
            }

            function addPoint(i,p) {
                //data.splice(i, 0, p);
                scope.$apply(function(){
                    scope.data.range.splice(i,0,p.y);
                    scope.data.domain.splice(i,0,p.x);
                });
            }
            function removePoint(i) {
               // data.splice(i,1);
                scope.$apply(function(){
                    scope.data.range.splice(i,1);
                    scope.data.domain.splice(i,1);
                });
            }

            var baseStrokeColor = "#222";
            var baseFillColor = "white";
            var typeProp = {
                'none' : {
                    attr : {},
                    style : {}
                },
                'size' : {
                    attr : {
                        r : f('y', size)
                    },
                    style : {
                        'stroke' : baseStrokeColor,
                        'fill' : baseFillColor
                    }
                },
                'stroke' : {
                    attr : {
                    },
                    style : {
                        'stroke' : baseStrokeColor,
                        'fill' : baseFillColor,
                        'stroke-width' : f('y', stroke)
                    }
                },
                'distance' : {
                    attr : {
                        r : f('y', size)
                    },
                    style : {
                        'stroke' : baseStrokeColor,
                        'fill-opacity' : 0,
                        'stroke-dasharray' : '1 1'
                    }
                },
                'angle' : {
                    attr : {
                        'transform' :  function(d) {
                            return 'rotate('+d.y+')';
                        },
                    },
                    style : {
                        'stroke' : baseStrokeColor,
                        'fill' : baseFillColor,
                        'stroke-dasharray' : '2 100',
                        'stroke-width' : 15
                    }
                }
           }

           /*function updateVisu(selection) {
                console.log(selection);

           }*/

            function render(smooth) {
                var data = scope.data.domain.map(function(e,i) {return {x:e,y:scope.data.range[i]}})
                var point = svg.selectAll('.point').data(data);
                var newPoint = point.enter().append('g')
                                    .attr('class', 'point')
                                    .call(drag);
                                    /*.on('mouseover', tip.show)
                                    .on('mouseout', tip.hide);*/
                                    /*.on('mouseenter', function(d) {
                                        updateInfoText(d);
                                        text.style('visibility', 'visible');
                                    })
                                    .on('mouseleave', function(d) {
                                        text.style('visibility', 'hidden');
                                    });*/
                newPoint.append('circle')
                        .attr({
                            class : 'visu',
                            r : 10
                        })
                        .style({
                            'stroke-width' : 2
                        })
                newPoint.append('circle')
                        .attr({
                            class : 'control',
                            r : 5
                        })
                        .style({
                            fill : 'grey'
                        })
                        
                        .on('dblclick', function(e,i) {
                            d3.event.stopPropagation();
                            if (i>0 && i<scope.data.domain.length-1) {
                                removePoint(i);
                            }
                            //render();
                        })

                
                
                point
                    .transition()
                    .duration(smooth?500:0)
                    .attr('transform', function(d) {return 'translate('+[x(d.x), y(d.y)]+')'})

                point.select('.visu')
                    .attr(typeProp[scope.type].attr)
                    .style(typeProp[scope.type].style);

                point.exit().remove();

                svg.select('.scale-line')
                    .transition()
                    .duration(smooth?500:0)
                    .attr('d', lineFunction(data));
                svg.select('.scale-area')
                    .transition()
                    .duration(smooth?500:0)
                    .attr('d', areaFunction(data))
            }

            scope.$watch('data', function(newVals, oldVals) {
                render();
            }, true);
        }
    };
}])


//  parser that coerces the range value to a number
.directive('input', function() {
    return {
        restrict: 'E',
        require: '?ngModel',
        link: function(scope, element, attrs, ngModel) {
            if ('type' in attrs && attrs.type.toLowerCase() === 'range') {
                ngModel.$parsers.push(parseFloat);
            }
        }
    };
})

.directive('filtered', function() {
    return {
        restrict: 'A',
        /*scope: {
            "filterActive" : '='
        },*/
        link: function(scope, element, attrs) {
            var svg = d3.select(element[0]).select('svg');
            var viewbox = svg.attr('viewBox').split(' ');

            /* 
                Add the rect with the filter.
                The -1 and 101% are here to have a little bigger rect than the view
                in order to avoid a glinch on the edge of the svg (firefox)
            */
            var rect = svg.append('rect')
            //svg.insert('rect', ':first-child')
                .attr({
                    x : +viewbox[0] - 1,
                    y : +viewbox[1] - 1,
                    /*x : 0,
                    y:0,*/
                    //width : +viewbox[2],
                    //height : +viewbox[3],
                    width:'101%',
                    height:'101%'
                })
                .style({
                    filter : 'url(#roughpaper)',
                    opacity : 0.2,
                    'pointer-events' : 'none'
                })


             scope.$watch(attrs.filtered, function(newVal, oldVal) {
                rect.attr('display', newVal ? 'block' : 'none');
             }, false);

            /*
                DEFS
            */
             var defs = svg.append('defs');

             /* Roughpaper Filter */

            var paperFilter = defs.append( 'filter' )
                             .attr({
                                'id': 'roughpaper',
                                'x':'0%',
                                'y':'0%',
                                'width':'100%',
                                'height':'100%',
                                filterRes:"400 400"
                             });

            paperFilter.append( 'feTurbulence' )
                    .attr({
                        type:'fractalNoise',
                        baseFrequency:0.04,
                        numOctaves:5,
                        result:'noise'
                    })

            paperFilter.append( 'feDiffuseLighting' )
                        .attr({
                            'in':'noise',
                            'lighting-color' : 'white',
                            'surfaceScale':2,
                            result : 'diffLight'
                        })
                    .append('feDistantLight')
                        .attr({
                            azimuth : 45,
                            elevation:35
                        })
        }
    };
})

.directive('locker', [function() {
    return {
        restrict: 'EA',
        scope: {
            'target' : '='
        },
        template:'<span class="glyphicon glyphicon-lock pull-left" aria-hidden="true" ng-class="{locked:target}" ng-click="target=!target"></span>'
    }
}])

.service('downloadService',function(svgManipulator){
        var srv = this;
        srv.data = undefined;

        srv.loadData = function(svgElement, dimension) {
            svgManipulator.toPNG(
              svgElement,
              {dimension : dimension, transparent : false},
              function(pngData, svgImage) {
                srv.data = pngData;
            })
        }
})

;