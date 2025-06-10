import PropTypes from 'prop-types';
import { useState } from 'react';

export const DEFAULT_TEXT_OPTIONS = {
  chunking_strategy: 'single'
};

const TextChunk = ({ onOptionsChange }) => {
  const [chunkingStrategy, setChunkingStrategy] = useState(DEFAULT_TEXT_OPTIONS.chunking_strategy);

  const handleChunkingStrategyChange = (e) => {
    const newStrategy = e.target.value;
    setChunkingStrategy(newStrategy);
    onOptionsChange({
      chunking_strategy: newStrategy
    });
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium mb-1">Chunking Strategy</label>
      <select
        value={chunkingStrategy}
        onChange={handleChunkingStrategyChange}
        className="block w-full p-2 border rounded"
      >
        <option value="single">Single Document</option>
        <option value="by_paragraphs">By Paragraphs</option>
      </select>
    </div>
  );
};

TextChunk.propTypes = {
  onOptionsChange: PropTypes.func.isRequired
};

export default TextChunk; 