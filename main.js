// =============================
// main.js — FINAL VERSION FOR YOUR CSV
// =============================

// Normalize CSV keys so column names always match
function normalizeKey(k) {
    return k.toLowerCase()
        .replace(/\s+/g, "")
        .replace(/\(/g, "")
        .replace(/\)/g, "")
        .replace(/\./g, "")
        .replace(/-/g, "");
}

const formatComma = d3.format(",.0f");
const formatOne   = d3.format(".1f");

const container = d3.select("#scatterplot");
const details   = d3.select("#info");

// SVG setup
const WIDTH = 900, HEIGHT = 520;
const margin = { top: 30, right: 20, bottom: 60, left: 80 };
const innerW = WIDTH - margin.left - margin.right;
const innerH = HEIGHT - margin.top - margin.bottom;

const svg = container.append("svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const gx = g.append("g").attr("transform", `translate(0,${innerH})`);
const gy = g.append("g");

// Axis labels
svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", margin.left + innerW / 2)
    .attr("y", HEIGHT - 12)
    .text("Retail Price (USD)");

svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerH / 2))
    .attr("y", 18)
    .text("Horsepower (HP)");


// =============================
// LOAD CSV + PARSE CLEANLY
// =============================
d3.csv("cars.csv").then(raw => {

    const cleanedData = raw.map(r => {
        const cleaned = {};
        Object.keys(r).forEach(k => cleaned[normalizeKey(k)] = r[k]);

        return {
            Name: cleaned.name,
            Type: cleaned.type,
            RetailPrice: +cleaned.retailprice,
            DealerCost: +cleaned.dealercost,
            EngineSize: +cleaned.enginesizel,
            Horsepower: +cleaned.horsepowerhp,
            CityMPG: +cleaned.citymilespergallon,
            AWD: cleaned.awd,
            RWD: cleaned.rwd
        };
    });

    // Filter valid numeric rows
    const data = cleanedData.filter(d =>
        isFinite(d.RetailPrice) && isFinite(d.Horsepower)
    );

    // Scales
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

    gx.call(d3.axisBottom(x).ticks(8).tickFormat(d => "$" + formatComma(d)));
    gy.call(d3.axisLeft(y).ticks(8));

    // Draw dots
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.RetailPrice))
        .attr("cy", d => y(d.Horsepower))
        .attr("r", d => size(d.EngineSize))
        .attr("fill", d => color(d.CityMPG))
        .on("click", function(event, d) {
            g.selectAll(".dot").classed("selected", false);
            d3.select(this).classed("selected", true);
            showDetails(d);
        });

    // Show details panel
    function showDetails(d) {
        details.html("");
        details.append("h3").text(d.Name);
        details.append("p").html(`<strong>Type:</strong> ${d.Type}`);
        details.append("p").html(`<strong>Retail Price:</strong> $${formatComma(d.RetailPrice)}`);
        details.append("p").html(`<strong>Dealer Cost:</strong> $${formatComma(d.DealerCost)}`);
        details.append("p").html(`<strong>Engine Size:</strong> ${formatOne(d.EngineSize)} L`);
        details.append("p").html(`<strong>City MPG:</strong> ${d.CityMPG}`);
        details.append("p").html(`<strong>Horsepower:</strong> ${d.Horsepower}`);
    }

    // Show first car automatically
    if (data.length > 0) showDetails(data[0]);

}).catch(err => {
    console.error("CSV Load Error:", err);
    details.html(`<p style="color:red">Error loading CSV: ${err}</p>`);
});
