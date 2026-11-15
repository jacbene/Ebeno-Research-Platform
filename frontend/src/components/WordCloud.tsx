// frontend/src/components/WordCloud.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

// ✅ NOUVEAU : Accepter les deux formats
interface WordCloudWord {
  word?: string;
  text?: string;
  value: number;
}

interface WordCloudProps {
  words: WordCloudWord[];
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
    if (!svgRef.current || !words || words.length === 0) return;

    // ✅ NOUVEAU : Normaliser les mots (accepter word OU text)
    const normalizedWords = words
      .map(w => ({
        text: w.word || w.text || '',
        value: w.value || 1,
      }))
      .filter(w => w.text.length > 0);

    if (normalizedWords.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ✅ Calculer la valeur min et max pour une échelle
    const values = normalizedWords.map(w => w.value);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values);

    // ✅ Tailles sûres
    const maxFontSize = Math.min(36, height / 6);
    const minFontSize = 12;

    const fontSizeScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([minFontSize, maxFontSize]);

    const layout = cloud()
      .size([width, height])
      .words(normalizedWords.map(w => ({
        text: w.text,
        size: fontSizeScale(w.value),
      })))
      .padding(4)
      .rotate(() => (Math.random() > 0.85 ? 90 : 0))
      .font('Arial, sans-serif')
      .fontSize(d => d.size)
      .on('end', draw);

    layout.start();

    function draw(wordsToDraw: any[]) {
      svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll('text')
        .data(wordsToDraw)
        .enter()
        .append('text')
        .style('font-size', d => d.size + 'px')
        .style('font-family', 'Arial, sans-serif')
        .style('font-weight', 'bold')
        .style('fill', (d, i) => d3.schemeSet2[i % d3.schemeSet2.length])
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text);
    }
  }, [words, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ display: 'block', margin: '0 auto' }}
    />
  );
};
