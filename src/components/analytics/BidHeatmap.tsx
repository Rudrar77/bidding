import { useEffect, useRef } from "react";
import * as d3 from "d3";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 12 }, (_, i) => `${(i * 2).toString().padStart(2, "0")}:00`);

function generateHeatData() {
  const data: { day: number; hour: number; value: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 12; h++) {
      const peak = h >= 4 && h <= 9 ? 1 : 0.3;
      const weekend = d >= 5 ? 1.3 : 1;
      data.push({ day: d, hour: h, value: Math.floor(Math.random() * 30 * peak * weekend) });
    }
  }
  return data;
}

export default function BidHeatmap() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const data = generateHeatData();
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 10, bottom: 10, left: 40 };
    const width = ref.current.clientWidth - margin.left - margin.right;
    const height = 220 - margin.top - margin.bottom;
    const cellW = width / 12;
    const cellH = height / 7;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleSequential(d3.interpolateYlOrBr).domain([0, 35]);

    g.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (d) => d.hour * cellW)
      .attr("y", (d) => d.day * cellH)
      .attr("width", cellW - 2)
      .attr("height", cellH - 2)
      .attr("rx", 3)
      .attr("fill", (d) => colorScale(d.value))
      .attr("opacity", 0.9);

    // Labels
    g.selectAll(".day-label")
      .data(days)
      .join("text")
      .attr("x", -5)
      .attr("y", (_, i) => i * cellH + cellH / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("fill", "hsl(220, 12%, 55%)")
      .attr("font-size", "10px")
      .text((d) => d);

    g.selectAll(".hour-label")
      .data(hours)
      .join("text")
      .attr("x", (_, i) => i * cellW + cellW / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(220, 12%, 55%)")
      .attr("font-size", "9px")
      .text((d) => d);
  }, []);

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4">Bid Activity Heatmap</h3>
      <svg ref={ref} width="100%" height={220} />
    </div>
  );
}
