import { useParams } from 'react-router-dom';
import CodeManager from '../components/coding/CodeManager';
import CodingDashboard from '../components/coding/CodingDashboard';
import TextAnnotator from '../components/coding/TextAnnotator';

const AnalysisPage = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <div>Projet non trouvé</div>;
  }

  const fakeContent = `
  Le soleil brille, les oiseaux chantent.
  La vie est belle à la campagne.
  J'aime me promener dans les bois.
  `;

  return (
    <div className="space-y-8">
      <CodingDashboard projectId={projectId} />
      <CodeManager projectId={projectId} />
      <TextAnnotator documentId="some-document-id" content={fakeContent} projectId={projectId} />
    </div>
  );
};

export default AnalysisPage;
