import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import d3Cloud, { Word } from 'd3-cloud';
import { WordCloudData } from '../../types/visualization'; // Fixed TS2307
import { Download } from 'lucide-react';

interface WordCloudVisualizationProps {
  data: WordCloudData;
  onExport?: (format: string) => void;
}

// Étend le type Word de d3-cloud pour inclure notre 'value' d'origine
interface MyWord extends Word {
  value: number;
}

const WordCloudVisualization: React.FC<WordCloudVisualizationProps> = ({ data, onExport }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { words, maxFrequency } = data;

  const getFontSize = (d: { value: number }): number => {
    const minSize = 12;
    const maxSize = 60;
    if (maxFrequency === 0) return minSize;
    return minSize + (maxSize - minSize) * (d.value / maxFrequency);
  };
  
  const getFill = (_d: MyWord, i: number): string => {
    return d3.schemeCategory10[i % 10];
  };

  useEffect(() => {
    if (!words || words.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = svg.node()!.getBoundingClientRect();
    
    // Fixed TS7006: Explicitly typed 'w' as WordCloudData['words'][number]
    const layoutWords: MyWord[] = words.map((w: WordCloudData['words'][number]) => ({ 
      ...w,
      size: getFontSize(w),
      text: w.text,
      value: w.value,
    }));

    const layout = d3Cloud<MyWord>()
      .size([width, height])
      .words(layoutWords)
      .padding(5)
      .rotate(() => (Math.random() > 0.5 ? 90 : 0))
      .font('Impact')
      .fontSize(d => d.size!)
      .on('end', (drawnWords) => {
        const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

        g.selectAll('text')
          .data(drawnWords)
          .enter()
          .append('text')
          .style('font-size', d => `${d.size}px`)
          .style('font-family', 'Impact')
          .style('fill', (d, i) => getFill(d, i))
          .attr('text-anchor', 'middle')
          .attr('transform', d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
          // Fixed TS2345: Ensured the return type is compatible by explicitly returning string or null
          .text((d: MyWord) => d.text || '') 
          .on('mouseover', function () {
            d3.select(this).style('font-weight', 'bold').style('cursor', 'pointer');
          })
          .on('mouseout', function () {
            d3.select(this).style('font-weight', 'normal');
          })
          .append('title')
          .text(d => `${d.text} (fréquence: ${d.value})`);
      });

    layout.start();

  }, [words, maxFrequency, getFill]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Nuage de mots</h3>
        {onExport && (
          <button onClick={() => onExport('svg')} className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
        )}
      </div>
      <div style={{ height: '400px', width: '100%' }}>
        <svg ref={svgRef} width="100%" height="100%"></svg>
      </div>
    </div>
  );
};

export default WordCloudVisualization;