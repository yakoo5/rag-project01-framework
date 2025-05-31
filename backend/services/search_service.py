from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
from pymilvus import connections, Collection, utility
from services.embedding_service import EmbeddingService
from utils.config import VectorDBProvider, MILVUS_CONFIG, CHROMA_CONFIG
import os
import json
import chromadb
from chromadb.config import Settings

logger = logging.getLogger(__name__)

class SearchService:
    """
    搜索服务类，负责向量数据库的连接和向量搜索功能
    提供集合列表查询、向量相似度搜索和搜索结果保存等功能
    """
    def __init__(self):
        """
        初始化搜索服务
        创建嵌入服务实例，设置Milvus连接URI，初始化搜索结果保存目录
        """
        self.embedding_service = EmbeddingService()
        self.milvus_uri = MILVUS_CONFIG["uri"]
        self.chroma_persist_dir = CHROMA_CONFIG["persist_directory"]
        self.search_results_dir = "04-search-results"
        os.makedirs(self.search_results_dir, exist_ok=True)

    def get_providers(self) -> List[Dict[str, str]]:
        """
        获取支持的向量数据库列表
        
        Returns:
            List[Dict[str, str]]: 支持的向量数据库提供商列表
        """
        return [
            {"id": VectorDBProvider.MILVUS.value, "name": "Milvus"},
            {"id": VectorDBProvider.CHROMA.value, "name": "Chroma"}
        ]

    def list_collections(self, provider: str = VectorDBProvider.MILVUS.value) -> List[Dict[str, Any]]:
        """
        获取指定向量数据库中的所有集合
        
        Args:
            provider (str): 向量数据库提供商，默认为Milvus
            
        Returns:
            List[Dict[str, Any]]: 集合信息列表，包含id、名称和实体数量
            
        Raises:
            Exception: 连接或查询集合时发生错误
        """
        if provider == VectorDBProvider.MILVUS:
            try:
                connections.connect(
                    alias="default",
                    uri=self.milvus_uri
                )
                
                collections = []
                collection_names = utility.list_collections()
                
                for name in collection_names:
                    try:
                        collection = Collection(name)
                        collections.append({
                            "id": name,
                            "name": name,
                            "count": collection.num_entities
                        })
                    except Exception as e:
                        logger.error(f"Error getting info for collection {name}: {str(e)}")
                
                return collections
                
            except Exception as e:
                logger.error(f"Error listing collections: {str(e)}")
                raise
            finally:
                connections.disconnect("default")
        elif provider == VectorDBProvider.CHROMA:
            try:
                client = chromadb.PersistentClient(
                    path=self.chroma_persist_dir,
                    settings=Settings(
                        anonymized_telemetry=False
                    )
                )
                collections = client.list_collections()
                return [
                    {
                        "id": collection.name,
                        "name": collection.name,
                        "count": collection.count()
                    }
                    for collection in collections
                ]
            except Exception as e:
                logger.error(f"Error listing Chroma collections: {str(e)}")
                raise

    def save_search_results(self, query: str, collection_id: str, results: List[Dict[str, Any]]) -> str:
        """
        保存搜索结果到JSON文件
        
        Args:
            query (str): 搜索查询文本
            collection_id (str): 集合ID
            results (List[Dict[str, Any]]): 搜索结果列表
            
        Returns:
            str: 保存文件的路径
            
        Raises:
            Exception: 保存文件时发生错误
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            # 使用集合ID的基础名称（去掉路径相关字符）
            collection_base = os.path.basename(collection_id)
            filename = f"search_{collection_base}_{timestamp}.json"
            filepath = os.path.join(self.search_results_dir, filename)
            
            search_data = {
                "query": query,
                "collection_id": collection_id,
                "timestamp": datetime.now().isoformat(),
                "results": results
            }
            
            logger.info(f"Saving search results to: {filepath}")
            
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(search_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Successfully saved search results to: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving search results: {str(e)}")
            raise

    async def search(self, 
                    query: str, 
                    collection_id: str, 
                    provider: str = VectorDBProvider.MILVUS.value,
                    top_k: int = 3, 
                    threshold: float = 0.7,
                    word_count_threshold: int = 20,
                    save_results: bool = False) -> Dict[str, Any]:
        """
        执行向量搜索
        
        Args:
            query (str): 搜索查询文本
            collection_id (str): 要搜索的集合ID
            provider (str): 向量数据库提供商，默认为Milvus
            top_k (int): 返回的最大结果数量，默认为3
            threshold (float): 相似度阈值，低于此值的结果将被过滤，默认为0.7
            word_count_threshold (int): 文本字数阈值，低于此值的结果将被过滤，默认为20
            save_results (bool): 是否保存搜索结果，默认为False
            
        Returns:
            Dict[str, Any]: 包含搜索结果的字典，如果保存结果则包含保存路径
            
        Raises:
            Exception: 搜索过程中发生错误
        """
        try:
            # 添加参数日志
            logger.info(f"Search parameters:")
            logger.info(f"- Query: {query}")
            logger.info(f"- Collection ID: {collection_id}")
            logger.info(f"- Provider: {provider}")
            logger.info(f"- Top K: {top_k}")
            logger.info(f"- Threshold: {threshold}")
            logger.info(f"- Word Count Threshold: {word_count_threshold}")
            logger.info(f"- Save Results: {save_results}")

            if provider == VectorDBProvider.MILVUS:
                return await self._search_milvus(
                    query, collection_id, top_k, threshold, 
                    word_count_threshold, save_results
                )
            elif provider == VectorDBProvider.CHROMA:
                return await self._search_chroma(
                    query, collection_id, top_k, threshold, 
                    word_count_threshold, save_results
                )
            else:
                raise ValueError(f"Unsupported vector database provider: {provider}")
            
        except Exception as e:
            logger.error(f"Error performing search: {str(e)}")
            raise

    async def _search_milvus(self,
                           query: str,
                           collection_id: str,
                           top_k: int,
                           threshold: float,
                           word_count_threshold: int,
                           save_results: bool) -> Dict[str, Any]:
        """Milvus 搜索实现"""
        try:
            logger.info(f"Starting Milvus search - Collection: {collection_id}, Query: {query}")
            
            # 连接到 Milvus
            connections.connect(alias="default", uri=self.milvus_uri)
            
            # 获取collection
            collection = Collection(collection_id)
            collection.load()
            
            # 从collection中读取embedding配置
            sample_entity = collection.query(
                expr="id >= 0", 
                output_fields=["embedding_provider", "embedding_model"],
                limit=1
            )
            if not sample_entity:
                raise ValueError(f"Collection {collection_id} is empty")
            
            # 使用collection中存储的配置创建查询向量
            query_embedding = self.embedding_service.create_single_embedding(
                query,
                provider=sample_entity[0]["embedding_provider"],
                model=sample_entity[0]["embedding_model"]
            )
            
            # 执行搜索
            search_params = {
                "metric_type": "COSINE",
                "params": {"nprobe": 10}
            }
            
            results = collection.search(
                data=[query_embedding],
                anns_field="vector",
                param=search_params,
                limit=top_k,
                expr=f"word_count >= {word_count_threshold}",
                output_fields=[
                    "content",
                    "document_name",
                    "chunk_id",
                    "total_chunks",
                    "word_count",
                    "page_number",
                    "page_range",
                    "embedding_provider",
                    "embedding_model",
                    "embedding_timestamp"
                ]
            )
            
            # 处理结果
            processed_results = []
            for hits in results:
                for hit in hits:
                    if hit.score >= threshold:
                        processed_results.append({
                            "text": hit.entity.content,
                            "score": float(hit.score),
                            "metadata": {
                                "source": hit.entity.document_name,
                                "page": hit.entity.page_number,
                                "chunk": hit.entity.chunk_id,
                                "total_chunks": hit.entity.total_chunks,
                                "page_range": hit.entity.page_range,
                                "embedding_provider": hit.entity.embedding_provider,
                                "embedding_model": hit.entity.embedding_model,
                                "embedding_timestamp": hit.entity.embedding_timestamp
                            }
                        })

            response_data = {"results": processed_results}
            
            if save_results and processed_results:
                filepath = self.save_search_results(query, collection_id, processed_results)
                response_data["saved_filepath"] = filepath
            
            return response_data
            
        finally:
            connections.disconnect("default")

    async def _search_chroma(self,
                           query: str,
                           collection_id: str,
                           top_k: int,
                           threshold: float,
                           word_count_threshold: int,
                           save_results: bool) -> Dict[str, Any]:
        """Chroma 搜索实现"""
        try:
            logger.info(f"Starting Chroma search - Collection: {collection_id}, Query: {query}")
            
            # 创建Chroma客户端
            client = chromadb.PersistentClient(
                path=self.chroma_persist_dir,
                settings=Settings(
                    anonymized_telemetry=False
                )
            )
            
            # 获取collection
            collection = client.get_collection(collection_id)
            
            # 从collection元数据中获取embedding配置
            metadata = collection.metadata
            embedding_provider = metadata.get("embedding_provider", "unknown")
            embedding_model = metadata.get("embedding_model", "unknown")
            
            # 创建查询向量
            query_embedding = self.embedding_service.create_single_embedding(
                query,
                provider=embedding_provider,
                model=embedding_model
            )
            
            # 执行搜索
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where={"word_count": {"$gte": word_count_threshold}}
            )
            
            # 处理结果
            processed_results = []
            for i, (doc, metadata, distance) in enumerate(zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            )):
                # Chroma使用L2距离，需要转换为相似度分数
                similarity_score = 1 - (distance / 2)  # 将L2距离转换为相似度分数
                
                if similarity_score >= threshold:
                    processed_results.append({
                        "text": doc,
                        "score": float(similarity_score),
                        "metadata": {
                            "source": metadata.get("document_name", ""),
                            "page": metadata.get("page_number", ""),
                            "chunk": metadata.get("chunk_id", 0),
                            "total_chunks": metadata.get("total_chunks", 0),
                            "page_range": metadata.get("page_range", ""),
                            "embedding_provider": metadata.get("embedding_provider", ""),
                            "embedding_model": metadata.get("embedding_model", ""),
                            "embedding_timestamp": metadata.get("embedding_timestamp", "")
                        }
                    })

            response_data = {"results": processed_results}
            
            if save_results and processed_results:
                filepath = self.save_search_results(query, collection_id, processed_results)
                response_data["saved_filepath"] = filepath
            
            return response_data
            
        except Exception as e:
            logger.error(f"Error performing Chroma search: {str(e)}")
            raise 