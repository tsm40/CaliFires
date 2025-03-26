const MARGIN = { TOP: 20, RIGHT: 80, BOTTOM: 20, LEFT: 80 },
    PADDING = { TOP: 60, RIGHT: 60, BOTTOM: 150, LEFT: 60 },
    WIDTH = 1000,
    HEIGHT = 800,
    OUTER_WIDTH = WIDTH - MARGIN.LEFT - MARGIN.RIGHT,
    OUTER_HEIGHT = HEIGHT - MARGIN.TOP - MARGIN.BOTTOM,
    INNER_WIDTH = OUTER_WIDTH - PADDING.LEFT - PADDING.RIGHT,
    INNER_HEIGHT = OUTER_HEIGHT - PADDING.TOP - PADDING.BOTTOM;

//let outerGbar, innerGbar, outerGmap, innerGmap, outerGline, innerGline, outerGtree, innerGtree;
//let outerG, innerG;

function init(chartType) {
    let outerG, innerG;
    outerG = d3
        .select(chartType)  // Ensure the correct div ID is selected
        .append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .append("g")
        .attr("transform", `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

    innerG = outerG.append("g")
        .attr("transform", `translate(${PADDING.LEFT}, ${PADDING.TOP})`);

    return {outerG, innerG};
}

function drawBarChart(data) {
    if (!data || data.length === 0) {
        console.error("ERROR: No data loaded. (drawBarChart)");
        return;}

    const {outerG, innerG} = init("#bar-chart");

    // Process Data
    const damageCounts = d3.rollup(data, v => v.length, d => d["* Damage"]);
    const damageArray = Array.from(damageCounts, ([category, count]) => ({ category, count }))
        .sort((a, b) => d3.descending(a.count, b.count));

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

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0)
        .style("background", "black")
        .style("pointer-events", "none"); 


    // Bars
    innerG.selectAll(".bar")
        .data(damageArray)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.category))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => INNER_HEIGHT - yScale(d.count))
        .style("fill", d => colorScale(d.category))
        .on("mouseover", function (event, d) {
            tooltip.style("opacity", .9);
            tooltip.html(d.count + " properties");
            d3.selectAll(".map-circle")
            .transition().duration(200)
            d3.selectAll(".map-circle")
            .style("display", circle => (circle["* Damage"] === d.category) ? null : "none");
        })
        .on("mouseout", function (d) {
            tooltip.style("opacity", 0);
            d3.selectAll(".map-circle")
            .style("display", null);
        })
        .on("mousemove", function (event, d) {
            tooltip.style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px")});

    

    // Create Axes
    innerG.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${INNER_HEIGHT})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end")
        .style("font-size", "16px");

    innerG.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("font-size", "16px");

    // Axis Titles
    outerG.append("text")
        .attr("x", INNER_WIDTH / 2)
        .attr("y", INNER_HEIGHT + PADDING.BOTTOM + 20)
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
}

function drawScatterMap(topoData, wildfireData) {
    if (!wildfireData || wildfireData.length === 0) {
        console.error("ERROR: No data loaded. (drawScatterMap)");
        return;}

    const {outerG, innerG} = init("#scattermap");

    // Filter wildfire data with valid coordinates
    const newData = wildfireData.filter(d => d.Latitude && d.Longitude);

    // Convert TopoJSON to GeoJSON
    const geoData = topojson.feature(topoData, topoData.objects.calicounties2);

    // Define Projection and Path
    /*const projection = d3.geoMercator()
        .center([-119.5, 37.5])
        .scale(4000)
        .translate([INNER_WIDTH / 3, INNER_HEIGHT / 2]);*/

    const projection = d3.geoMercator()
    .center([-133.5, 54.5])
    .scale(3000)
    .translate([INNER_WIDTH / 3, INNER_HEIGHT / 2])
    .rotate([0, 0, -20]); 


    const geoPath = d3.geoPath().projection(projection);

    // Draw California Counties Map
    innerG.selectAll("path")
        .data(geoData.features)
        .join("path")
        .attr("d", geoPath)
        .attr("fill", "#ddd")
        .attr("stroke", "#666");

    const colorScale = d3.scaleOrdinal()
        .domain(["No Damage", "Affected (1-9%)", "Minor (10-25%)", "Major (26-50%)", "Destroyed (>50%)", "Unknown"])
        .range(["#4CAF50", "#FFEB3B", "#FF9800", "#FF5722", "#F44336", "#9E9E9E"]);

    const sizeScale = d3.scaleSqrt()
        .domain(d3.extent(newData, d => d["Assessed Improved Value (parcel)"]))
        .range([2, 10]);

    // Draw Scattermap Circles
    innerG.selectAll("circle")
        .data(newData)
        .join("circle")
        .attr("class", "map-circle")
        .attr("data-damage", d => d["* Damage"] || "Unknown")
        .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
        .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
        .attr("r", d => sizeScale(d["Assessed Improved Value (parcel)"]))
        .style("opacity", 0.8)
        .style("fill", d => colorScale(d["* Damage"] || "Unknown"));

    // Chart Title
    outerG.append("text")
        .attr("x", 7 * OUTER_WIDTH / 10)
        .attr("y", 100)
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("font-weight", "bold")
        .text("Wildfire Damage ScatterMap");
}

function drawLineGraph(data) {
    if (!data || data.length === 0) {
        console.error("ERROR: No data loaded. (drawLineGraph)");
        return;}

    const {outerG, innerG} = init("#line-graph");

    // data wrangling
    data = data.filter(d => d["Year Built (parcel)"] && !isNaN(d["Year Built (parcel)"]));
    const yearCounts = d3.rollup(data, v => v.length, d => d["Year Built (parcel)"]);
    const yearData = Array.from(yearCounts, ([year, count]) => ({ year: +year, count }));
    yearData.sort((a, b) => a.year - b.year);

    // Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(yearData, d => new Date(d.year, 0, 1))).nice()
        .range([0, INNER_WIDTH]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(yearData, d => d.count)]).nice()
        .range([INNER_HEIGHT, 0]);

    // Line generator
    const line = d3.line()
        .x(d => xScale(new Date(d.year, 0, 1)))
        .y(d => yScale(d.count))
        .curve(d3.curveMonotoneX);

    // Draw the line path
    innerG.append("path")
        .datum(yearData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Axes
    innerG.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${INNER_HEIGHT})`)
        .call(d3.axisBottom(xScale).ticks(10))
        .selectAll("text")
        .style("font-size", "16px");

    innerG.append("g")
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
}

