import React from 'react';
import { Document } from '../../types/project';

interface DocumentViewerProps {
  document: Document;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{document.name}</h2>
      <p>{document.content}</p>
    </div>
  );
};

export default DocumentViewer;
