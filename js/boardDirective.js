angular.module('iterograph')

.directive('mainBoard', [function() {
    return {
        restrict: 'EA',
        scope: {
            'layers' : '=',
            'background' : '=',
            'onclickLayer' : '&'
        },
        link: function(scope, element, attrs) {
            /*d3Service.d3().then(function(d3) {
              // our d3 code will go here
            });*/
            var boardSize = 400;
            var svgWrapper = d3.select(element[0])
                                .append("svg")
                                    .attr("viewBox", "0 0 "+(boardSize)+" "+(boardSize))
                                    .attr("preserveAspectRatio", "xMidYMid meet")
                                    .style('background-color', 'white')
                                    //.style('mask', 'url(#filterMask)');
            var svg = svgWrapper
                        .append("svg")
                            .attr('id', 'main-board')
                            .attr("viewBox", "-"+boardSize/2+" -"+boardSize/2+" "+boardSize+" "+boardSize)
                            .attr("preserveAspectRatio", "xMidYMid meet")
                            .style({
                                'width': '100%',
                                //'border': '10px double #222',
                                //'mask' : 'url(#filterMask)',
                                //'filter' : 'grayscale(100%)'

                            });

            // Browser onresize event
            window.onresize = function() {
                /*if (svg.attr('height') != svg.node().offsetWidth) {
                        svg.attr('height', svg.node().offsetWidth);
                    }*/
                //scope.$apply();
            };

            /*
                WARNING : bug when remove animated layer
                TODO do not manage by layer idx but uid + clear when remove layer
            */
            var animator = [];
            function animate(idx, on) {
                var angle = 0;
                function rotateLayer(a) {
                    svg.select('#layer-'+scope.layers[idx].uid)
                        .select('.anim-group')
                            .attr('transform', function() {return 'rotate('+a+')'})
                }
                if (on) {
                    animator[idx] = setInterval(function() {
                            angle+=scope.layers[idx].angle; angle%=360;
                            rotateLayer(angle);
                    }, 1000/30)
                } else {
                    clearInterval(animator[idx]);
                    rotateLayer(0);
                }
            }

            // watch for data changes and re-render
            scope.$watch('layers', function(newVals, oldVals) {
                for (var i=0;i<newVals.length&&i<oldVals.length; i++) {
                    var uid = newVals[i].uid;
                    if (newVals[i].shape != oldVals[i].shape) {
                        d3.select('#layer-'+uid).selectAll('.shape-group').remove();
                    }
                    if (newVals[i].scale != oldVals[i].scale
                        || newVals[i].translate != oldVals[i].translate) {
                        layerZoom[uid].scale(newVals[i].scale);
                        layerZoom[uid].translate(newVals[i].translate);
                        //layerZoom[uid].event(d3.select('#layer-'+uid));
                        layerTransform('#layer-'+uid, newVals[i]);
                    }
                    if (newVals[i].animated != oldVals[i].animated) {
                        animate(i, newVals[i].animated);
                    }
                }
                return scope.render(newVals);
            }, true);

            scope.$watch('background', function(bg) {
                svgWrapper.style('background-color', bg);
            })

            function appendShape(selection,shape) {
                var shapeDef = {
                    'ellipse' : {
                        tag : 'ellipse',
                        attr : {
                            rx : 1,
                            ry : 1*shape.ratio
                        }
                    },
                    'rectangle' : {
                        tag : 'rect',
                        attr : {
                            x : -1,
                            y : -1*shape.ratio,
                            width : 2,
                            height : 2*shape.ratio
                        }
                    },
                    'triangle' : {
                        tag : 'path',
                        attr : {
                            "d" : d3.svg.symbol().type('triangle-up').size(2),
                            "transform" : "scale("+shape.ratio+",1)"
                        }
                    },
                    'line' : {
                        tag : 'line',
                        attr : {
                            x1 : -1,
                            y1 : 0,
                            x2 : 1,
                            y2 : 0,
                        }
                    },
                }[shape.type];

                selection.append(shapeDef.tag)
                    .attr('class', 'shape')
                    .attr(shapeDef.attr)
                /*selection.append('text')
                    .attr('class', 'shape')
                    .attr({
                        'font-size' : 1,
                        'dy' : '.3em'
                    })
                    .style('text-anchor', 'middle')
                    .text('ABC')*/
            }

            var colorScales = {
                'c20' : d3.scale.category20()
            }
            function createColorScale(settings) {

            }

            function createScale(scaleSettings) {
                return d3.scale.linear()
                    .domain(scaleSettings.domain)
                    .range(scaleSettings.range);
            }

            function drawLayer(settings) {
                var sizeScale = createScale(settings.sizeScale),
                    distanceScale = createScale(settings.distanceScale),
                    strokeScale = createScale(settings.strokeScale),
                    rotationScale = createScale(settings.rotationScale);

                var colorScale = d3.scale[settings.colorScale.type]()
                                    .domain(settings.colorScale.domain)
                                    .range(settings.colorScale.range);

                // Return the ratio for iteration it
                function iterRatio(it) {
                    // retrocompatibity with first version bad ratio calculation
                    return settings.version ? it/Math.max(1, settings.iteration-1)
                                            : (it+1)/settings.iteration;
                }

                function color(elem) {
                    return function(d) {
                        return {
                            'none' : 'none',
                            'constant' : settings[elem+'Style'].color,
                            'palette' : colorScale(iterRatio(d))
                        }[settings[elem+'Style'].colorType];
                    }
                }

                var gShape = d3.select(this).selectAll('.shape-group').data(d3.range(settings.iteration));
                var newShapeGroup = gShape.enter()
                    .append('g')
                      .attr('class', 'shape-group');
                newShapeGroup
                    .call(appendShape, settings.shape);

                newShapeGroup.selectAll('.shape')
                    .attr('vector-effect', 'non-scaling-stroke');

                gShape
                    .attr('transform', function(d) {
                        var ratio = iterRatio(d);
                        var transform = "rotate("+((d*settings.angle)%360)+")";
                        transform += " ";
                        transform += "translate("+distanceScale(ratio)+",0)";
                        transform += " ";
                        /*var transform = "translate("+[x((d+1)/settings.iteration),y((d+1)/settings.iteration)]+")";
                        transform += " ";*/
                        transform += "scale("+sizeScale(ratio)+")";
                        transform += " ";
                        //transform += "rotate("+((settings.shapeRotation + d*settings.stepRotation)%360)+")";
                        transform += "rotate("+rotationScale(ratio)+")";
                        
                        return transform;
                    })
                    .style({
                        //'filter' : 'url(#drop-shadow)',
                        'stroke-width' : function(d) {return strokeScale(iterRatio(d))},
                        'stroke' : color('stroke'),
                        'fill' : color('fill'),
                        'fill-opacity' : settings.fillStyle.opacity,
                        'stroke-opacity' : settings.strokeStyle.opacity
                    })

                gShape.exit().remove();

                gShape.sort(settings.order ? d3.descending : d3.ascending);
            }

            function layerTransform(layer, settings) {
                d3.select(layer).select(".zoom-group")
                    .attr("transform", "translate(" + settings.translate + ") scale(" + settings.scale + ")");
            }

            var graph = svg.append('g')
                            //.style('filter', 'url(#handdrawn)');
                            //.style('filter', 'url(#totofilter)');
                            //.style('filter', 'url(#dropshadow)');
                            //.style('filter', 'url(#glow)');

            var layerZoom = {};

            scope.render = function(layers) {
                /*if (svg.attr('height') != svg.node().offsetWidth) {
                    svg.attr('height', svg.node().offsetWidth);
                }*/

                var layerGroup = graph.selectAll('.layer').data(layers, function(d) {return d.uid});
                var newLayerGroup = layerGroup.enter()
                        .append('g')
                            .attr({
                                id : function(d,i) {return 'layer-'+d.uid},
                                class : 'layer'
                            });

                newLayerGroup
                    .each(function(d,i) {
                        function onzoom() {
                            d.scale=zoom.scale();
                            d.translate=zoom.translate();
                            layerTransform(this, d);
                            scope.$apply();
                        }
                        var zoom = d3.behavior.zoom().scaleExtent([0, 10]).on("zoom", onzoom);
                        layerZoom[d.uid] = zoom;
                        d3.select(this).call(zoom);
                    })
                    .append('g').attr('class', 'zoom-group')
                    .append('g').attr('class', 'anim-group')

                // Initial zoom
                newLayerGroup
                    .each(function(d,i) {
                        d.scale && layerZoom[d.uid].scale(d.scale);
                        d.translate && layerZoom[d.uid].translate(d.translate);
                        //layerZoom[d.uid].event(d3.select(this));
                        layerTransform(this, d);
                    })

                    layerGroup
                        .on('mousedown', null)
                        .on('mousedown', function(d,i) {
                            scope.onclickLayer({i:i});
                        });

                layerGroup.selectAll('.anim-group').each(drawLayer);

                layerGroup.exit().remove();
            }
        }
    };
}])

;