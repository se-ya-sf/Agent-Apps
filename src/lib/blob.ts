'use client';

import type { PrivateRAGDocument } from '@/types';

// Blob Storage 設定インターフェース
interface BlobConfig {
  storageAccountUrl: string;  // https://<account>.blob.core.windows.net
  containerName: string;
  sasToken: string;           // ?sv=2022-11-02&ss=b&srt=co&sp=rwdlacx...
}

// アップロード進捗コールバック
type ProgressCallback = (progress: number) => void;

// ファイルサイズ上限 (250MB)
const MAX_FILE_SIZE = 250 * 1024 * 1024;

// 対応ファイル形式
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword',           // .doc
  'application/vnd.ms-excel',     // .xls
  'application/vnd.ms-powerpoint', // .ppt
  'text/plain',                   // .txt
  'text/markdown',                // .md
  'text/csv',                     // .csv
  'application/json',             // .json
];

// 対応拡張子
const SUPPORTED_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
  '.txt', '.md', '.csv', '.json'
];

/**
 * ファイルの検証
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // サイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます（上限: 250MB、実際: ${(file.size / 1024 / 1024).toFixed(2)}MB）`,
    };
  }

  // 拡張子チェック
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `対応していないファイル形式です: ${extension}（対応形式: ${SUPPORTED_EXTENSIONS.join(', ')}）`,
    };
  }

  // MIMEタイプチェック（ブラウザが正しく設定しない場合があるため、拡張子優先）
  // if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
  //   console.warn(`MIMEタイプが不明: ${file.type}、拡張子で判定します`);
  // }

  return { valid: true };
}

/**
 * ユニークなドキュメントIDを生成
 */
export function generateDocId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `doc_${timestamp}_${random}`;
}

/**
 * Blob URLを構築
 */
function buildBlobUrl(config: BlobConfig, blobName: string): string {
  const baseUrl = config.storageAccountUrl.replace(/\/$/, '');
  const sasToken = config.sasToken.startsWith('?') ? config.sasToken : `?${config.sasToken}`;
  return `${baseUrl}/${config.containerName}/${blobName}${sasToken}`;
}

/**
 * ファイルをAzure Blob Storageにアップロード
 */
export async function uploadToBlob(
  file: File,
  config: BlobConfig,
  userId: string,
  docId: string,
  onProgress?: ProgressCallback
): Promise<PrivateRAGDocument> {
  // バリデーション
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Blob名を構築（ユーザーIDでフォルダ分け）
  const blobName = `${userId}/${docId}_${file.name}`;
  const blobUrl = buildBlobUrl(config, blobName);

  // メタデータを設定
  const metadata = {
    'x-ms-meta-doc_id': docId,
    'x-ms-meta-user_id': userId,
    'x-ms-meta-original_filename': encodeURIComponent(file.name),
    'x-ms-meta-uploaded_at': new Date().toISOString(),
  };

  // XMLHttpRequestでアップロード（進捗取得のため）
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // 進捗イベント
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    // 完了イベント
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const document: PrivateRAGDocument = {
          id: docId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          blobUrl: blobUrl.split('?')[0], // SASトークンを除いたURL
          uploadedAt: new Date(),
          userId: userId,
          indexingStatus: 'pending',
          metadata: {
            doc_id: docId,
            user_id: userId,
          },
        };
        resolve(document);
      } else {
        reject(new Error(`アップロードエラー: ${xhr.status} ${xhr.statusText}`));
      }
    });

    // エラーイベント
    xhr.addEventListener('error', () => {
      reject(new Error('ネットワークエラーが発生しました'));
    });

    // リクエスト設定
    xhr.open('PUT', blobUrl, true);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    
    // メタデータヘッダー
    Object.entries(metadata).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    // 送信
    xhr.send(file);
  });
}

/**
 * Blobを削除
 */
export async function deleteFromBlob(
  config: BlobConfig,
  userId: string,
  docId: string,
  fileName: string
): Promise<void> {
  const blobName = `${userId}/${docId}_${fileName}`;
  const blobUrl = buildBlobUrl(config, blobName);

  const response = await fetch(blobUrl, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`削除エラー: ${response.status} ${response.statusText}`);
  }
}

/**
 * コンテナ内のBlobをリスト
 */
export async function listBlobs(
  config: BlobConfig,
  userId?: string
): Promise<Array<{ name: string; properties: Record<string, string> }>> {
  const baseUrl = config.storageAccountUrl.replace(/\/$/, '');
  const sasToken = config.sasToken.startsWith('?') ? config.sasToken : `?${config.sasToken}`;
  
  let listUrl = `${baseUrl}/${config.containerName}${sasToken}&restype=container&comp=list`;
  
  // ユーザーIDでプレフィックスフィルタ
  if (userId) {
    listUrl += `&prefix=${encodeURIComponent(userId + '/')}`;
  }

  const response = await fetch(listUrl);
  
  if (!response.ok) {
    throw new Error(`リスト取得エラー: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();
  
  // XMLをパース（簡易実装）
  const blobs: Array<{ name: string; properties: Record<string, string> }> = [];
  const blobMatches = xmlText.matchAll(/<Blob>[\s\S]*?<Name>([^<]+)<\/Name>[\s\S]*?<\/Blob>/g);
  
  for (const match of blobMatches) {
    const name = match[1];
    const properties: Record<string, string> = {};
    
    // メタデータを抽出
    const metadataMatch = match[0].match(/<Metadata>([\s\S]*?)<\/Metadata>/);
    if (metadataMatch) {
      const metaMatches = metadataMatch[1].matchAll(/<([^>]+)>([^<]*)<\/[^>]+>/g);
      for (const metaMatch of metaMatches) {
        properties[metaMatch[1]] = metaMatch[2];
      }
    }
    
    blobs.push({ name, properties });
  }

  return blobs;
}

/**
 * 対応ファイル形式を取得
 */
export function getSupportedFormats(): { extensions: string[]; mimeTypes: string[] } {
  return {
    extensions: SUPPORTED_EXTENSIONS,
    mimeTypes: SUPPORTED_MIME_TYPES,
  };
}

/**
 * ファイルサイズを人間が読める形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
