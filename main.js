const MARGIN = { TOP: 20, RIGHT: 80, BOTTOM: 20, LEFT: 100 },
    PADDING = { TOP: 60, RIGHT: 60, BOTTOM: 150, LEFT: 60 },
    WIDTH = 1000,
    HEIGHT = 600,
    OUTER_WIDTH = WIDTH - MARGIN.LEFT - MARGIN.RIGHT,
    OUTER_HEIGHT = HEIGHT - MARGIN.TOP - MARGIN.BOTTOM,
    INNER_WIDTH = OUTER_WIDTH - PADDING.LEFT - PADDING.RIGHT,
    INNER_HEIGHT = OUTER_HEIGHT - PADDING.TOP - PADDING.BOTTOM;

let outerG, innerG;

function init(chartType) {
    outerG = d3
        .select(chartType)  // Ensure the correct div ID is selected
        .append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .append("g")
        .attr("transform", `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

    innerG = outerG.append("g")
        .attr("transform", `translate(${PADDING.LEFT}, ${PADDING.TOP})`);

    return innerG;
}

d3.csv("wildfire.csv", d3.autoType)
    .then(data => {
        if (!data || data.length === 0) {
            console.error("No data loaded.");
            return;
        }
        const innerG = init("#bar-chart");

        const damageCounts = d3.rollup(data, v => v.length, d => d["* Damage"]);
        const damageArray = Array.from(damageCounts, ([category, count]) => ({ category, count }));
        damageArray.sort((a, b) => d3.descending(a.count, b.count));

        // Scales
        const xScale = d3.scaleBand()
            .domain(damageArray.map(d => d.category))
            .range([0, INNER_WIDTH])
            .padding(0.1);
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(damageArray, d => d.count)]).nice()
            .range([INNER_HEIGHT, 0]);
        const colorMapping = {
        "No Damage": "#4CAF50",      
        "Affected (1-9%)": "#FFEB3B", 
        "Minor (10-25%)": "#FF9800", 
        "Major (26-50%)": "#FF5722",  
        "Destroyed (>50%)": "#F44336",
        "Unknown": "#9E9E9E"      
        };
        const colorScale = d => colorMapping[d] || "#FFFFFF"; 


        // Bars
        innerG.selectAll(".bar")
            .data(damageArray)
            .join("rect")
            .attr('class', 'bar')
            .attr("x", d => xScale(d.category))
            .attr("y", d => yScale(d.count))
            .attr("width", xScale.bandwidth())
            .attr("height", d => INNER_HEIGHT - yScale(d.count))
            .style("fill", d => colorScale(d.category));

        // Create the axes
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);

        innerG.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${INNER_HEIGHT})`)
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-35)")
            .style("text-anchor", "end")
            .style("font-size", "16px");

        innerG.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .selectAll("text")
            .style("font-size", "16px");

        // Axis Titles
        outerG.append("text")
            .attr("x", INNER_WIDTH / 2)
            .attr("y", INNER_HEIGHT + PADDING.BOTTOM +20)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text("Damage Category");

        outerG.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -INNER_HEIGHT / 2)
            .attr("y", -60)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text("Number of Properties");

        // Chart Title
        outerG.append("text")
            .attr("x", INNER_WIDTH / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .text("Wildfire Damage Category Counts");
    })
    .catch(error => console.error('Error loading the data:', error));

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////


