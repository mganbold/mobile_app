import { Component, Input, OnInit, ElementRef } from '@angular/core';
import { ILineItem } from '../../interfaces';
import * as d3 from "d3";

@Component({
  selector: 'line-chart',
  templateUrl: 'line-chart.html'
})
export class LineChartComponent implements OnInit {
  @Input() width: number = 330;
  @Input() height: number = 240;
  @Input() data: ILineItem[] = [];
  @Input() lineColors: string[] = ["orange", "red", "green"];
  @Input() dotColors: string[] = ["orange", "red", "green"];
  @Input() dateFormat: string = "%m/%d";
  @Input() series: string[] = ["line1", "line2", "line3"];

  private element: any;
  private margin: any = { left: 10, right: 10, top: 10, bottom: 10 };

  constructor(element: ElementRef) {
    this.element = element.nativeElement;
  }

  ngOnInit() {
    this._draw();
  }

  private _draw() {
    const delay = 100;
    const viewBoxWithMultiplier = 1.1;
    const width = this.width - this.margin.left - this.margin.right;
    const height = this.height - this.margin.top - this.margin.bottom;

    const svg = d3.select(this.element).select("svg")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .attr("viewBox", "0 0 " + this.width * viewBoxWithMultiplier + " " + this.height * viewBoxWithMultiplier);

    // set the domain and ranges for x axis
    const x = d3.scaleTime()
      .domain(d3.extent(this.data, (d: ILineItem) => d.date))
      .range([0, width]);

    // set the domain and ranges for y axis
    const y = d3.scaleLinear()
      // TODO: make col names more dynamic.
      .domain([0, d3.max(this.data, d => Math.max(d["line1"] || 0, d["line2"] || 0, d["line3"] || 0))])
      .range([height, 0]);

    this.series.forEach((colName, index) => {
      // make line function
      const lineFunc = this._makeLineFunc(x, y, colName);

       // add line paths using the line functions.
      const path = this._addPath(lineFunc, "path" + index, this.lineColors[index]);

      // add dots
      this._addDots(svg, x, y, colName, this.dotColors[index]);

      // animate lines.
      this._animatePath(path, delay * (index + 1), 500);
    });

    // x and y axis
    const xAxis = d3.axisBottom(x)
      .ticks(5)
      .tickPadding(5)
      .tickSizeInner(-height)
      .tickFormat(d3.timeFormat(this.dateFormat));

    const yAxis = d3.axisLeft(y)
      .ticks(5)
      .tickPadding(5)
      .tickSizeInner(-width);

    svg.append("g")
      .attr("transform", "translate(20, 10)")
      .call(yAxis);

    svg.append("g")
      .attr("transform", "translate(20," + (height + this.margin.top) + ")")
      .call(xAxis);
  }

  private _makeLineFunc(x: (date: any) => any, y: (val: number) => any, colName: string): any {
    return d3.line()
      .x(d => x(d.date))
      .y(d => y(d[colName]));
  }

  private _addPath(lineFunc: (data: any) => any, id: string, color: string) {
    return d3.select(this.element).select("#" + id)
      .attr("d", lineFunc(this.data))
      .attr("transform", "translate(20, 10)")
      .attr("stroke", color)
      .attr("stroke-width", "2");
  }

  private _addDots(svg: any, x: any, y: any, colName: string, color: string) {
    return svg.selectAll("dot")
      .data(this.data)
      .enter().append("svg:circle")
      .attr("transform", "translate(20, 10)")
      .attr("r", 3)
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d[colName]))
      .style("fill", color);
  }

  private _animatePath(path: any, delay: number = 0, duration: number = 0) {
    const totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .delay(delay)
      .duration(duration)
      .attr("stroke-dashoffset", 0);
  }

}