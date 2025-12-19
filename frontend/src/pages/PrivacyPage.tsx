import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const PrivacyPage: React.FC = () => {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch('/docs/PRIVACY_POLICY.md')
      .then(response => response.text())
      .then(text => setMarkdown(text));
  }, []);

  return (
    <div className="container mx-auto p-8">
      <div className="prose lg:prose-xl">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
};

export default PrivacyPage;
