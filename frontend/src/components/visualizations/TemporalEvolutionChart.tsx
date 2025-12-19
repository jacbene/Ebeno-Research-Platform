import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, TooltipProps
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { TemporalData } from '../../types/visualization';
import { Calendar, Download } from 'lucide-react';

interface TemporalEvolutionChartProps {
  data: TemporalData;
  title?: string;
  onExport?: (format: string) => void;
}

type ChartDataPoint = {
  date: string;
  [key: string]: number | string;
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color || 'transparent' }}/>
                <span className="text-sm text-gray-700">{entry.name}</span>
              </div>
              <span className="text-sm font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const TemporalEvolutionChart: React.FC<TemporalEvolutionChartProps> = ({
  data,
  title = 'Évolution temporelle',
  onExport,
}) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  const chartData: ChartDataPoint[] = data.categories.map((category, index) => {
    const point: ChartDataPoint = { date: category };
    data.series.forEach(series => {
      point[series.name] = series.data[index] || 0;
    });
    return point;
  });

  const handleLegendClick = (payload: any) => {
    if (payload.dataKey) {
      setHiddenSeries(prev => 
        prev.includes(payload.dataKey as string) 
          ? prev.filter(name => name !== payload.dataKey) 
          : [...prev, payload.dataKey as string]
      );
    }
  };
  
  const ChartComponent = chartType === 'line' ? LineChart : AreaChart;
  const ChartElement = chartType === 'line' ? Line : Area;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{new Date(data.timeRange.start).toLocaleDateString()} - {new Date(data.timeRange.end).toLocaleDateString()}</span>
            <span>•</span>
            <span>{data.totalAnnotations} annotations</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setChartType('line')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${chartType === 'line' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Lignes</button>
            <button onClick={() => setChartType('area')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${chartType === 'area' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Aires</button>
          </div>
          {onExport && (
            <button onClick={() => onExport('png')} className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <Download className="h-4 w-4" /><span>Exporter</span>
            </button>
          )}
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend onClick={handleLegendClick} wrapperStyle={{ cursor: 'pointer', paddingTop: '20px' }} />
            {data.series.map((series) => 
              <ChartElement 
                key={series.name} 
                type="monotone" 
                dataKey={series.name} 
                stroke={series.color} 
                fill={series.color} 
                strokeWidth={2} 
                hide={hiddenSeries.includes(series.name)}
                {...(chartType === 'line' ? { dot: { r: 3 }, activeDot: { r: 6 } } : { fillOpacity: 0.3, stackId: '1' })}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-100">
        {/* ... Additional stats ... */}
      </div>
    </div>
  );
};

export default TemporalEvolutionChart;
