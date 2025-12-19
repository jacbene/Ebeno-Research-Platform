import React from 'react';
import { ProjectData } from '../../types/project';

interface VisualizationAreaProps {
  projectData: ProjectData | null;
}

const VisualizationArea: React.FC<VisualizationAreaProps> = ({ projectData }) => {
  if (!projectData) {
    return <div>Loading visualizations...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Visualizations</h2>
      {/* Visualizations will go here */}
    </div>
  );
};

export default VisualizationArea;
