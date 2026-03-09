import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { categoryData } from "@/lib/mock-data";

export default function CategorySunburst() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 300;
    const radius = width / 2;

    const root = d3.hierarchy({ name: "root", children: categoryData })
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partition = d3.partition<any>().size([2 * Math.PI, radius]);
    partition(root);

    const color = d3.scaleOrdinal<string>()
      .domain(categoryData.map((d) => d.name))
      .range(["#e5a919", "#c4941a", "#a37d15", "#8b6914", "#d4a017"]);

    const arc = d3.arc<any>()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .innerRadius((d: any) => d.y0 * 0.7)
      .outerRadius((d: any) => d.y1 * 0.7 - 1)
      .padAngle(0.02)
      .padRadius(radius / 2);

    const g = svg.append("g").attr("transform", `translate(${width / 2},${width / 2})`);

    g.selectAll("path")
      .data(root.descendants().filter((d) => d.depth > 0))
      .join("path")
      .attr("d", arc)
      .attr("fill", (d: any) => {
        let node = d;
        while (node.depth > 1) node = node.parent;
        return color(node.data.name);
      })
      .attr("opacity", (d: any) => d.depth === 1 ? 0.9 : 0.6)
      .attr("stroke", "hsl(222, 30%, 6%)")
      .attr("stroke-width", 1);

    // Labels
    g.selectAll("text")
      .data(root.descendants().filter((d: any) => d.depth === 1 && d.x1 - d.x0 > 0.3))
      .join("text")
      .attr("transform", (d: any) => {
        const angle = ((d.x0 + d.x1) / 2) * (180 / Math.PI) - 90;
        const r = (d.y0 + d.y1) / 2 * 0.7;
        return `rotate(${angle}) translate(${r},0) rotate(${angle > 90 ? 180 : 0})`;
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "hsl(222, 30%, 6%)")
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .text((d: any) => d.data.name);
  }, []);

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4">Category Distribution</h3>
      <div className="flex justify-center">
        <svg ref={ref} width={300} height={300} />
      </div>
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {categoryData.map((c) => (
          <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" style={{ opacity: 0.5 + (c.value / 35) * 0.5 }} />
            {c.name} ({c.value}%)
          </div>
        ))}
      </div>
    </div>
  );
}
