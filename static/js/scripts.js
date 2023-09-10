$(document).ready(function() {
    layer_index = 0;
    function addEventListenerRangeButtons() {
        document.querySelectorAll('.range-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.range-btn').forEach(function(otherBtn) {
                    otherBtn.classList.remove('active');
                });

                this.classList.add('active');

                var weight_index = document.getElementById('weightIndexSelect').value;

                var fil_num_start = this.getAttribute('data-start');
                var end = this.getAttribute('data-end');
                
                document.getElementById('plotContainer').innerHTML = '';
                processWeightOnly(weight_index, layer_index, fil_num_start);
            });
        });
    }

    function getNumChannels(layer_index) {
        fetch('/num_channels?layer_index='+layer_index)
        .then(response => response.json())
        .then(num_channels_dicts => {
            var buttonContainer = document.getElementById('buttonContainer');
        
            buttonContainer.innerHTML = '';
        
            for (var i = 0; i < num_channels_dicts; i += 8) {
                var btn = document.createElement('button');
                btn.className = 'range-btn';
                btn.setAttribute('data-start', i);
        
                var end = i + 8; 
                if (end > num_channels_dicts) {
                    end = num_channels_dicts;
                }
                btn.setAttribute('data-end', end);
        
                btn.textContent = i + " - " + (end-1);
        
                btn.addEventListener('click', function() {
                    var activeButton = document.querySelector('.range-btn.active');
                    if (activeButton) {
                        activeButton.classList.remove('active');
                    }
                    this.classList.add('active');
                });
                buttonContainer.appendChild(btn);
            }

            addEventListenerRangeButtons();
        });
    }

    function clearWebGLContexts(){
        var plotDivs = document.querySelectorAll('.plot, .plot-fft');
        for(let i=0; i<plotDivs.length; i++){
            Plotly.purge(plotDivs[i]);
        }
    }

    addEventListenerRangeButtons();
    getNumChannels(layer_index);

    document.getElementById('layerIndexSelect').addEventListener('change', function() {
        layer_index = this.value

        var selectElement = document.getElementById("weightIndexSelect");
        selectElement.value = "0";
        var weight_index = 0;

        getNumChannels(layer_index);

        var oldFilter = document.querySelector('.filter');
        if (oldFilter) {
            oldFilter.remove();
        }

        processWeight(weight_index, layer_index);
    });

    fetch('/layer_indexes')
    .then(response => response.json())
    .then(layer_indexes_dicts => {
        var selectElement = document.getElementById("layerIndexSelect");

        while(selectElement.options.length > 0) {
            selectElement.remove(0);
        }

        layer_indexes_dicts.forEach((item, index) => {
            var option = document.createElement("option");

            option.value = item;
            option.text = 'Layer index: ' + item;

            selectElement.add(option);
        });
    })

    document.getElementById('weightIndexSelect').addEventListener('change', function() {
        var oldFilter = document.querySelector('.filter');
        if (oldFilter) {
            oldFilter.remove();
        }

        var weight_index = this.value;

        processWeight(weight_index, layer_index);
    });


    document.getElementById('weightIndexSelect').dispatchEvent(new Event('change'));

    function processWeightOnly(weight_index, layer_index, fil_num_start=0) {
        var plotDivs = document.querySelectorAll('.plot');

        console.log(plotDivs);
        for(let i=0; i<plotDivs.length; i++){
            Plotly.purge(plotDivs[i]);
        }

        var wrapper = document.getElementsByClassName('wrapper')[0];
        wrapper.innerHTML = ''

        fetch('/weights?index='+weight_index+'&layer_index='+layer_index+'&fil_num_start='+fil_num_start)
        .then(response => response.json())
        .then(weight_dicts => {
            plot_height = 300
            plot_width = 400

            var channels = [...new Set(weight_dicts.map(w => w.channel))];
            var numChannels = channels.length;



            first_channel = weight_dicts[0]['channel']
            for (let i = first_channel; i < (first_channel+numChannels); i++) {
                var traces = [];

                var channelWeights = weight_dicts.filter(w => w.channel === i);

                var maxX = Math.max(...channelWeights.map(w => w.x));
                var maxY = Math.max(...channelWeights.map(w => w.y));
                
                var weightsGrid = Array(maxX + 1).fill().map(() => Array(maxY + 1).fill(0));

                channelWeights.forEach(w => {
                    weightsGrid[w.x][w.y] = w.weight;
                });

                traces.push({
                    z: weightsGrid,
                    type: 'surface',
                    colorscale: 'RdBu',
                    colorbar: {
                        len: 0.8,  // adjusts the length of the colorbar
                        y: 0.5,  // adjusts the position of the colorbar
                    }
                });

                var layout = {
                    autosize: false, 
                    width: plot_width, 
                    height: plot_height, 
                    margin: {
                        l: 0,
                        r: 0,
                        b: 0,
                        t: 0
                    }
                };

                // Find the last surf ID or use 0 if no surf divs exist
                var lastSurfId = Array.from(document.querySelectorAll("[id^='surf_']"))
                    .map(div => parseInt(div.id.split('_')[1]))
                    .sort((a, b) => b - a)[0] || 0;

                // Create the new div with a unique ID
                var newDiv = document.createElement('div');
                var newDivId = 'surf_' + (lastSurfId + 1);
                newDiv.setAttribute('id', newDivId);
                newDiv.setAttribute("class", "plot");
                wrapper.appendChild(newDiv);

                Plotly.newPlot(newDivId, traces, layout);
            }

            // Plot the three channels in the same plot
            var traces = [];
            for (let i = first_channel; i < (first_channel+numChannels); i++) {
                // Filter the weights for the first channel
                var channelWeights = weight_dicts.filter(w => w.channel === i);

                // Find max x and y to determine grid size
                var maxX = Math.max(...channelWeights.map(w => w.x));
                var maxY = Math.max(...channelWeights.map(w => w.y));

                // Create a 2D array (grid) with default values
                var weightsGrid = Array(maxX + 1).fill().map(() => Array(maxY + 1).fill(0));

                // Fill in the weights
                channelWeights.forEach(w => {
                    weightsGrid[w.x][w.y] = w.weight;
                });

                trace = {
                    z: weightsGrid,
                    type: 'surface',
                    colorscale: 'RdBu',
                    opacity: 0.9, 
                    colorbar: {
                        len: 0.8,  // adjusts the length of the colorbar
                        y: 0.5,  // adjusts the position of the colorbar
                    }
                }

                if (i < numChannels - 1) {
                    // Don't show color scale for the first and second surfaces
                    trace.showscale = false;
                }

                traces.push(trace);

                var layout = {
                    autosize: false, 
                    width: plot_width, 
                    height: plot_height, 
                    margin: {
                        l: 0,
                        r: 0,
                        b: 0,
                        t: 0
                    }
                };
                
            }

            // Find the last surf ID or use 0 if no surf divs exist
            var lastSurfId = Array.from(document.querySelectorAll("[id^='surf_']"))
            .map(div => parseInt(div.id.split('_')[1]))
            .sort((a, b) => b - a)[0] || 0;

            // Create the new div with a unique ID
            var newDiv = document.createElement('div');
            var newDivId = 'surf_' + (lastSurfId + 1);
            newDiv.setAttribute('id', newDivId);
            newDiv.setAttribute("class", "plot");
            wrapper.appendChild(newDiv);

            Plotly.newPlot(newDivId, traces, layout);
        });
    }

    function processWeight(weight_index, layer_index, fil_num_start=0) {
        clearWebGLContexts();

        fetch('/weights?index='+weight_index+'&layer_index='+layer_index+'&fil_num_start='+fil_num_start)
        .then(response => response.json())
        .then(weight_dicts => {
            plot_height = 300
            plot_width = 400


            // Get the unique channel values from weight_dicts
            var channels = [...new Set(weight_dicts.map(w => w.channel))];
            var numChannels = channels.length;

            var filter = document.createElement('filter');
            filter.setAttribute("class", "filter");
            document.body.appendChild(filter);

            // Show the cmap in gray for the filter
            fetch('/weights_gray?index='+weight_index+'&layer_index='+layer_index+'&t='+new Date().getTime())
            .then(response => response.blob())
            .then(images => {
                // Then create a local URL for that image and print it 
                var outside = URL.createObjectURL(images)
                var imgElement = document.createElement('img');
                imgElement.setAttribute("class", "plot-flat");
                imgElement.src = outside;
                filter.appendChild(imgElement);

                // Now show the 3D plot of the fft weights
                fetch('/weights_fft?index='+weight_index+'&layer_index='+layer_index)
                .then(response => response.json())
                .then(data => {
                    var colorMax = Math.max(...data.c);
                    var colorMin = Math.min(...data.c);
                    var trace = {
                        x: data.x,
                        y: data.y,
                        z: data.z,
                        mode: 'markers',
                        marker: {
                            size: 3,
                            color: data.c,
                            colorscale: 'RdBu',
                            cmin: colorMin,
                            cmax: colorMax,
                            colorbar: {
                                thickness: 10,
                            }
                        },
                        type: 'scatter3d'
                    };

                    
                    var layout = {
                        autosize: false, 
                        width: plot_width, 
                        height: plot_height,
                        margin: {
                            l: 0,
                            r: 0,
                            b: 0,
                            t: 0
                        },
                        scene: {
                            xaxis: {title: 'X', showgrid: false},
                            yaxis: {title: 'Y', showgrid: false},
                            zaxis: {visible: false, showgrid: false}
                        },
                        showlegend: false,
                        scene2: { 
                            zaxis: {range: [-1, 0]},
                            xaxis: {visible: false}, 
                            yaxis: {visible: false},
                        }
                    };

                    var config = {
                        responsive: true
                    };
                    
                    var newDiv = document.createElement('div');
                    newDiv.setAttribute("class", "plot-fft");                    
                    filter.appendChild(newDiv);

                    Plotly.newPlot(newDiv, [trace], layout, config);

                    // Now show the 3D plot of the weights surfaces (spatial)
                    var wrapper = document.createElement('div');
                    wrapper.setAttribute("class", "wrapper");
                    filter.appendChild(wrapper);


                    first_channel = weight_dicts[0]['channel']
                    for (let i = first_channel; i < (first_channel+numChannels); i++) {
                        var traces = [];
                        
                        var channelWeights = weight_dicts.filter(w => w.channel === i);
                        
                        var maxX = Math.max(...channelWeights.map(w => w.x));
                        var maxY = Math.max(...channelWeights.map(w => w.y));
                        
                        var weightsGrid = Array(maxX + 1).fill().map(() => Array(maxY + 1).fill(0));

                        channelWeights.forEach(w => {
                            weightsGrid[w.x][w.y] = w.weight;
                        });

                        traces.push({
                            z: weightsGrid,
                            type: 'surface',
                            colorscale: 'RdBu',
                            colorbar: {
                                len: 0.8, 
                                y: 0.5,
                            }
                        });

                        var layout = {
                            autosize: false, 
                            width: plot_width, 
                            height: plot_height, 
                            margin: {
                                l: 0,
                                r: 0,
                                b: 0,
                                t: 0
                            }
                        };

                        var lastSurfId = Array.from(document.querySelectorAll("[id^='surf_']"))
                            .map(div => parseInt(div.id.split('_')[1]))
                            .sort((a, b) => b - a)[0] || 0;

                        var newDiv = document.createElement('div');
                        var newDivId = 'surf_' + (lastSurfId + 1);
                        newDiv.setAttribute('id', newDivId);
                        newDiv.setAttribute("class", "plot");
                        wrapper.appendChild(newDiv);

                        Plotly.newPlot(newDivId, traces, layout);
                    }

                    var traces = [];
                    for (let i = first_channel; i < (first_channel+numChannels); i++) {
                        var channelWeights = weight_dicts.filter(w => w.channel === i);

                        var maxX = Math.max(...channelWeights.map(w => w.x));
                        var maxY = Math.max(...channelWeights.map(w => w.y));

                        var weightsGrid = Array(maxX + 1).fill().map(() => Array(maxY + 1).fill(0));

                        channelWeights.forEach(w => {
                            weightsGrid[w.x][w.y] = w.weight;
                        });

                        trace = {
                            z: weightsGrid,
                            type: 'surface',
                            colorscale: 'RdBu',
                            opacity: 0.9,
                            colorbar: {
                                len: 0.8,  // adjusts the length of the colorbar
                                y: 0.5,  // adjusts the position of the colorbar
                            }
                        }

                        if (i < numChannels - 1) {
                            // Don't show color scale for the first and second surfaces
                            trace.showscale = false;
                        }

                        traces.push(trace);

                        var layout = {
                            autosize: false, 
                            width: plot_width, 
                            height: plot_height, 
                            margin: {
                                l: 0,
                                r: 0,
                                b: 0,
                                t: 0
                            }
                        };
                        
                    }

                    // Find the last surf ID or use 0 if no surf divs exist
                    var lastSurfId = Array.from(document.querySelectorAll("[id^='surf_']"))
                    .map(div => parseInt(div.id.split('_')[1]))
                    .sort((a, b) => b - a)[0] || 0;

                    // Create the new div with a unique ID
                    var newDiv = document.createElement('div');
                    var newDivId = 'surf_' + (lastSurfId + 1);
                    newDiv.setAttribute('id', newDivId);
                    newDiv.setAttribute("class", "plot");
                    wrapper.appendChild(newDiv);

                    Plotly.newPlot(newDivId, traces, layout);
                });
            });
        });
    }
});