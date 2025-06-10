import PropTypes from 'prop-types';
import { useState } from 'react';

export const DEFAULT_MARKDOWN_OPTIONS = {
  markdown_mode: 'single',
  strategy: 'fast'
};

const MarkdownChunk = ({ onOptionsChange }) => {
  const [markdownMode, setMarkdownMode] = useState(DEFAULT_MARKDOWN_OPTIONS.markdown_mode);
  const [markdownStrategy, setMarkdownStrategy] = useState(DEFAULT_MARKDOWN_OPTIONS.strategy);

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMarkdownMode(newMode);
    onOptionsChange({
      markdown_mode: newMode,
      strategy: markdownStrategy
    });
  };

  const handleStrategyChange = (e) => {
    const newStrategy = e.target.value;
    setMarkdownStrategy(newStrategy);
    onOptionsChange({
      markdown_mode: markdownMode,
      strategy: newStrategy
    });
  };

  return (
    <>
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Markdown Loader Mode</label>
        <select
          value={markdownMode}
          onChange={handleModeChange}
          className="block w-full p-2 border rounded"
        >
          <option value="single">Single Document</option>
          <option value="elements">Elements</option>
        </select>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Markdown Loader Strategy</label>
        <select
          value={markdownStrategy}
          onChange={handleStrategyChange}
          className="block w-full p-2 border rounded"
        >
          <option value="fast">Fast</option>
          <option value="hi_res">High Resolution</option>
          <option value="ocr_only">OCR Only</option>
        </select>
      </div>
    </>
  );
};

MarkdownChunk.propTypes = {
  onOptionsChange: PropTypes.func.isRequired
};

export default MarkdownChunk; 