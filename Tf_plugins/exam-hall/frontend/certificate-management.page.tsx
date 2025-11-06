import { UserSelectAutoComplete } from '@hydrooj/ui-default';
import $ from 'jquery';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CertificateInfo, CertificatePreset } from './types';

/** 表单数据类型 - 用于编辑/新增表单 */
interface CertificateFormData {
  username: string;
  uid: number | '';
  presetId: string;
  certificateName: string;
  certifyingBody: string;
  category: string;
  level: string;
  score: number | '';
  issueDate: string;
  expiryDate: string;
  certificateImageUrl: string;
  certificateImageKey: string;
  notes: string;
}

const CertificateUploader: React.FC<{
  onUploadSuccess?: (result: { url: string, key: string, size: number }) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
}> = ({ onUploadSuccess, onUploadError, disabled = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('image', file);

    try {
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

  const validateFile = (file: File): { valid: boolean, error?: string } => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件大小超过${maxSize / 1024 / 1024}MB限制`,
      };
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.type)) {
      return { valid: false, error: '不支持的文件类型' };
    }

    return { valid: true };
  };

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      onUploadError?.(validation.error || '文件验证失败');
      return;
    }

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

    uploadFile(file);
  };

  return (
    <div className="certificate-uploader">
      <div
        className={`upload-area ${isUploading ? 'uploading' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={(e) => {
          if (disabled || isUploading) return;
          e.preventDefault();
          e.currentTarget.classList.add('drag-over');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('drag-over');
        }}
        onDrop={(e) => {
          if (disabled || isUploading) return;
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');

          const files = e.dataTransfer.files;
          if (files.length > 0) {
            handleFileSelect(files[0]);
          }
        }}
        onClick={() => {
          if (!disabled && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
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
            <img src={preview} alt="证书预览" className="preview-image" />
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
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="progress-text">{Math.round(uploadProgress)}%</p>
          </div>
        ) : (
          <div className="upload-text">
            <p className="drag-text">{disabled ? '上传已禁用' : '拖拽文件到此或点击选择'}</p>
            <p className="size-text">支持 JPG/PNG/PDF，最大 10MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

/** 预设表单数据类型 */
interface PresetFormData {
  type: 'competition' | 'certification';
  name: string;
  certificateName: string;
  certifyingBody: string;
  category: string;
  competitionName: string;
  certificationSeries: string;
  weight: number | '';
  description: string;
}

const CertificateManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'list' | 'presets'>('add');
  const [formData, setFormData] = useState<CertificateFormData>({
    username: '',
    uid: '',
    presetId: '',
    certificateName: '',
    certifyingBody: '',
    category: '',
    level: '',
    score: '',
    issueDate: '',
    expiryDate: '',
    certificateImageUrl: '',
    certificateImageKey: '',
    notes: '',
  });

  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [presets, setPresets] = useState<CertificatePreset[]>([]);
  const [allPresets, setAllPresets] = useState<CertificatePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [searchUid, setSearchUid] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presetType, setPresetType] = useState<'all' | 'competition' | 'certification'>('all');
  const [presetFormData, setPresetFormData] = useState<PresetFormData>({
    type: 'competition',
    name: '',
    certificateName: '',
    certifyingBody: '',
    category: '',
    competitionName: '',
    certificationSeries: '',
    weight: 1,
    description: '',
  });
  const [presetActiveTab, setPresetActiveTab] = useState<'add' | 'list'>('add');
  const [isPresetSubmitting, setIsPresetSubmitting] = useState(false);

  // 用户选择组件的引用
  const userInputRef = useRef<HTMLInputElement>(null);
  const userSelectComponentRef = useRef<any>(null);

  // 初始化UserSelectAutoComplete组件
  useEffect(() => {
    if (userInputRef.current) {
      try {
        const $input = $(userInputRef.current);
        userSelectComponentRef.current = (UserSelectAutoComplete as any).getOrConstruct($input, {
          multi: false,
          freeSolo: true,
          freeSoloConverter: (input: string) => input,
          onChange: (value: any) => {
            if (value && typeof value === 'object' && value.uname) {
              setFormData((prev) => ({
                ...prev,
                username: value.uname,
              }));
            } else if (typeof value === 'string') {
              setFormData((prev) => ({
                ...prev,
                username: value,
              }));
            } else if (value === null || value === undefined) {
              setFormData((prev) => ({
                ...prev,
                username: '',
              }));
            }
          },
        });
      } catch (error) {
        console.error('Failed to initialize UserSelectAutoComplete:', error);
      }
    }

    // 清理函数
    return () => {
      if (userSelectComponentRef.current) {
        try {
          userSelectComponentRef.current.detach();
        } catch (error) {
          console.warn('Failed to detach UserSelectAutoComplete:', error);
        }
      }
    };
  }, []);

  const fetchCertificates = async (uid?: string) => {
    setLoading(true);
    try {
      const url = uid ? `/exam/admin/certificates-list?uid=${uid}` : '/exam/admin/certificates-list';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setCertificates(data.data || []);
      } else {
        setMessage({ type: 'error', text: data.error || '获取证书列表失败' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '网络错误',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPresets = async (type?: string) => {
    try {
      const url = type && type !== 'all' ? `/exam/admin/presets?type=${type}` : '/exam/admin/presets';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setPresets(data.data || []);
      } else {
        setMessage({ type: 'error', text: data.error || '获取预设列表失败' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '网络错误',
      });
    }
  };

  const fetchAllPresets = async (type?: string) => {
    try {
      const url = type && type !== 'all' ? `/exam/admin/presets?type=${type}` : '/exam/admin/presets';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAllPresets(data.data || []);
      } else {
        setMessage({ type: 'error', text: data.error || '获取预设列表失败' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '网络错误',
      });
    }
  };

  const validatePresetForm = (): boolean => {
    if (!presetFormData.type) {
      setMessage({ type: 'error', text: '请选择预设类型' });
      return false;
    }
    if (!presetFormData.name.trim()) {
      setMessage({ type: 'error', text: '请输入预设名称' });
      return false;
    }
    if (!presetFormData.certificateName.trim()) {
      setMessage({ type: 'error', text: '请输入证书名称' });
      return false;
    }
    if (!presetFormData.certifyingBody.trim()) {
      setMessage({ type: 'error', text: '请输入认证机构' });
      return false;
    }
    if (!presetFormData.category.trim()) {
      setMessage({ type: 'error', text: '请输入证书分类' });
      return false;
    }
    if (presetFormData.type === 'competition' && !presetFormData.competitionName.trim()) {
      setMessage({ type: 'error', text: '竞赛预设需要输入竞赛名称' });
      return false;
    }
    if (presetFormData.type === 'certification' && !presetFormData.certificationSeries.trim()) {
      setMessage({ type: 'error', text: '考级预设需要输入考级系列' });
      return false;
    }

    return true;
  };

  const handlePresetInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setPresetFormData((prev) => ({
      ...prev,
      [name]: name === 'weight' ? (value ? Number(value) : '') : value,
    }));
  };

  const handlePresetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePresetForm()) {
      return;
    }

    setIsPresetSubmitting(true);
    try {
      const endpoint = editingPresetId ? `/exam/admin/presets/${editingPresetId}` : '/exam/admin/presets';
      const method = editingPresetId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: presetFormData.type,
          name: presetFormData.name,
          certificateName: presetFormData.certificateName,
          certifyingBody: presetFormData.certifyingBody,
          category: presetFormData.category,
          competitionName: presetFormData.type === 'competition' ? presetFormData.competitionName : undefined,
          certificationSeries: presetFormData.type === 'certification' ? presetFormData.certificationSeries : undefined,
          weight: presetFormData.weight ? Number(presetFormData.weight) : 1,
          description: presetFormData.description || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: editingPresetId ? '预设更新成功' : '预设创建成功',
        });
        setPresetFormData({
          type: 'competition',
          name: '',
          certificateName: '',
          certifyingBody: '',
          category: '',
          competitionName: '',
          certificationSeries: '',
          weight: 1,
          description: '',
        });
        setEditingPresetId(null);
        await fetchAllPresets(presetType !== 'all' ? presetType : undefined);
        setTimeout(() => {
          setPresetActiveTab('list');
        }, 1000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || '操作失败',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '网络错误',
      });
    } finally {
      setIsPresetSubmitting(false);
    }
  };

  const handlePresetDelete = async (id: string) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('确定要删除这个预设吗？')) {
      return;
    }

    try {
      const response = await fetch(`/exam/admin/presets/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: '预设删除成功',
        });
        await fetchAllPresets(presetType !== 'all' ? presetType : undefined);
      } else {
        setMessage({
          type: 'error',
          text: data.error || '删除失败',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '网络错误',
      });
    }
  };

  const handlePresetEdit = (preset: CertificatePreset) => {
    setPresetFormData({
      type: preset.type,
      name: preset.name,
      certificateName: preset.certificateName,
      certifyingBody: preset.certifyingBody,
      category: preset.category,
      competitionName: preset.competitionName || '',
      certificationSeries: preset.certificationSeries || '',
      weight: preset.weight || 1,
      description: preset.description || '',
    });
    setEditingPresetId(preset._id || null);
    setPresetActiveTab('add');
  };

  const handlePresetToggle = async (id: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/exam/admin/presets/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: !currentEnabled ? '预设已启用' : '预设已禁用',
        });
        await fetchAllPresets(presetType !== 'all' ? presetType : undefined);
      } else {
        setMessage({
          type: 'error',
          text: data.error || '操作失败',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '网络错误',
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchCertificates();
    } else if (activeTab === 'add') {
      fetchPresets();
    } else if (activeTab === 'presets') {
      fetchAllPresets(presetType !== 'all' ? presetType : undefined);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'presets') {
      fetchAllPresets(presetType !== 'all' ? presetType : undefined);
    }
  }, [presetType]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'score' ? (value ? Number(value) : '') : value,
    }));
  };

  const handlePresetSelect = (preset: CertificatePreset) => {
    setFormData((prev) => ({
      ...prev,
      presetId: preset._id || '',
      certificateName: preset.certificateName,
      certifyingBody: preset.certifyingBody,
      category: preset.category,
    }));
    setMessage({
      type: 'info',
      text: `已应用预设：${preset.name}`,
    });
  };

  const handleUploadSuccess = (result: {
    url: string;
    key: string;
    size: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      certificateImageUrl: result.url,
      certificateImageKey: result.key,
    }));
    setMessage({
      type: 'success',
      text: '证书图片上传成功',
    });
  };

  const handleUploadError = (error: string) => {
    setMessage({
      type: 'error',
      text: `上传失败: ${error}`,
    });
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setMessage({ type: 'error', text: '请选择用户' });
      return false;
    }
    if (!formData.certificateName.trim()) {
      setMessage({ type: 'error', text: '请输入证书名称' });
      return false;
    }
    if (!formData.certifyingBody.trim()) {
      setMessage({ type: 'error', text: '请输入认证机构' });
      return false;
    }
    if (!formData.category.trim()) {
      setMessage({ type: 'error', text: '请输入证书分类' });
      return false;
    }
    if (!formData.issueDate) {
      setMessage({ type: 'error', text: '请选择颁发日期' });
      return false;
    }

    const issueDate = new Date(formData.issueDate);
    if (issueDate > new Date()) {
      setMessage({ type: 'error', text: '颁发日期不能是未来日期' });
      return false;
    }

    if (formData.expiryDate) {
      const expiryDate = new Date(formData.expiryDate);
      if (expiryDate <= issueDate) {
        setMessage({ type: 'error', text: '过期日期必须晚于颁发日期' });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = editingId ? `/exam/admin/certificates/${editingId}` : '/exam/admin/certificates';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          presetId: formData.presetId || undefined,
          certificateName: formData.certificateName,
          certifyingBody: formData.certifyingBody,
          category: formData.category,
          level: formData.level || undefined,
          score: formData.score ? Number(formData.score) : undefined,
          issueDate: formData.issueDate,
          expiryDate: formData.expiryDate || undefined,
          certificateImageUrl: formData.certificateImageUrl || undefined,
          certificateImageKey: formData.certificateImageKey || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: editingId ? '证书更新成功' : '证书创建成功',
        });
        setFormData({
          username: '',
          uid: '',
          presetId: '',
          certificateName: '',
          certifyingBody: '',
          category: '',
          level: '',
          score: '',
          issueDate: '',
          expiryDate: '',
          certificateImageUrl: '',
          certificateImageKey: '',
          notes: '',
        });
        // 清理UserSelectAutoComplete
        if (userSelectComponentRef.current) {
          try {
            userSelectComponentRef.current.clear();
          } catch (error) {
            console.warn('Failed to clear UserSelectAutoComplete:', error);
          }
        }
        setEditingId(null);
        await fetchCertificates();
        setTimeout(() => {
          setActiveTab('list');
        }, 1000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || '操作失败',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '网络错误',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('确定要删除这个证书吗？')) {
      return;
    }

    try {
      const response = await fetch(`/exam/admin/certificates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: '证书删除成功',
        });
        await fetchCertificates();
      } else {
        setMessage({
          type: 'error',
          text: data.error || '删除失败',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '网络错误',
      });
    }
  };

  const handleEdit = (cert: CertificateInfo) => {
    // 将日期转换为字符串格式
    const formatDate = (date: string | Date | undefined): string => {
      if (!date) return '';
      if (typeof date === 'string') return date;
      return date instanceof Date ? date.toISOString().split('T')[0] : '';
    };

    setFormData({
      username: cert.username || '',
      uid: cert.uid,
      presetId: '',
      certificateName: cert.certificateName,
      certifyingBody: cert.certifyingBody,
      category: cert.category,
      level: cert.level || '',
      score: cert.score || '',
      issueDate: formatDate(cert.issueDate),
      expiryDate: formatDate(cert.expiryDate),
      certificateImageUrl: cert.certificateImageUrl || '',
      certificateImageKey: cert.certificateImageKey || '',
      notes: cert.notes || '',
    });

    // 同步UserSelectAutoComplete
    if (userSelectComponentRef.current && cert.username) {
      try {
        const userObj = { uname: cert.username, displayName: cert.username };
        if (typeof userSelectComponentRef.current.value === 'function') {
          userSelectComponentRef.current.value(userObj);
        }
      } catch (error) {
        console.warn('设置用户选择组件失败:', error);
      }
    }

    setEditingId(cert._id || null);
    setActiveTab('add');
  };

  const handleSearch = async () => {
    if (searchUid.trim()) {
      await fetchCertificates(searchUid);
    } else {
      await fetchCertificates();
    }
  };

  return (
    <div className="certificate-management">
      <div className="management-header">
        <h1>📜 证书管理</h1>
        <p>创建、编辑和管理用户证书</p>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          <div className="message-content">
            {message.type === 'success' && '✅'}
            {message.type === 'error' && '❌'}
            {message.type === 'info' && 'ℹ️'} {message.text}
          </div>
          <button className="message-close" onClick={() => setMessage(null)}>
            ✕
          </button>
        </div>
      )}

      <div className="management-tabs">
        <button
          className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('add');
            setEditingId(null);
            setFormData({
              username: '',
              uid: '',
              presetId: '',
              certificateName: '',
              certifyingBody: '',
              category: '',
              level: '',
              score: '',
              issueDate: '',
              expiryDate: '',
              certificateImageUrl: '',
              certificateImageKey: '',
              notes: '',
            });
            // 清理UserSelectAutoComplete
            if (userSelectComponentRef.current) {
              try {
                userSelectComponentRef.current.clear();
              } catch (error) {
                console.warn('Failed to clear UserSelectAutoComplete:', error);
              }
            }
          }}
        >
          {editingId ? '✏️ 编辑证书' : '➕ 新增证书'}
        </button>
        <button
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 证书列表
        </button>
        <button
          className={`tab-button ${activeTab === 'presets' ? 'active' : ''}`}
          onClick={() => setActiveTab('presets')}
        >
          ⚙️ 预设管理
        </button>
      </div>

      {activeTab === 'add' && (
        <div className="form-section">
          {/* 预设选择区域 */}
          {presets.length > 0 && (
            <div className="presets-quick-select">
              <div className="presets-header">
                <h3>💡 快速应用预设</h3>
                <p>选择一个预设快速填充证书信息</p>
              </div>
              <div className="presets-grid">
                {presets.map((preset) => (
                  <button
                    key={preset._id}
                    type="button"
                    className={`preset-item ${formData.presetId === preset._id ? 'active' : ''}`}
                    onClick={() => handlePresetSelect(preset)}
                    aria-label={preset.description || preset.name}
                  >
                    <div className="preset-type">
                      {preset.type === 'competition' ? '🏆' : '📚'}
                    </div>
                    <div className="preset-name">{preset.name}</div>
                    <div className="preset-cert">{preset.certificateName}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="certificate-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="username">选择用户 *</label>
                <input
                  ref={userInputRef}
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }));
                  }}
                  placeholder="搜索并选择用户..."
                  required
                  disabled={isSubmitting}
                />
                <div className="form-hint">输入用户名进行搜索</div>
              </div>

              <div className="form-group">
                <label htmlFor="certificateName">证书名称 *</label>
                <input
                  type="text"
                  id="certificateName"
                  name="certificateName"
                  value={formData.certificateName}
                  onChange={handleInputChange}
                  placeholder="例如：Python编程证书"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="certifyingBody">认证机构 *</label>
                <input
                  type="text"
                  id="certifyingBody"
                  name="certifyingBody"
                  value={formData.certifyingBody}
                  onChange={handleInputChange}
                  placeholder="例如：中国计算机学会"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">证书分类 *</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="例如：编程、数据科学"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="level">证书等级</label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="">选择等级（可选）</option>
                  <option value="初级">初级</option>
                  <option value="中级">中级</option>
                  <option value="高级">高级</option>
                  <option value="专家">专家</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="score">分数</label>
                <input
                  type="number"
                  id="score"
                  name="score"
                  value={formData.score}
                  onChange={handleInputChange}
                  placeholder="例如：95"
                  min="0"
                  max="100"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="issueDate">颁发日期 *</label>
                <input
                  type="date"
                  id="issueDate"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="expiryDate">过期日期</label>
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-section-title">证书图片上传</div>
            <CertificateUploader
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              disabled={isSubmitting}
            />

            {formData.certificateImageUrl && (
              <div className="image-preview">
                <p>✅ 已上传图片：</p>
                <img src={formData.certificateImageUrl} alt="证书预览" />
              </div>
            )}

            <div className="form-group full-width">
              <label htmlFor="notes">备注</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="输入备注信息（可选）"
                rows={4}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : editingId ? '更新证书' : '创建证书'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      username: '',
                      uid: '',
                      presetId: '',
                      certificateName: '',
                      certifyingBody: '',
                      category: '',
                      level: '',
                      score: '',
                      issueDate: '',
                      expiryDate: '',
                      certificateImageUrl: '',
                      certificateImageKey: '',
                      notes: '',
                    });
                    // 清理UserSelectAutoComplete
                    if (userSelectComponentRef.current) {
                      try {
                        userSelectComponentRef.current.clear();
                      } catch (error) {
                        console.warn('Failed to clear UserSelectAutoComplete:', error);
                      }
                    }
                  }}
                  disabled={isSubmitting}
                >
                  取消编辑
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="list-section">
          <div className="list-header">
            <div className="search-bar">
              <input
                type="text"
                placeholder="按用户 ID 搜索..."
                value={searchUid}
                onChange={(e) => setSearchUid(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <button onClick={handleSearch} disabled={loading}>
                🔍 搜索
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : certificates.length === 0 ? (
            <div className="empty-state">
              <p>📭 暂无证书数据</p>
            </div>
          ) : (
            <div className="certificates-table">
              <div className="table-header">
                <div className="col-uid">用户ID</div>
                <div className="col-name">证书名称</div>
                <div className="col-category">分类</div>
                <div className="col-date">颁发日期</div>
                <div className="col-status">状态</div>
                <div className="col-actions">操作</div>
              </div>

              {certificates.map((cert) => (
                <div key={cert._id} className="table-row">
                  <div className="col-uid">{cert.uid}</div>
                  <div className="col-name">
                    <div className="name-text">{cert.certificateName}</div>
                    <div className="body-text">{cert.certifyingBody}</div>
                  </div>
                  <div className="col-category">
                    <span className="category-badge">{cert.category}</span>
                  </div>
                  <div className="col-date">
                    {new Date(cert.issueDate).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="col-status">
                    <span
                      className={`status-badge status-${
                        cert.status || 'active'
                      }`}
                    >
                      {cert.status === 'expired'
                        ? '已过期'
                        : cert.status === 'revoked'
                          ? '已撤销'
                          : '有效'}
                    </span>
                  </div>
                  <div className="col-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => handleEdit(cert)}
                      aria-label="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(cert._id || '')}
                      aria-label="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'presets' && (
        <div>
          <div className="management-tabs">
            <button
              className={`tab-button ${presetActiveTab === 'add' ? 'active' : ''}`}
              onClick={() => {
                setPresetActiveTab('add');
                setEditingPresetId(null);
                setPresetFormData({
                  type: 'competition',
                  name: '',
                  certificateName: '',
                  certifyingBody: '',
                  category: '',
                  competitionName: '',
                  certificationSeries: '',
                  weight: 1,
                  description: '',
                });
              }}
            >
              {editingPresetId ? '✏️ 编辑预设' : '➕ 新增预设'}
            </button>
            <button
              className={`tab-button ${presetActiveTab === 'list' ? 'active' : ''}`}
              onClick={() => setPresetActiveTab('list')}
            >
              📋 预设列表
            </button>
          </div>

          {presetActiveTab === 'add' && (
            <div className="form-section">
              <form onSubmit={handlePresetSubmit} className="preset-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="preset-type">预设类型 *</label>
                    <select
                      id="preset-type"
                      name="type"
                      value={presetFormData.type}
                      onChange={handlePresetInputChange}
                      disabled={isPresetSubmitting || editingPresetId !== null}
                    >
                      <option value="competition">竞赛</option>
                      <option value="certification">考级</option>
                    </select>
                    <div className="form-hint">
                      {presetFormData.type === 'competition' ? '用于管理各类竞赛预设' : '用于管理各类考级预设'}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="preset-name">预设名称 *</label>
                    <input
                      type="text"
                      id="preset-name"
                      name="name"
                      value={presetFormData.name}
                      onChange={handlePresetInputChange}
                      placeholder={presetFormData.type === 'competition' ? '例如：全国信息学竞赛' : '例如：Python等级考试'}
                      required
                      disabled={isPresetSubmitting}
                    />
                    <div className="form-hint">比赛或考级的名称</div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="preset-certificateName">证书名称 *</label>
                    <input
                      type="text"
                      id="preset-certificateName"
                      name="certificateName"
                      value={presetFormData.certificateName}
                      onChange={handlePresetInputChange}
                      placeholder="例如：全国信息学竞赛获奖证书"
                      required
                      disabled={isPresetSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="preset-certifyingBody">认证机构 *</label>
                    <input
                      type="text"
                      id="preset-certifyingBody"
                      name="certifyingBody"
                      value={presetFormData.certifyingBody}
                      onChange={handlePresetInputChange}
                      placeholder="例如：全国青少年信息学奥林匹克竞赛委员会"
                      required
                      disabled={isPresetSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="preset-category">证书分类 *</label>
                    <input
                      type="text"
                      id="preset-category"
                      name="category"
                      value={presetFormData.category}
                      onChange={handlePresetInputChange}
                      placeholder="例如：编程、数据科学"
                      required
                      disabled={isPresetSubmitting}
                    />
                  </div>

                  {presetFormData.type === 'competition' && (
                    <div className="form-group">
                      <label htmlFor="preset-competitionName">竞赛名称 *</label>
                      <input
                        type="text"
                        id="preset-competitionName"
                        name="competitionName"
                        value={presetFormData.competitionName}
                        onChange={handlePresetInputChange}
                        placeholder="例如：信息学竞赛"
                        required={presetFormData.type === 'competition'}
                        disabled={isPresetSubmitting}
                      />
                      <div className="form-hint">用于统计竞赛类证书</div>
                    </div>
                  )}

                  {presetFormData.type === 'certification' && (
                    <div className="form-group">
                      <label htmlFor="preset-certificationSeries">考级系列 *</label>
                      <input
                        type="text"
                        id="preset-certificationSeries"
                        name="certificationSeries"
                        value={presetFormData.certificationSeries}
                        onChange={handlePresetInputChange}
                        placeholder="例如：Python、C++、Java"
                        required={presetFormData.type === 'certification'}
                        disabled={isPresetSubmitting}
                      />
                      <div className="form-hint">用于统计考级类证书，如 Python、C++、Scratch 等</div>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="preset-weight">权重值</label>
                    <input
                      type="number"
                      id="preset-weight"
                      name="weight"
                      value={presetFormData.weight}
                      onChange={handlePresetInputChange}
                      placeholder="默认为 1"
                      min="1"
                      max="100"
                      disabled={isPresetSubmitting}
                    />
                    <div className="form-hint">用于排行榜计算，值越大权重越高</div>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="preset-description">描述</label>
                  <textarea
                    id="preset-description"
                    name="description"
                    value={presetFormData.description}
                    onChange={handlePresetInputChange}
                    placeholder="输入预设的描述信息（可选）"
                    rows={3}
                    disabled={isPresetSubmitting}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={isPresetSubmitting}>
                    {isPresetSubmitting ? '提交中...' : editingPresetId ? '更新预设' : '创建预设'}
                  </button>
                  {editingPresetId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingPresetId(null);
                        setPresetFormData({
                          type: 'competition',
                          name: '',
                          certificateName: '',
                          certifyingBody: '',
                          category: '',
                          competitionName: '',
                          certificationSeries: '',
                          weight: 1,
                          description: '',
                        });
                      }}
                      disabled={isPresetSubmitting}
                    >
                      取消编辑
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {presetActiveTab === 'list' && (
            <div className="list-section">
              <div className="list-header">
                <div className="filter-bar">
                  <label htmlFor="preset-filter-type">筛选类型：</label>
                  <select
                    id="preset-filter-type"
                    value={presetType}
                    onChange={(e) => setPresetType(e.target.value as any)}
                  >
                    <option value="all">全部</option>
                    <option value="competition">竞赛</option>
                    <option value="certification">考级</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="loading">加载中...</div>
              ) : allPresets.length === 0 ? (
                <div className="empty-state">
                  <p>📭 暂无预设数据</p>
                </div>
              ) : (
                <div className="presets-table">
                  <div className="table-header">
                    <div className="col-type">类型</div>
                    <div className="col-name">预设名称</div>
                    <div className="col-cert-name">证书名称</div>
                    <div className="col-category">分类</div>
                    <div className="col-weight">权重</div>
                    <div className="col-status">状态</div>
                    <div className="col-actions">操作</div>
                  </div>

                  {allPresets.map((preset) => (
                    <div key={preset._id} className="table-row">
                      <div className="col-type">
                        <span
                          className="type-badge"
                          style={{
                            backgroundColor: preset.type === 'competition' ? '#f6ad55' : '#667eea',
                          }}
                        >
                          {preset.type === 'competition' ? '竞赛' : '考级'}
                        </span>
                      </div>
                      <div className="col-name">{preset.name}</div>
                      <div className="col-cert-name">
                        <div className="cert-name-text">{preset.certificateName}</div>
                        <div className="cert-body-text">{preset.certifyingBody}</div>
                      </div>
                      <div className="col-category">
                        <span className="category-badge">{preset.category}</span>
                      </div>
                      <div className="col-weight">{preset.weight || 1}</div>
                      <div className="col-status">
                        <button
                          className={`status-toggle ${preset.enabled ? 'enabled' : 'disabled'}`}
                          onClick={() => handlePresetToggle(preset._id || '', preset.enabled)}
                          aria-label={preset.enabled ? '点击禁用' : '点击启用'}
                        >
                          {preset.enabled ? '✅ 启用' : '⛔ 禁用'}
                        </button>
                      </div>
                      <div className="col-actions">
                        <button
                          className="action-btn edit"
                          onClick={() => handlePresetEdit(preset)}
                          aria-label="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handlePresetDelete(preset._id || '')}
                          aria-label="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// React App 挂载
const container = document.getElementById('certificate-management-root');
if (container) {
  const root = createRoot(container);
  root.render(<CertificateManagement />);
}

export default CertificateManagement;
