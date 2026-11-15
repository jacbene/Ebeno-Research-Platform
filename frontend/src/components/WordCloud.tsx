// frontend/src/components/WordCloud.tsx
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

    // ✅ NOUVEAU : Calculer la valeur min et max pour créer une échelle
    const values = words.map(w => w.value);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values);

    // ✅ NOUVEAU : Définir une taille de police max sûre (ex: 40px)
    // On laisse un peu d'espace pour le padding
    const maxFontSize = Math.min(40, height / 5);
    const minFontSize = 12;

    // ✅ NOUVEAU : Échelle linéaire pour la taille
    const fontSizeScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([minFontSize, maxFontSize]);

    const layout = cloud()
      .size([width, height])
      .words(words.map(w => ({ 
        text: w.word, 
        size: fontSizeScale(w.value) // ✅ On utilise la taille calculée
      })))
      .padding(4) // Un peu d'espace entre les mots
      .rotate(() => (Math.random() > 0.85 ? 90 : 0)) // Moins de rotation pour la lisibilité
      .font('Arial')
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
        // ✅ Couleurs plus douces et variées
        .style('fill', (d, i) => d3.schemeSet2[i % d3.schemeSet2.length])
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text);
    }
  }, [words, width, height]);

  return <svg ref={svgRef} width={width} height={height} style={{ display: 'block', margin: '0 auto' }} />;
};