Promise.all([
        d3.json("California_Counties.geojson"), 
        d3.csv("wildfire.csv", d3.autoType) 
    ]).then(([geoData, wildfireData]) => {
        const innerG = init("#scatterplot"); 
    
        const newData = wildfireData.filter(d => d.Latitude && d.Longitude);
    
        const projection = d3.geoMercator()
            .center([-119.5, 37.5]) 
            .scale(4000) 
            .translate([INNER_WIDTH / 2, INNER_HEIGHT / 2]);
    
        const geoPath = d3.geoPath().projection(projection);
    
        innerG.selectAll("path")
            .data(geoData.features)
            .join("path")
            .attr("d", geoPath)
            .attr("fill", "#ddd") 
            .attr("stroke", "#666");  
    
        // Scatterplot Scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(newData, d => d.Longitude)).nice()
            .range([0, INNER_WIDTH]);
    
        const yScale = d3.scaleLinear()
            .domain(d3.extent(newData, d => d.Latitude)).nice()
            .range([INNER_HEIGHT, 0]);
    
        const colorScale = d3.scaleOrdinal()
            .domain(["No Damage", "Affected (1-9%)", "Minor (10-25%)", "Major (26-50%)", "Destroyed (>50%)", "Unknown"])
            .range(["#4CAF50", "#FFEB3B", "#FF9800", "#FF5722", "#F44336", "#9E9E9E"]);
    
        const sizeScale = d3.scaleSqrt()
            .domain(d3.extent(newData, d => d["Assessed Improved Value (parcel)"]))
            .range([2, 10]);
    
        innerG.selectAll("circle")
            .data(newData)
            .join("circle")
            .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
            .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
            .attr("r", d => sizeScale(d["Assessed Improved Value (parcel)"]))
            .style('opacity', 0.8)
            .style("fill", d => colorScale(d["* Damage"] || "Unknown"));
    
        // Titles
        outerG.append("text")
            .attr("x", OUTER_WIDTH / 2 + 300)
            .attr("y", 100)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .text("Wildfire Damage ScatterMap");
    
    }).catch(error => console.error('Error loading data:', error));


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////



d3.csv("wildfire.csv", d3.autoType)
    .then(data => {
        if (!data || data.length === 0) {
            console.error("No data loaded.");
            return;
        }

        const lineInnerG = init("#line-graph");
        data = data.filter(d => d["Year Built (parcel)"] && !isNaN(d["Year Built (parcel)"]));

        const yearCounts = d3.rollup(data, v => v.length, d => d["Year Built (parcel)"]);
        const yearData = Array.from(yearCounts, ([year, count]) => ({ year: +year, count }));

        // Sort data by year
        yearData.sort((a, b) => a.year - b.year);

        // Scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(yearData, d => new Date(d.year, 0, 1))).nice()
            .range([0, INNER_WIDTH]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(yearData, d => d.count)]).nice()
            .range([INNER_HEIGHT, 0]);

        const line = d3.line()
            .x(d => xScale(new Date(d.year, 0, 1)))
            .y(d => yScale(d.count))
            .curve(d3.curveMonotoneX);

        // Line Path
        lineInnerG.append("path")
            .datum(yearData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Axes
        lineInnerG.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${INNER_HEIGHT})`)
            .call(d3.axisBottom(xScale).ticks(10))
            .selectAll("text")
            .style("font-size", "16px");

        lineInnerG.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .style("font-size", "16px");

        // Axis Titles
        outerG.append("text")
            .attr("x", INNER_WIDTH / 2)
            .attr("y", INNER_HEIGHT + PADDING.BOTTOM - 20)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text("Year Built");

        outerG.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -INNER_HEIGHT / 2)
            .attr("y", -60)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text("Number of Properties");

        // Chart Title
        outerG.append("text")
            .attr("x", INNER_WIDTH / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .text("Wildfire-Affected Properties by Year Built");
    })
    .catch(error => console.error('Error loading the data:', error));

    const width = 500, height = 500;
    const dataPath = "wildfire.csv";
    
    d3.csv(dataPath).then(data => {
        const fireNameCounts = d3.rollup(
            data,
            v => v.length,
            d => d["County"]
        );
    
        const fireArray = Array.from(fireNameCounts, ([key, value]) => ({ county: key, count: value }));
    
        // Create the SVG canvas
        const treemapSvg = d3.select("#treemap").append("svg")
            .attr("width", width)
            .attr("height", height);
    
        const treemap = d3.treemap().size([width, height]).padding(1);
    
        const root = d3.hierarchy({ name: "Wildfires", children: fireArray })  
            .sum(d => d.count);

        treemap(root);
    
        // Draw the rectangles
        const nodes = treemapSvg.selectAll("rect")
            .data(root.leaves())
            .enter().append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", "orange")
            .attr("stroke", "#fff");
    
        // Add text labels to the boxes
        treemapSvg.selectAll("text")
            .data(root.leaves())
            .enter().append("text")
            .attr("x", d => (d.x0 + d.x1) / 2) 
            .attr("y", d => (d.y0 + d.y1) / 2) 
            .attr("text-anchor", "middle")  
            .attr("dominant-baseline", "middle")  
            .style("fill", "black")  
            .style("font-size", "12px") 
            .style("pointer-events", "none") 
            .text(d => d.data.county.length > 10 ? d.data.county.substring(0, 10) + "..." : d.data.county); 
    
    }).catch(error => console.log("Error loading data: ", error));
    