function drawTreemap(data) {
    if (!data || data.length === 0) {
        console.error("ERROR: No data loaded. (drawTreemap)");
        return;
    }

    const {outerG, innerG} = init("#treemap");

    // Process Data
    const fireCounts = d3.rollup(data.filter(d => d["County"]), v => v.length, d => d["County"]);
    const fireArray = Array.from(fireCounts, ([county, count]) => ({ county, count }));

    // color scale
    const colorScale = d3.scaleSequential(d3.interpolateOranges)
        .domain([d3.min(fireArray, d => d.count), d3.max(fireArray, d => d.count)]);

    // Define Treemap Layout
    const treemap = d3.treemap()
        .size([INNER_WIDTH, 500]);

    // Create Hierarchy
    const root = d3.hierarchy({ name: "Wildfires", children: fireArray })
        .sum(d => d.count);

    treemap(root);

    // Draw Rectangles
    innerG.selectAll(".tile")
        .data(root.leaves())
        .join("rect")
        .attr("class", "tile")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => colorScale(d.data.count))
        .attr("stroke", "#fff");

    // Add Labels
    innerG.selectAll(".tile-text")
        .data(root.leaves())
        .join("text")
        .attr("class", "tile-text")
        .attr("x", d => (d.x0 + d.x1) / 2)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("fill", "black")
        .style("font-size", "16px")
        .style("pointer-events", "none")
        .text(d => d.data.county.length > 10 ? d.data.county.substring(0, 10) + "..." : d.data.county);

    // Chart Title
    outerG.append("text")
        .attr("x", INNER_WIDTH / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("font-weight", "bold")
        .text("Wildfire Incidents by County");
}


// scroll indicator
window.addEventListener("scroll", () => {
    const scrollIndicator = document.getElementById("scroll-indicator");
    const scrolledToBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight;

    if (scrolledToBottom) {
        scrollIndicator.classList.add("hidden");
    } else {
        scrollIndicator.classList.remove("hidden");
    }
});

Promise.all([
    d3.csv("wildfire.csv", d3.autoType),
    d3.json("calicounties.topojson")
]).then(([wildfireData, geojsonData]) => {
    drawBarChart(wildfireData);
    drawScatterMap(geojsonData, wildfireData);
    drawLineGraph(wildfireData);
    drawTreemap(wildfireData);
}).catch(error => console.error('Error loading data:', error));