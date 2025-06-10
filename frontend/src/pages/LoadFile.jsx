// src/pages/LoadFile.jsx
import { useState, useEffect, useMemo } from 'react';
import RandomImage from '../components/RandomImage';
import UnstructuredChunk, { DEFAULT_UNSTRUCTURED_OPTIONS } from '../components/UnstructuredChunk';
import TextChunk, { DEFAULT_TEXT_OPTIONS } from '../components/TextChunk';
import MarkdownChunk, { DEFAULT_MARKDOWN_OPTIONS } from '../components/MarkdownChunk';
import { apiBaseUrl } from '../config/config';

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

const LoadFile = () => {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [loadingMethod, setLoadingMethod] = useState('pymupdf');
  const [unstructuredOptions, setUnstructuredOptions] = useState(DEFAULT_UNSTRUCTURED_OPTIONS);
  const [textOptions, setTextOptions] = useState(DEFAULT_TEXT_OPTIONS);
  const [markdownOptions, setMarkdownOptions] = useState(DEFAULT_MARKDOWN_OPTIONS);
  const [loadedContent, setLoadedContent] = useState(null);
  const [status, setStatus] = useState('');
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' 或 'documents'
  const [selectedDoc, setSelectedDoc] = useState(null);

  // 定义每种文件类型支持的加载方法及其显示文本
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

  // 使用 useMemo 缓存可用的加载方法
  const availableLoadingMethods = useMemo(() => {
    return fileType ? loadingMethodsByType[fileType] || [] : [];
  }, [fileType]);

  // 当文件类型改变时，自动设置对应的加载方法
  useEffect(() => {
    if (fileType && availableLoadingMethods.length > 0) {
      setLoadingMethod(availableLoadingMethods[0].value);
    }
  }, [fileType, availableLoadingMethods]);

  // 处理文件选择
  const handleFileChange = (e) => {
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

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/documents?type=loaded`);
      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
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

  // 处理文件加载
  const handleProcess = async () => {
    if (!file || !loadingMethod) {
      setStatus('Please select all required options');
      return;
    }

    setStatus('Loading...');
    setLoadedContent(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('loading_method', loadingMethod);
      
      const currentOptions = getCurrentOptions();
      
      // 将所有非空选项添加到 formData
      Object.entries(currentOptions).forEach(([key, value]) => {
        const processedValue = processOptionValue(loadingMethod, key, value);
        // 只有当处理后的值不为 null 时才添加到 formData
        if (processedValue != null) {
          formData.append(key, processedValue);
        }
      });

      const response = await fetch(`${apiBaseUrl}/load`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLoadedContent(data.loaded_content);
      setStatus('File loaded successfully!');
      fetchDocuments();
      setActiveTab('preview');

    } catch (error) {
      console.error('Error:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleDeleteDocument = async (docName) => {
    try {
      const response = await fetch(`${apiBaseUrl}/documents/${docName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setStatus('Document deleted successfully');
      fetchDocuments();
      if (selectedDoc?.name === docName) {
        setSelectedDoc(null);
        setLoadedContent(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setStatus(`Error deleting document: ${error.message}`);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      setStatus('Loading document...');
      const response = await fetch(`${apiBaseUrl}/documents/${doc.name}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSelectedDoc(doc);
      setLoadedContent(data);
      setActiveTab('preview');
      setStatus('');
    } catch (error) {
      console.error('Error loading document:', error);
      setStatus(`Error loading document: ${error.message}`);
    }
  };

  const renderRightPanel = () => {
    return (
      <div className="p-4">
        {/* 标签页切换 */}
        <div className="flex mb-4 border-b">
          <button
            className={`px-4 py-2 ${
              activeTab === 'preview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('preview')}
          >
            Document Preview
          </button>
          <button
            className={`px-4 py-2 ml-4 ${
              activeTab === 'documents'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('documents')}
          >
            Document Management
          </button>
        </div>

        {/* 内容区域 */}
        {activeTab === 'preview' ? (
          loadedContent ? (
            <div>
              <h3 className="text-xl font-semibold mb-4">Document Content</h3>
              <div className="mb-4 p-3 border rounded bg-gray-100">
                <h4 className="font-medium mb-2">Document Information</h4>
                <div className="text-sm text-gray-600">
                  <p>Pages: {loadedContent.total_pages || 'N/A'}</p>
                  <p>Chunks: {loadedContent.total_chunks || 'N/A'}</p>
                  <p>Loading Method: {loadedContent.loading_method || 'N/A'}</p>
                  <p>Chunking Method: {loadedContent.chunking_method || 'N/A'}</p>
                  <p>Processing Date: {loadedContent.timestamp ? 
                    new Date(loadedContent.timestamp).toLocaleString() : 'N/A'}</p>
                  {loadedContent.options && (
                    <div className="mt-2">
                      <p className="font-medium">Options:</p>
                      <div className="pl-2">
                        {Object.entries(loadedContent.options).map(([key, value]) => (
                          <p key={key}>
                            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loadedContent.chunks.map((chunk) => (
                  <div key={chunk.metadata.chunk_id} className="p-3 border rounded bg-gray-50">
                    <div className="font-medium text-sm text-gray-500 mb-1">
                      Chunk {chunk.metadata.chunk_id} (Page {chunk.metadata.page_number})
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      Words: {chunk.metadata.word_count} | Page Range: {chunk.metadata.page_range}
                    </div>
                    <div className="text-sm mt-2">
                      <div className="text-gray-600">{chunk.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <RandomImage message="Upload and load a file or select an existing document to see the results here" />
          )
        ) : (
          // 文档管理页面
          <div>
            <h3 className="text-xl font-semibold mb-4">Document Management</h3>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.name} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-lg">{doc.name}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Pages: {doc.metadata?.total_pages || 'N/A'}</p>
                        <p>Chunks: {doc.metadata?.total_chunks || 'N/A'}</p>
                        <p>Loading Method: {doc.metadata?.loading_method || 'N/A'}</p>
                        <p>Chunking Method: {doc.metadata?.chunking_method || 'N/A'}</p>
                        <p>Created: {doc.metadata?.timestamp ? 
                          new Date(doc.metadata.timestamp).toLocaleString() : 'N/A'}</p>
                        {doc.metadata?.options && (
                          <div className="mt-2">
                            <p className="font-medium">Options:</p>
                            <div className="pl-2">
                              {Object.entries(doc.metadata.options).map(([key, value]) => (
                                <p key={key}>
                                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.name)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No documents available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染加载方法选项
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

  // 渲染分块组件
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
      <h2 className="text-2xl font-bold mb-6">Load File</h2>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel */}
        <div className="col-span-3 space-y-4">
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Upload File</label>
              <input
                type="file"
                accept=".pdf,.txt,.json,.doc,.docx,.ppt,.pptx,.md"
                onChange={handleFileChange}
                className="block w-full border rounded px-3 py-2"
              />
              <p className="mt-1 text-sm text-gray-500">
                Supported file types: PDF, TXT, JSON, Word (DOC/DOCX), PowerPoint (PPT/PPTX), Markdown (MD)
              </p>
            </div>

            {renderLoadingMethodSelect()}
            {renderChunkComponent()}

            <button 
              onClick={handleProcess}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!file}
            >
              Load File
            </button>
          </div>

          {status && (
            <div className={`p-4 rounded-lg ${
              status.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {status}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="col-span-9 border rounded-lg bg-white shadow-sm">
          {renderRightPanel()}
        </div>
      </div>
    </div>
  );
};

export default LoadFile;