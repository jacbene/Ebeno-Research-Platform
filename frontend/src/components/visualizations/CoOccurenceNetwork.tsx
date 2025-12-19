import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CoOccurrenceData, Node as D3Node, Link as D3Link } from '../../types/visualization';
import { ZoomIn, ZoomOut, Download, Maximize } from 'lucide-react';

interface CooccurrenceNetworkProps {
  data: CoOccurrenceData;
  onExport?: (format: string) => void;
}

// Combine D3's simulation node with our custom node properties
type NetworkNode = D3Node & d3.SimulationNodeDatum;

// Combine D3's simulation link with our custom link properties
type NetworkLink = D3Link & d3.SimulationLinkDatum<NetworkNode>;

const CooccurrenceNetwork: React.FC<CooccurrenceNetworkProps> = ({ data, onExport }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink>>();
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render
    
    const { width, height } = svg.node()!.getBoundingClientRect();

    const g = svg.append('g');

    // Use the combined types for nodes and links
    const nodes: NetworkNode[] = data.nodes.map(d => ({ ...d }));
    const links: NetworkLink[] = data.links.map(d => ({...d, source: d.source, target: d.target}));

    simulationRef.current = d3.forceSimulation<NetworkNode, NetworkLink>(nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkLink>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = g.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', d => Math.sqrt(d.value));

    const node = g.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => 5 + d.value * 2)
      .attr('fill', d => d.color)
      .on('mouseover', function(_event) {
        d3.select(this).attr('stroke', 'black');
      })
      .on('mouseout', function(_event, d) {
        if (selectedNode?.id !== d.id) {
          d3.select(this).attr('stroke', '#fff');
        }
      })
      .on('click', (_event, d) => {
        setSelectedNode(d);
      });

    node.append('title')
      .text(d => `${d.name} (${d.value})`);

    simulationRef.current.on('tick', () => {
      link
        .attr('x1', d => (d.source as NetworkNode).x!)
        .attr('y1', d => (d.source as NetworkNode).y!)
        .attr('x2', d => (d.target as NetworkNode).x!)
        .attr('y2', d => (d.target as NetworkNode).y!); 
      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);
    });

    zoomRef.current = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomRef.current);

  }, [data, selectedNode]);

  const handleZoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6" id="co-occurrence-chart">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Réseau de co-occurrence</h3>
        <div className="flex items-center space-x-2">
          <button onClick={handleZoomIn} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"><ZoomIn size={18} /></button>
          <button onClick={handleZoomOut} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"><ZoomOut size={18} /></button>
          <button onClick={handleResetZoom} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"><Maximize size={18} /></button>
          {onExport && (
            <button onClick={() => onExport('svg')} className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <Download className="h-4 w-4" />
              <span>Exporter</span>
            </button>
          )}
        </div>
      </div>
      <div className="h-96 w-full relative">
        <svg ref={svgRef} className="w-full h-full"></svg>
        {selectedNode && (
          <div className="absolute top-2 right-2 bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
            <h4 className="font-bold mb-2">{selectedNode.name}</h4>
            <p><strong>Occurrences:</strong> {selectedNode.value}</p>
            <button onClick={() => setSelectedNode(null)} className="text-blue-600 hover:underline mt-2">Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CooccurrenceNetwork;
