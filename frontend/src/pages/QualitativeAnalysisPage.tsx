import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import DocumentViewer from '../components/document/DocumentViewer';
import VisualizationArea from '../components/visualizations/VisualizationArea';
import { getProjectDocuments, getProjectData } from '../services/api';
// import { Document, ProjectData } from '../types/project';

const QualitativeAnalysisPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!projectId) return;
        setIsLoading(true);
        const [docs, projData] = await Promise.all([
          getProjectDocuments(projectId),
          getProjectData(projectId),
        ]);
        setDocuments(docs);
        setProjectData(projData);
        if (docs.length > 0) {
          setSelectedDocument(docs[0]);
        }
      } catch (err) {
        setError('Failed to load project data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleSelectDocument = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (doc) {
      setSelectedDocument(doc);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        documents={documents} 
        onSelectDocument={handleSelectDocument} 
        activeDocumentId={selectedDocument?.id}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedDocument ? (
          <DocumentViewer document={selectedDocument} />
        ) : (
          <div className="flex-1 flex justify-center items-center">Select a document to view</div>
        )}
        <VisualizationArea projectData={projectData} />
      </main>
    </div>
  );
};

export default QualitativeAnalysisPage;
