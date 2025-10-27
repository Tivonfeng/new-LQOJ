import React, { useState, useRef } from 'react';
import './CertificateUploader.css';

interface CertificateUploaderProps {
  onUploadSuccess?: (result: {
    url: string;
    key: string;
    size: number;
  }) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // 字节
  disabled?: boolean;
}

const CertificateUploader: React.FC<CertificateUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  accept = 'image/*,.pdf',
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // 检查文件大小
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件大小超过${maxSize / 1024 / 1024}MB限制`,
      };
    }

    // 检查文件类型
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.type)) {
      return { valid: false, error: '不支持的文件类型' };
    }

    return { valid: true };
  };

  const handleFileSelect = (file: File) => {
    // 验证文件
    const validation = validateFile(file);
    if (!validation.valid) {
      onUploadError?.(validation.error || '文件验证失败');
      return;
    }

    // 生成预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        setPreviewType('image');
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setPreview('📄 PDF');
      setPreviewType('pdf');
    }

    // 上传文件
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('image', file);

    try {
      // 使用 XMLHttpRequest 以监听进度
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.url) {
              onUploadSuccess?.({
                url: response.url,
                key: response.key,
                size: response.size,
              });
              setIsUploading(false);
              setUploadProgress(100);

              // 3秒后重置
              setTimeout(() => {
                setUploadProgress(0);
                setPreview(null);
                setPreviewType(null);
              }, 3000);
            } else {
              throw new Error(response.error || '上传失败');
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '上传失败';
            onUploadError?.(errorMsg);
            setIsUploading(false);
            setPreview(null);
            setPreviewType(null);
          }
        } else {
          onUploadError?.(`HTTP ${xhr.status}: 上传失败`);
          setIsUploading(false);
          setPreview(null);
          setPreviewType(null);
        }
      });

      xhr.addEventListener('error', () => {
        onUploadError?.('网络错误');
        setIsUploading(false);
        setPreview(null);
        setPreviewType(null);
      });

      xhr.open('POST', '/exam/admin/upload-certificate');
      xhr.send(formData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '上传异常';
      onUploadError?.(errorMsg);
      setIsUploading(false);
      setPreview(null);
      setPreviewType(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || isUploading) return;
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || isUploading) return;
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="certificate-uploader">
      <div
        className={`upload-area ${isUploading ? 'uploading' : ''} ${
          disabled ? 'disabled' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          disabled={disabled || isUploading}
          style={{ display: 'none' }}
        />

        {preview && previewType === 'image' ? (
          <div className="preview">
            <img
              src={preview}
              alt="证书预览"
              className="preview-image"
            />
          </div>
        ) : previewType === 'pdf' ? (
          <div className="preview">
            <div className="pdf-preview">{preview}</div>
          </div>
        ) : (
          <div className="upload-icon">📤</div>
        )}

        {isUploading ? (
          <div className="uploading-state">
            <p className="uploading-text">上传中...</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="progress-text">{Math.round(uploadProgress)}%</p>
          </div>
        ) : (
          <div className="upload-text">
            <p className="drag-text">
              {disabled ? '上传已禁用' : '拖拽文件到此或点击选择'}
            </p>
            <p className="size-text">支持 JPG/PNG/PDF，最大 10MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateUploader;
