import PropTypes from 'prop-types';
import { useState } from 'react';

export const DEFAULT_UNSTRUCTURED_OPTIONS = {
  strategy: 'fast',
  chunking_strategy: 'basic',
  chunking_options: {
    // Basic strategy options
    maxCharacters: 4000,
    newAfterNChars: 3000,
    combineTextUnderNChars: 2000,
    overlap: 200,
    overlapAll: false,
    // By title strategy options
    multiPageSections: false
  }
};

const UnstructuredChunk = ({ onOptionsChange }) => {
  const [unstructuredStrategy, setUnstructuredStrategy] = useState(DEFAULT_UNSTRUCTURED_OPTIONS.strategy);
  const [chunkingStrategy, setChunkingStrategy] = useState(DEFAULT_UNSTRUCTURED_OPTIONS.chunking_strategy);
  const [chunkingOptions, setChunkingOptions] = useState(DEFAULT_UNSTRUCTURED_OPTIONS.chunking_options);

  // 当任何选项改变时，通知父组件
  const handleOptionChange = (newOptions, strategy = unstructuredStrategy, chunkingStrategy = chunkingStrategy) => {
    // 根据当前策略过滤选项
    const filteredOptions = chunkingStrategy === 'basic' 
      ? {
          maxCharacters: newOptions.maxCharacters,
          newAfterNChars: newOptions.newAfterNChars,
          combineTextUnderNChars: newOptions.combineTextUnderNChars,
          overlap: newOptions.overlap,
          overlapAll: newOptions.overlapAll
        }
      : {
          combineTextUnderNChars: newOptions.combineTextUnderNChars,
          multiPageSections: newOptions.multiPageSections
        };

    onOptionsChange({
      strategy: strategy,
      chunking_strategy: chunkingStrategy,
      chunking_options: filteredOptions
    });
  };

  // 处理策略变化
  const handleStrategyChange = (e) => {
    const newStrategy = e.target.value;
    setUnstructuredStrategy(newStrategy);
    handleOptionChange(chunkingOptions, newStrategy, chunkingStrategy);
  };

  // 处理分块策略变化
  const handleChunkingStrategyChange = (e) => {
    const newStrategy = e.target.value;
    setChunkingStrategy(newStrategy);
    // 当策略改变时，重置相关选项
    const newOptions = newStrategy === 'basic'
      ? {
          maxCharacters: DEFAULT_UNSTRUCTURED_OPTIONS.chunking_options.maxCharacters,
          newAfterNChars: DEFAULT_UNSTRUCTURED_OPTIONS.chunking_options.newAfterNChars,
          combineTextUnderNChars: DEFAULT_UNSTRUCTURED_OPTIONS.chunking_options.combineTextUnderNChars,
          overlap: DEFAULT_UNSTRUCTURED_OPTIONS.chunking_options.overlap,
          overlapAll: DEFAULT_UNSTRUCTURED_OPTIONS.chunking_options.overlapAll
        }
      : {
          combineTextUnderNChars: DEFAULT_UNSTRUCTURED_OPTIONS.chunking_options.combineTextUnderNChars,
          multiPageSections: DEFAULT_UNSTRUCTURED_OPTIONS.chunking_options.multiPageSections
        };
    setChunkingOptions(newOptions);
    handleOptionChange(newOptions, unstructuredStrategy, newStrategy);
  };

  // 处理分块选项变化
  const handleChunkingOptionsChange = (newOptions) => {
    setChunkingOptions(newOptions);
    handleOptionChange(newOptions, unstructuredStrategy, chunkingStrategy);
  };

  return (
    <>
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Unstructured Strategy</label>
        <select
          value={unstructuredStrategy}
          onChange={handleStrategyChange}
          className="block w-full p-2 border rounded"
        >
          <option value="fast">Fast</option>
          <option value="hi_res">High Resolution</option>
          <option value="ocr_only">OCR Only</option>
        </select>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Chunking Strategy</label>
        <select
          value={chunkingStrategy}
          onChange={handleChunkingStrategyChange}
          className="block w-full p-2 border rounded"
        >
          <option value="basic">Basic</option>
          <option value="by_title">By Title</option>
        </select>
      </div>

      {chunkingStrategy === 'basic' && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Max Characters</label>
            <input
              type="number"
              value={chunkingOptions.maxCharacters}
              onChange={(e) => handleChunkingOptionsChange({
                ...chunkingOptions,
                maxCharacters: parseInt(e.target.value)
              })}
              className="block w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New After N Chars</label>
            <input
              type="number"
              value={chunkingOptions.newAfterNChars}
              onChange={(e) => handleChunkingOptionsChange({
                ...chunkingOptions,
                newAfterNChars: parseInt(e.target.value)
              })}
              className="block w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Combine Text Under N Chars</label>
            <input
              type="number"
              value={chunkingOptions.combineTextUnderNChars}
              onChange={(e) => handleChunkingOptionsChange({
                ...chunkingOptions,
                combineTextUnderNChars: parseInt(e.target.value)
              })}
              className="block w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Overlap</label>
            <input
              type="number"
              value={chunkingOptions.overlap}
              onChange={(e) => handleChunkingOptionsChange({
                ...chunkingOptions,
                overlap: parseInt(e.target.value)
              })}
              className="block w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={chunkingOptions.overlapAll}
              onChange={(e) => handleChunkingOptionsChange({
                ...chunkingOptions,
                overlapAll: e.target.checked
              })}
              className="mr-2"
            />
            <label className="text-sm font-medium">Overlap All</label>
          </div>
        </div>
      )}

      {chunkingStrategy === 'by_title' && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Combine Text Under N Chars</label>
            <input
              type="number"
              value={chunkingOptions.combineTextUnderNChars}
              onChange={(e) => handleChunkingOptionsChange({
                ...chunkingOptions,
                combineTextUnderNChars: parseInt(e.target.value)
              })}
              className="block w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={chunkingOptions.multiPageSections}
              onChange={(e) => handleChunkingOptionsChange({
                ...chunkingOptions,
                multiPageSections: e.target.checked
              })}
              className="mr-2"
            />
            <label className="text-sm font-medium">Multi-page Sections</label>
          </div>
        </div>
      )}
    </>
  );
};

UnstructuredChunk.propTypes = {
  onOptionsChange: PropTypes.func.isRequired
};

export default UnstructuredChunk; 