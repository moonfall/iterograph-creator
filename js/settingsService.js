angular.module('iterograph')

.service('graphSettings', function() {

    var layers = [];
    var lock = {};
    var style = {
        filtered : false,
        background : '#FFFFFF'
    };
    var propertyDef = {
        max : {
            distance : 300,
            size : 200,
            rotation : 360,
            stroke : 20
        }
    };
    var lastUID = 0;

    return {
        layers : layers,
        lock : lock,
        style : style,
        propertyDef : propertyDef,
        addLayer : addLayer,
        addRandomLayer : addRandomLayer,
        randomizeLayer : randomizeLayer,
        clearLayer : clearLayer,
        addScaleColor : addScaleColor,
        removeScaleColor : removeScaleColor,
        persistentData : persistentData,
        loadData : loadData
    }

    function persistentData() {
        return {
            layers : layers,
            filtered : style.filtered,
            background : style.background
        }
    }

    function loadData(settings) {
        for (l in settings.layers) {
            settings.layers[l].uid = ++lastUID;
            layers.push(settings.layers[l]);
        }
        style.filtered = settings.filtered;
        style.background = settings.background || '#FFFFFF';
    }

    function addLayer(layer) {
        layer.uid = ++lastUID;
        layers.push(layer);
    }

    function addRandomLayer() {
        var l = randomLayer();
        l.uid = ++lastUID;
        layers.push(l);
    }

    function addScaleColor(scale) {
        scale.range.push(randomColor());
        stretchDomain(scale);
    }

    function removeScaleColor(scale) {
        scale.range.pop();
        stretchDomain(scale);
    }

    function rand(min,max) {
        return Math.floor(Math.random()*(max-min + 1)+min);
    }

    function randf(min,max,prec) {
        var n = Math.random()*(max-min)+min;
        return prec ? parseFloat(n.toFixed(prec)) : n;
    }

    function randomScale(randMin, randMax) {
        var scale = {
            domain : [],
            range : []
        };
        var nbPoints = rand(2, 5);
        for (i=0;i<nbPoints;i++) {
            scale.domain.push(i/(nbPoints-1));
            scale.range.push(rand(randMin, randMax));
        }
        return scale;
    }

    function randomColor() {
        //return  d3.scale.category10().range()[rand(0,9)]
        //return d3.rgb(rand(0,255),rand(0,255),rand(0,255)).toString();
        return d3.hsl(rand(0,360),randf(0,1),randf(0,1)).toString();
    }

    function randomColorScale() {
    /*  return {
            type : 'ordinal',
            domain:[],
            range:d3.scale.category10().range()
        }*/

        var scale = {
            type:['linear', 'ordinal'][rand(0,1)],
            domain:[],
            range:[]
        }
        var nbPoints = rand(2, 5);
        for (i=0;i<nbPoints;i++) {
            scale.range.push(randomColor());
        }
        stretchDomain(scale);
        return scale;
    }

        // Build the domain according to the range size
    function stretchDomain(scale) {
        var size = scale.range.length;
        scale.domain.splice(0,scale.domain.length);
        for (i=0;i<size;i++) {
            scale.domain.push(i/(size-1));
        }
    }

    function randomLayer(layer) {
        var randomSettings =  {
            version : 1,
            //shape : randomShape(),
            //shape : ['circle','square','triangle','line'][rand(0,3)],
            shape : {
                type : ['ellipse','rectangle','triangle','line'][rand(0,3)],
                ratio : randf(0.1,1,2)
            },
            iteration:rand(2,200),
            angle:rand(0,360),
            sizeScale:randomScale(10, 100),
            distanceScale:randomScale(0, 200),
            strokeScale:randomScale(1, 8),
            rotationScale:randomScale(0,360),
            colorScale : randomColorScale(),
            strokeStyle : {
                colorType : 'constant',
                color : '#000000',
                opacity : Math.random()<0.5 ? 1 : randf(0.5,1,1)
            },
            fillStyle : {
                colorType : ['none','constant','palette'][rand(0,2)],
                color : randomColor(),
                opacity : Math.random()<0.5 ? 1 : randf(0.5,1,1)
            },
            order : Math.random()<0.5,
            scale : randf(0.5,3),
            translate : [0,0]
            //translate : [rand(-200,200), rand(-200,200)]
        };

        // Warning : when some settings are locked, this code will not take it in account and may cause problem (e.g. white lines)
        if (randomSettings.shape.type == 'line' || randomSettings.fillStyle.colorType == 'none') {
            randomSettings.strokeStyle.colorType= (Math.random()<0.5) ?'palette' : 'constant';
        } else {
            randomSettings.strokeStyle.opacity = 1;
            if (Math.random()<0.5) {
                randomSettings.strokeStyle.color='#FFFFFF';
            }
            if (Math.random()<0.5) {
                randomSettings.strokeStyle.colorType='none';
            }
            /*if (Math.random()<0.5) {
                randomSettings.strokeScale = randomScale(0,0,20);
            }*/
        }

        return randomSettings;
    }

    // Merge settings of current layer and new  layer, keeping locked attributes
    function lockMerge(currentLayer, newLayer) {
        for (k in newLayer) {
            if (!lock[k]) {
                currentLayer[k] = newLayer[k];
            }
        }
    }

    function randomizeLayer(layer) {
        lockMerge(layer, randomLayer());
    }

    function clearLayer(layer) {
        var colorScale = {
                type : 'ordinal',
                domain:[],
                range:angular.copy(d3.scale.category10().range())
            };
        stretchDomain(colorScale);
        var clearSettings =  {
            version : 1,
            shape : {
                type : 'ellipse',
                ratio :1
            },
            iteration:1,
            angle:0,
            sizeScale:{domain:[0,1], range:[100,10]},
            distanceScale:{domain:[0,1], range:[0,0]},
            strokeScale:{domain:[0,1], range:[5,5]},
            rotationScale:{domain:[0,1], range:[0,0]},
            colorScale : colorScale,
            strokeStyle : {
                colorType : 'constant',
                color : '#000000',
                opacity : 1
            },
            fillStyle : {
                colorType : 'none',
                color : '#FFFFFF',
                opacity : 1
            },
            order : true,
            scale : 1,
            translate : [0, 0]
        };

        lockMerge(layer, clearSettings);
    }

});