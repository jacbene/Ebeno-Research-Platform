
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const TermsPage: React.FC = () => {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch('/docs/TERMS_OF_USE.md')
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

export default TermsPage;
