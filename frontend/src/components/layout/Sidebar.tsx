import React from 'react';
import { Document } from '../../types/project';

interface SidebarProps {
  documents: Document[];
  onSelectDocument: (documentId: string) => void;
  activeDocumentId: string | undefined;
}

const Sidebar: React.FC<SidebarProps> = ({ documents, onSelectDocument, activeDocumentId }) => {
  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-xl font-bold mb-4">Documents</h2>
      <ul>
        {documents.map(doc => (
          <li key={doc.id} onClick={() => onSelectDocument(doc.id)} className={`cursor-pointer ${activeDocumentId === doc.id ? 'font-bold' : ''}`}>
            {doc.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
