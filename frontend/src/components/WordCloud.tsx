import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface WordCloudProps {
  words: Array<{ word: string; value: number }>;
  width?: number;
  height?: number;
}

export const WordCloudComponent: React.FC<WordCloudProps> = ({
  words,
  width = 500,
  height = 400,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || words.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const layout = cloud()
      .size([width, height])
      .words(words.map(w => ({ text: w.word, size: w.value })))
      .padding(5)
      .rotate(() => (Math.random() > 0.7 ? 90 : 0))
      .font('Arial')
      .fontSize(d => d.size * 1.5 + 10)
      .on('end', draw);

    layout.start();

    function draw(words: any[]) {
      svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`)
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', d => d.size + 'px')
        .style('font-family', 'Arial')
        .style('fill', () => d3.schemeCategory10[Math.floor(Math.random() * 10)])
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text);
    }
  }, [words, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
};
