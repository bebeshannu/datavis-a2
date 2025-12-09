// main.js
// Simple D3 v5 scatterplot: Retail Price (x) vs Horsepower (y)
// Color encodes City MPG, size encodes Engine Size.
// Click a dot to show 6 attributes in the details panel.

// Helper: try multiple possible column names for robustness (CSV header may have spaces)
function pick(d, names) {
  for (const n of names) if (d[n] !== undefined) return d[n];
  return undefined;
}

// Format helpers
const formatComma = d3.format(",.0f");
const formatOne = d3.format(".1f");

const container = d3.select("#scatterplot");
const details = d3.select("#info");

// SVG dimensions (they respond to container width because CSS set 100%)
const WIDTH = 900;
const HEIGHT = 520;
const margin = {top: 30, right: 20, bottom: 60, left: 80};
const innerW = WIDTH - margin.left - margin.right;
const innerH = HEIGHT - margin.top - margin.bottom;

// create SVG with fixed viewBox so it scales nicely
const svg = container.append("svg")
  .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// main group
const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// axes groups
const gx = g.append("g").attr("transform", `translate(0, ${innerH})`);
const gy = g.append("g");

// axis labels
svg.append("text")
  .attr("class","x-label")
  .attr("text-anchor", "middle")
  .attr("x", margin.left + innerW/2)
  .attr("y", HEIGHT - 12)
  .text("Retail Price (USD)");

svg.append("text")
  .attr("class","y-label")
  .attr("text-anchor", "middle")
  .attr("transform", `rotate(-90)`)
  .attr("x", -(margin.top + innerH/2))
  .attr("y", 18)
  .text("Horsepower (HP)");

