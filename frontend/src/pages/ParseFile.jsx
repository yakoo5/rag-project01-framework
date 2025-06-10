import { useState, useEffect, useMemo } from 'react';
import RandomImage from '../components/RandomImage';
import UnstructuredChunk, { DEFAULT_UNSTRUCTURED_OPTIONS } from '../components/UnstructuredChunk';
import TextChunk, { DEFAULT_TEXT_OPTIONS } from '../components/TextChunk';
import MarkdownChunk, { DEFAULT_MARKDOWN_OPTIONS } from '../components/MarkdownChunk';
import { apiBaseUrl } from '../config/config';

const ParseFile = () => {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [loadingMethod, setLoadingMethod] = useState('pymupdf');
  const [parsingOption, setParsingOption] = useState('all_text');
  const [parsedContent, setParsedContent] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Add new state variables for options
  const [unstructuredOptions, setUnstructuredOptions] = useState(DEFAULT_UNSTRUCTURED_OPTIONS);
  const [textOptions, setTextOptions] = useState(DEFAULT_TEXT_OPTIONS);
  const [markdownOptions, setMarkdownOptions] = useState(DEFAULT_MARKDOWN_OPTIONS);

  // Define loading methods by file type
  const loadingMethodsByType = {
    'pdf': [
      { value: 'pymupdf', label: 'PyMuPDF' },
      { value: 'pypdf', label: 'PyPDF' },
      { value: 'pdfplumber', label: 'PDFPlumber' },
      { value: 'unstructured', label: 'Unstructured' }
    ],
    'txt': [
      { value: 'txt', label: 'Text File' }
    ],
    'json': [
      { value: 'json', label: 'JSON File' }
    ],
    'doc': [
      { value: 'word', label: 'Word Document' }
    ],
    'docx': [
      { value: 'word', label: 'Word Document' }
    ],
    'ppt': [
      { value: 'ppt', label: 'PowerPoint' }
    ],
    'pptx': [
      { value: 'ppt', label: 'PowerPoint' }
    ],
    'md': [
      { value: 'markdown', label: 'Markdown (LangChain)' }
    ]
  };

  // Use useMemo to cache available loading methods
  const availableLoadingMethods = useMemo(() => {
    return fileType ? loadingMethodsByType[fileType] || [] : [];
  }, [fileType]);

  // Auto-set loading method when file type changes
  useEffect(() => {
    if (fileType && availableLoadingMethods.length > 0) {
      setLoadingMethod(availableLoadingMethods[0].value);
    }
  }, [fileType, availableLoadingMethods]);

  // 定义选项处理配置
  const OPTIONS_PROCESSORS = {
    unstructured: {
      chunking_options: (value) => JSON.stringify(value)
    },
    markdown: {
      // 可以添加 markdown 特定的处理逻辑
    },
    txt: {
      // 可以添加 txt 特定的处理逻辑
    }
  };

  // 获取当前加载方法对应的选项
  const getCurrentOptions = () => {
    switch (loadingMethod) {
      case 'unstructured':
        return unstructuredOptions;
      case 'markdown':
        return markdownOptions;
      case 'txt':
        return textOptions;
      default:
        return {};
    }
  };

  // 处理选项值
  const processOptionValue = (method, key, value) => {
    // 如果值为 null 或 undefined，返回 null
    if (value == null) {
      return null;
    }
    const processor = OPTIONS_PROCESSORS[method]?.[key];
    return processor ? processor(value) : value;
  };

  const handleProcess = async () => {
    if (!file || !loadingMethod || !parsingOption) {
      setProcessingStatus('Please select all required options');
      return;
    }

    setProcessingStatus('Processing...');
    setParsedContent(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('loading_method', loadingMethod);
      formData.append('parsing_option', parsingOption);
      
      const currentOptions = getCurrentOptions();
      
      // 将所有非空选项添加到 formData
      Object.entries(currentOptions).forEach(([key, value]) => {
        const processedValue = processOptionValue(loadingMethod, key, value);
        // 只有当处理后的值不为 null 时才添加到 formData
        if (processedValue != null) {
          formData.append(key, processedValue);
        }
      });

      const response = await fetch(`${apiBaseUrl}/parse`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setParsedContent(data.parsed_content);
      setProcessingStatus('Processing completed successfully!');
    } catch (error) {
      console.error('Error:', error);
      setProcessingStatus(`Error: ${error.message}`);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      setFile(selectedFile);
      setFileType(extension);
    } else {
      setFile(null);
      setFileType(null);
    }
  };

  // Render loading method options
  const renderLoadingMethodSelect = () => (
    <div className="mt-4">
      <label className="block text-sm font-medium mb-1">Loading Method</label>
      <select
        value={loadingMethod}
        onChange={(e) => setLoadingMethod(e.target.value)}
        className="block w-full p-2 border rounded"
        disabled={!fileType}
      >
        {availableLoadingMethods.map(method => (
          <option key={method.value} value={method.value}>
            {method.label}
          </option>
        ))}
      </select>
    </div>
  );

  // Render chunk component based on loading method
  const renderChunkComponent = () => {
    switch (loadingMethod) {
      case 'txt':
        return <TextChunk onOptionsChange={setTextOptions} />;
      case 'markdown':
        return <MarkdownChunk onOptionsChange={setMarkdownOptions} />;
      case 'unstructured':
        return <UnstructuredChunk onOptionsChange={setUnstructuredOptions} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Parse File</h2>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel (3/12) */}
        <div className="col-span-3 space-y-4">
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Upload File</label>
              <input
                type="file"
                accept=".pdf,.txt,.json,.doc,.docx,.ppt,.pptx,.md"
                onChange={handleFileSelect}
                className="block w-full border rounded px-3 py-2"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Supported file types: PDF, TXT, JSON, Word (DOC/DOCX), PowerPoint (PPT/PPTX), Markdown (MD)
              </p>
            </div>

            {renderLoadingMethodSelect()}
            {renderChunkComponent()}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Parsing Option</label>
              <select
                value={parsingOption}
                onChange={(e) => setParsingOption(e.target.value)}
                className="block w-full p-2 border rounded"
              >
                <option value="all_text">All Text</option>
                <option value="by_pages">By Pages</option>
                <option value="by_titles">By Titles</option>
                <option value="text_and_tables">Text and Tables</option>
              </select>
            </div>

            <button 
              onClick={handleProcess}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!file}
            >
              Process File
            </button>

            {processingStatus && (
              <div className="mt-4 p-2 text-sm text-gray-600">
                {processingStatus}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel (9/12) */}
        <div className="col-span-9 border rounded-lg bg-white shadow-sm">
          {parsedContent ? (
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-4">Parsing Results</h3>
              <div className="mb-4 p-3 border rounded bg-gray-100">
                <h4 className="font-medium mb-2">Document Information</h4>
                <div className="text-sm text-gray-600">
                  <p>Total Pages: {parsedContent.metadata?.total_pages}</p>
                  <p>Parsing Method: {parsedContent.metadata?.parsing_method}</p>
                  <p>Timestamp: {parsedContent.metadata?.timestamp && new Date(parsedContent.metadata.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {parsedContent.content.map((item, idx) => (
                  <div key={idx} className="p-3 border rounded bg-gray-50">
                    <div className="font-medium text-sm text-gray-500 mb-1">
                      {item.type} - Page {item.page}
                    </div>
                    {item.title && (
                      <div className="font-bold text-gray-700 mb-2">
                        {item.title}
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <RandomImage message="Upload and parse a file to see the results here" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ParseFile; 