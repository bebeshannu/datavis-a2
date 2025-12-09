

// This version handles messy CSV headers by normalizing them.
// It ensures all values (Retail Price, Engine Size, MPG, HP, etc.) load correctly.
// Clicking dots will show full details in the right panel.

// -----------------------------
// Helper: Normalize CSV keys
// -----------------------------
function normalizeKey(k) {
    return k.toLowerCase()
        .replace(/\s+/g, "")   // remove spaces
        .replace(/\(/g, "")    // remove (
        .replace(/\)/g, "")    // remove )
        .replace(/\./g, "")    // remove dots
        .replace(/-/g, "");    // remove hyphens
}

// Format helpers
const formatComma = d3.format(",.0f");
const formatOne = d3.format(".1f");

// Select containers
const container = d3.select("#scatterplot");
const details   = d3.select("#info");

// SVG size
const WIDTH = 900;
const HEIGHT = 520;

const margin = { top: 30, right: 20, bottom: 60, left: 80 };
const innerW = WIDTH - margin.left - margin.right;
const innerH = HEIGHT - margin.top - margin.bottom;

// Create SVG
const svg = container.append("svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// Main drawing group
const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Axes groups
const gx = g.append("g").attr("transform", `translate(0, ${innerH})`);
const gy = g.append("g");

// Axis labels
svg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", margin.left + innerW / 2)
    .attr("y", HEIGHT - 12)
    .text("Retail Price (USD)");

svg.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", `rotate(-90)`)
    .attr("x", -(margin.top + innerH / 2))
    .attr("y", 18)
    .text("Horsepower (HP)");


// =============================
// LOAD CSV
// =============================
d3.csv("cars.csv").then(raw => {

    // Parse + normalize column names for each row
    const parsed = raw.map(r => {
        const cleaned = {};

        // Normalize all keys
        Object.keys(r).forEach(k => {
            cleaned[normalizeKey(k)] = r[k];
        });

        // Build clean data object
        return {
            raw: r,
            Name: cleaned.name || "Unknown",
            Type: cleaned.type || "-",
            RetailPrice: +cleaned.retailprice,
            DealerCost: +cleaned.dealercost,
            EngineSize: +cleaned.enginesizel,
            Cylinders: +cleaned.cyl || null,
            Horsepower: +cleaned.horsepowerhp,
            CityMPG: +cleaned.citymilespergallon,
            AWD: cleaned.awd,
            RWD: cleaned.rwd
        };
    });

    // Filter valid rows
    const data = parsed.filter(d =>
        isFinite(d.RetailPrice) &&
        isFinite(d.Horsepower)
    );

    // ================
    // SCALES
    // ================
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.RetailPrice)).nice()
        .range([0, innerW]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.Horsepower)).nice()
        .range([innerH, 0]);

    const size = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.EngineSize)).nice()
        .range([3, 14]);

    const color = d3.scaleSequential(d3.interpolateViridis)
        .domain(d3.extent(data, d => d.CityMPG));

    // ================
    // DRAW AXES
    // ================
    gx.call(d3.axisBottom(x).ticks(8).tickFormat(d => "$" + formatComma(d)));
    gy.call(d3.axisLeft(y).ticks(8));

    // ================
    // DRAW DOTS
    // ================
    g.append("g")
        .attr("class", "dots")
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.RetailPrice))
            .attr("cy", d => y(d.Horsepower))
            .attr("r", d => size(d.EngineSize))
            .attr("fill", d => color(d.CityMPG))
            .on("click", function (event, d) {
                g.selectAll(".dot").classed("selected", false);
                d3.select(this).classed("selected", true);
                showDetails(d);
            })
            .append("title")
            .text(d => `${d.Name}\n$${formatComma(d.RetailPrice)} — ${d.Horsepower} HP`);

    // ================
    // SHOW DETAILS PANEL
    // ================
    function showDetails(d) {
        details.html("");
        details.append("h3").text(d.Name);
        details.append("p").html(`<strong>Type:</strong> ${d.Type}`);
        details.append("p").html(`<strong>Retail Price:</strong> $${formatComma(d.RetailPrice)}`);
        details.append("p").html(`<strong>Dealer Cost:</strong> $${formatComma(d.DealerCost || 0)}`);
        details.append("p").html(`<strong>Engine Size:</strong> ${formatOne(d.EngineSize)} L`);
        details.append("p").html(`<strong>City MPG:</strong> ${d.CityMPG}`);
        details.append("p").html(`<strong>Horsepower:</strong> ${d.Horsepower}`);
    }

    // Show first car by default
    if (data.length > 0) showDetails(data[0]);

    // ---------------------------
    // Color legend
    // ---------------------------
    drawColorLegend(color);

    // Size legend
    drawSizeLegend(size);

}).catch(err => {
    d3.select("#info").html(`<p style="color:red">Error loading data: ${err.message}</p>`);
    console.error(err);
});


// =============================
// LEGENDS
// =============================

function drawColorLegend(colorScale) {
    const block = d3.select("#legend-color");
    block.html("");
    block.append("div").text("Color → City MPG");

    const w = 160, h = 10;
    const canvas = block.append("canvas")
        .attr("width", w)
        .attr("height", h)
        .node();

    const ctx = canvas.getContext("2d");
    const domain = colorScale.domain();
    const min = domain[0], max = domain[1];

    for (let i = 0; i < w; i++) {
        const t = i / (w - 1);
        ctx.fillStyle = colorScale(min + t * (max - min));
        ctx.fillRect(i, 0, 1, h);
    }

    block.append("div")
        .style("display", "flex")
        .style("justify-content", "space-between")
        .html(`<span>${Math.round(min)}</span><span>${Math.round(max)}</span>`);
}

function drawSizeLegend(sizeScale) {
    const block = d3.select("#legend-size");
    block.html("");
    block.append("div").text("Size → Engine Size (L)");

    const values = [
        sizeScale.domain()[0],
        d3.mean(sizeScale.domain()),
        sizeScale.domain()[1]
    ];

    const svgL = block.append("svg").attr("width", 160).attr("height", 40);

    values.forEach((v, i) => {
        svgL.append("circle")
            .attr("cx", 20 + i * 60)
            .attr("cy", 20)
            .attr("r", sizeScale(v))
            .attr("fill", "#ddd")
            .attr("stroke", "#333");

        svgL.append("text")
            .attr("x", 20 + i * 60)
            .attr("y", 38)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .text(formatOne(v) + "L");
    });
}