// Load data
d3.csv("cars.csv").then(raw => {

  // parse numbers robustly: we attempt to read a few possible header names
  const parsed = raw.map(r => {
    // Try multiple header variants (observed in the dataset)
    const retail = pick(r, ["Retail Price", "RetailPrice", "Retail_Price", "Retail Price "]);
    const hp = pick(r, ["Horsepower(HP)", "Horsepower (HP)", "Horsepower", "HP"]);
    const engine = pick(r, ["Engine Size (l)", "EngineSize", "Engine Size", "Engine"]);
    const citympg = pick(r, ["City Miles Per Gallon", "City MPG", "City_MPG", "CityMilesPerGallon"]);
    const name = pick(r, ["Name", "Model", "name"]);

    return {
      raw: r,
      Name: name || r["Name"] || r["Model"] || "Unknown",
      RetailPrice: +String(retail || r["Retail Price"] || r["RetailPrice"] || r["Retail Price "]).replace(/[^0-9.-]/g,""),
      Horsepower: +String(hp || r["Horsepower(HP)"] || r["Horsepower"]).replace(/[^0-9.-]/g,""),
      EngineSize: +String(engine || r["Engine Size (l)"]).replace(/[^0-9.-]/g,""),
      CityMPG: +String(citympg || r["City Miles Per Gallon"] || r["City Miles Per Gallon "]).replace(/[^0-9.-]/g,""),
      Type: pick(r, ["Type", "type"]) || "",
      AWD: pick(r, ["AWD", "All Wheel Drive"]) || r["AWD"] || 0,
      DealerCost: +String(pick(r, ["Dealer Cost", "DealerCost"]) || r["Dealer Cost"] || 0).replace(/[^0-9.-]/g,"")
    };
  });

  // Filter out rows without the two core numeric fields (x and y)
  const data = parsed.filter(d => isFinite(d.RetailPrice) && isFinite(d.Horsepower));

  // scales
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.RetailPrice)).nice()
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Horsepower)).nice()
    .range([innerH, 0]);

  const size = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.EngineSize)).nice()
    .range([3, 14]);

  // color: City MPG (higher MPG = darker color)
  const color = d3.scaleSequential(d3.interpolateViridis)
    .domain(d3.extent(data, d => d.CityMPG));

  // draw axes
  const xAxis = d3.axisBottom(x).ticks(8).tickFormat(d => "$" + formatComma(d));
  const yAxis = d3.axisLeft(y).ticks(8);

  gx.call(xAxis);
  gy.call(yAxis);

  // Draw points
  const dots = g.append("g").attr("class","dots")
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
      .attr("class","dot")
      .attr("cx", d => x(d.RetailPrice))
      .attr("cy", d => y(d.Horsepower))
      .attr("r", d => isFinite(d.EngineSize) ? size(d.EngineSize) : 4)
      .attr("fill", d => isFinite(d.CityMPG) ? color(d.CityMPG) : "#999")
      .on("click", function(event, d){
         // remove selected class from previously selected
         g.selectAll(".dot").classed("selected", false);
         d3.select(this).classed("selected", true);
         showDetails(d);
      })
      .append("title") // native tooltip (hover)
      .text(d => `${d.Name}\n$${formatComma(d.RetailPrice)} — ${d.Horsepower} HP`);

  // legend: color gradient
  drawColorLegend(color);
  drawSizeLegend(size);

  // Show first row by default (optional)
  if (data.length) showDetails(data[0]);

  // ----- functions -----
  function showDetails(d) {
    // fill #info with selected attributes (six attributes)
    details.html("");
    details.append("h3").text(d.Name);
    details.append("p").html(`<strong>Type:</strong> ${d.Type || "-"}`);
    details.append("p").html(`<strong>Retail Price:</strong> $${formatComma(d.RetailPrice)}`);
    details.append("p").html(`<strong>Dealer Cost:</strong> $${formatComma(d.DealerCost || 0)}`);
    details.append("p").html(`<strong>Engine Size:</strong> ${isFinite(d.EngineSize) ? formatOne(d.EngineSize) + " L" : "-"}`);
    details.append("p").html(`<strong>City MPG:</strong> ${isFinite(d.CityMPG) ? d.CityMPG : "-"}`);
    details.append("p").html(`<strong>Horsepower:</strong> ${isFinite(d.Horsepower) ? d.Horsepower : "-"}`);
  }

  function drawColorLegend(colorScale) {
    // small horizontal gradient svg
    const block = d3.select("#legend-color");
    block.html(""); // clear

    block.append("div").style("font-size","12px").text("Color → City MPG");

    const w = 160, h = 10;
    const canvas = block.append("canvas")
      .attr("width", w)
      .attr("height", h)
      .node();

    const ctx = canvas.getContext("2d");
    const n = w;
    for (let i = 0; i < n; i++){
      ctx.fillStyle = colorScale(d3.interpolateNumber(d3.min(colorScale.domain()), d3.max(colorScale.domain()))(i/(n-1)));
      // Instead of the above complex mapping, simply use:
      ctx.fillStyle = colorScale(d3.scaleLinear().domain([0, n-1]).range(colorScale.domain())(i));
      ctx.fillRect(i,0,1,h);
    }

    // show numeric min/max
    const domain = colorScale.domain();
    block.append("div").style("display","flex").style("justify-content","space-between")
      .html(`<span>${Math.round(domain[0])}</span><span>${Math.round(domain[1])}</span>`);
  }

  function drawSizeLegend(sizeScale) {
    const block = d3.select("#legend-size");
    block.html("");
    block.append("div").style("font-size","12px").text("Size → Engine Size (L)");

    // show three sample circles
    const values = [sizeScale.domain()[0], d3.mean(sizeScale.domain()), sizeScale.domain()[1]];
    const svgL = block.append("svg").attr("width", 160).attr("height", 40);
    values.forEach((v, i) => {
      svgL.append("circle")
        .attr("cx", 20 + i*50)
        .attr("cy", 20)
        .attr("r", sizeScale(v))
        .attr("fill", "#ddd")
        .attr("stroke", "#444")
        .attr("stroke-width", 0.7);
      svgL.append("text")
        .attr("x", 20 + i*50)
        .attr("y", 36)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .text(isFinite(v) ? formatOne(v) + "L" : "");
    });
  }

}).catch(err => {
  // show error in details box and console for debugging
  d3.select("#info").html(`<p style="color:red">Error loading data: ${err.message}</p><p class="hint">Open browser console for details.</p>`);
  console.error(err);
});
