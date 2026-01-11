import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, TooltipProps
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { CodeFrequencyData, Frequency, GroupedFrequency } from '../../types/visualization'; // Assuming visualization module has these named exports
import { BarChart3, PieChart as PieChartIcon, Download } from 'lucide-react';

interface CodeFrequencyChartProps {
  data: CodeFrequencyData;
  title?: string;
  onExport?: (format: string) => void;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  percentage?: number;
  children?: Frequency[];
  [key: string]: any; // Add index signature
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    // Ensure payload[0].payload is treated as the expected ChartDataItem
    const data = payload[0].payload as ChartDataItem;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label !== undefined ? String(label) : data.name}</p> {/* Cast label to String */}
        <p className="text-sm"><span className="font-medium">Annotations:</span> {data.value}</p>
        {data.percentage && <p className="text-sm"><span className="font-medium">Pourcentage:</span> {data.percentage.toFixed(1)}%</p>}
      </div>
    );
  }
  return null;
};

const CodeFrequencyChart: React.FC<CodeFrequencyChartProps> = ({
  data,
  title = 'Fréquence des codes',
  onExport,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');

  const flatData: ChartDataItem[] = data.frequencies
    .map((f: Frequency) => ({ name: f.codeName, value: f.count, color: f.codeColor, percentage: f.percentage }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  const groupedChartData: ChartDataItem[] = data.groupedFrequencies.map((g: GroupedFrequency) => ({
    name: g.parentName,
    value: g.total,
    color: g.color,
    children: g.children,
  }));
  
  const pieChartData: ChartDataItem[] = data.frequencies
    .map((f: Frequency) => ({ name: f.codeName, value: f.count, color: f.codeColor, percentage: f.percentage }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const renderColorfulLegendText = (value: string, entry: any) => (
    <span style={{ color: entry.color }} className="text-sm">{value}</span>
  );
  
  interface PieLabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    name: string;
  }

  const renderPieLabel = (props: PieLabelProps) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{data.totalAnnotations} annotations sur {data.totalCodes} codes</p>
        </div>
        <div className="flex space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setChartType('bar')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${chartType === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}><BarChart3 className="h-4 w-4 inline mr-1" />Barres</button>
            <button onClick={() => setChartType('pie')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${chartType === 'pie' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}><PieChartIcon className="h-4 w-4 inline mr-1" />Secteurs</button>
          </div>
          {chartType === 'bar' && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setViewMode('flat')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'flat' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Plat</button>
              <button onClick={() => setViewMode('grouped')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grouped' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-ray-900'}`}>Groupé</button>
            </div>
          )}
          {onExport && (<button onClick={() => onExport('png')} className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"><Download className="h-4 w-4" /><span>Exporter</span></button>)}
        </div>
      </div>

      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          {chartType === 'bar' ? (
            <BarChart data={viewMode === 'flat' ? flatData : groupedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-60} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={renderColorfulLegendText} />
              <Bar dataKey="value" name="Annotations">
                {(viewMode === 'flat' ? flatData : groupedChartData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={renderPieLabel} >
                {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CodeFrequencyChart;