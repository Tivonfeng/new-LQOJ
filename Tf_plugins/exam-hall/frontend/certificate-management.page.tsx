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
  presetName: string;
  certifyingBody: string;
  event: string;
  level: string;
  issueDate: string;
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

/** 赛项数据类型 */
interface ExamEventData {
  name: string;
  description?: string;
}

/** 预设表单数据类型 */
interface PresetFormData {
  type: 'competition' | 'certification';
  name: string;
  certifyingBody: string;
  weight: number | '';
  description: string;
  events: ExamEventData[];
}

const CertificateManagement: React.FC = () => {
  const [formData, setFormData] = useState<CertificateFormData>({
    username: '',
    uid: '',
    presetId: '',
    presetName: '',
    certifyingBody: '',
    event: '',
    level: '',
    issueDate: '',
    certificateImageUrl: '',
    certificateImageKey: '',
    notes: '',
  });

  // Modal 状态管理
  const [showAddCertificateModal, setShowAddCertificateModal] = useState(false);
  const [showExamSettingsModal, setShowExamSettingsModal] = useState(false);
  const [showAddExamForm, setShowAddExamForm] = useState(false);

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
    certifyingBody: '',
    weight: 1,
    description: '',
    events: [],
  });
  const [isPresetSubmitting, setIsPresetSubmitting] = useState(false);
  const [previewingCertId, setPreviewingCertId] = useState<string | null>(null);

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
          freeSolo: false,
          onChange: (value: any) => {
            if (value && typeof value === 'object' && (value.uid || value._id)) {
              const uid = value.uid || value._id;
              const username = value.uname || value.username || '';
              setFormData((prev) => ({
                ...prev,
                username,
                uid: uid.toString(),
              }));
            } else if (value === null || value === undefined || value === '') {
              setFormData((prev) => ({
                ...prev,
                username: '',
                uid: '',
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
          userSelectComponentRef.current.detach?.();
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
      setMessage({ type: 'error', text: '请选择赛考类型' });
      return false;
    }
    if (!presetFormData.name.trim()) {
      setMessage({ type: 'error', text: '请输入赛考名称' });
      return false;
    }
    if (!presetFormData.certifyingBody.trim()) {
      setMessage({ type: 'error', text: '请输入认证机构' });
      return false;
    }
    if (!presetFormData.events || presetFormData.events.length === 0) {
      setMessage({ type: 'error', text: '请添加至少一个赛项' });
      return false;
    }
    if (presetFormData.events.some((event) => !event.name.trim())) {
      setMessage({ type: 'error', text: '赛项名称不能为空' });
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

      const requestBody = {
        name: presetFormData.name,
        certifyingBody: presetFormData.certifyingBody,
        weight: presetFormData.weight ? Number(presetFormData.weight) : 1,
        description: presetFormData.description || undefined,
        events: presetFormData.events,
      };

      // Only include type for POST requests (creating new presets)
      if (!editingPresetId) {
        (requestBody as any).type = presetFormData.type;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
          certifyingBody: '',
          weight: 1,
          description: '',
          events: [],
        });
        setEditingPresetId(null);
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
      certifyingBody: preset.certifyingBody,
      weight: preset.weight || 1,
      description: preset.description || '',
      events: preset.events?.map((e) => ({ name: e.name, description: e.description })) || [],
    });
    setEditingPresetId(preset._id || null);
    setShowAddExamForm(true);
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

  // 初始化加载
  useEffect(() => {
    fetchCertificates();
    fetchPresets();
    fetchAllPresets();
  }, []);

  // 当打开Modal时加载数据
  useEffect(() => {
    if (showAddCertificateModal) {
      fetchPresets();
      // 清除表单数据（但保留已选用户）
      if (!editingId) {
        setFormData((prev) => ({
          ...prev,
          presetId: '',
          presetName: '',
          certifyingBody: '',
          event: '',
          level: '',
          issueDate: '',
          certificateImageUrl: '',
          certificateImageKey: '',
          notes: '',
        }));
      }
    }
  }, [showAddCertificateModal]);

  useEffect(() => {
    if (showExamSettingsModal) {
      fetchAllPresets(presetType !== 'all' ? presetType : undefined);
    }
  }, [showExamSettingsModal, presetType]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePresetSelect = (preset: CertificatePreset) => {
    setFormData((prev) => ({
      ...prev,
      presetId: preset._id || '',
      presetName: preset.name,
      certifyingBody: preset.certifyingBody,
      event: '',
      // 根据预设类型清空等级选择
      level: preset.type === 'certification' ? '通过' : '',
    }));
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
    if (!formData.presetId) {
      setMessage({ type: 'error', text: '请选择赛考' });
      return false;
    }
    if (!formData.event.trim()) {
      setMessage({ type: 'error', text: '请选择赛项' });
      return false;
    }
    if (!formData.level.trim()) {
      setMessage({ type: 'error', text: '请选择证书等级' });
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

      const requestBody = {
        username: formData.username.trim(),
        presetId: formData.presetId || undefined,
        certificateName: formData.presetName,
        certifyingBody: formData.certifyingBody,
        category: formData.event || undefined, // 将 event（赛项）作为 category 发送给后端
        level: formData.level || undefined,
        issueDate: formData.issueDate,
        certificateImageUrl: formData.certificateImageUrl || undefined,
        certificateImageKey: formData.certificateImageKey || undefined,
        notes: formData.notes || undefined,
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
          presetName: '',
          certifyingBody: '',
          event: '',
          level: '',
          issueDate: '',
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
          setShowAddCertificateModal(false);
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
      presetName: cert.certificateName,
      certifyingBody: cert.certifyingBody,
      event: '',
      level: cert.level || '',
      issueDate: formatDate(cert.issueDate),
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
    setShowAddCertificateModal(true);
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

      {/* 主界面头部 - 操作按钮栏 */}
      <div className="header-actions">
        <div className="header-left">
          <h2>证书列表</h2>
        </div>
        <div className="header-right">
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingId(null);
              setFormData({
                username: '',
                uid: '',
                presetId: '',
                presetName: '',
                certifyingBody: '',
                event: '',
                level: '',
                issueDate: '',
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
              setShowAddCertificateModal(true);
            }}
          >
            ➕ 添加证书
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowExamSettingsModal(true)}
          >
            ⚙️ 赛考设置
          </button>
        </div>
      </div>

      {/* 主证书列表 */}
      <div className="list-section">
        <div className="list-header">
          <div className="search-bar">
            <input
              type="text"
              placeholder="搜索用户 ID 或用户名..."
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
              <div className="col-index">序号</div>
              <div className="col-username">用户名</div>
              <div className="col-cert-name">赛考名称</div>
              <div className="col-event">赛项</div>
              <div className="col-body">主办单位</div>
              <div className="col-date">时间</div>
              <div className="col-image">证书图片</div>
              <div className="col-actions">操作</div>
            </div>
            {certificates.map((cert, index) => (
              <div key={cert._id} className="table-row">
                <div className="col-index">{index + 1}</div>
                <div className="col-username">{cert.username || `#${cert.uid}`}</div>
                <div className="col-cert-name">{cert.certificateName}</div>
                <div className="col-event">{cert.category || '-'}</div>
                <div className="col-body">{cert.certifyingBody}</div>
                <div className="col-date">{new Date(cert.issueDate).toLocaleDateString('zh-CN')}</div>
                <div className="col-image">
                  {cert.certificateImageUrl ? (
                    <img
                      src={cert.certificateImageUrl}
                      alt={cert.certificateName}
                      className="certificate-thumbnail"
                      onClick={() => setPreviewingCertId(cert._id || '')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setPreviewingCertId(cert._id || '');
                        }
                      }}
                    />
                  ) : (
                    <span className="no-image">暂无</span>
                  )}
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

      {/* 添加证书Modal */}
      {showAddCertificateModal && (
        <div className="modal-overlay" onClick={() => setShowAddCertificateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ 编辑证书' : '➕ 添加证书'}</h2>
              <button
                className="modal-close"
                onClick={() => setShowAddCertificateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit} className="certificate-form" noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="presetSelect">选择赛考 *</label>
                    <select
                      id="presetSelect"
                      value={formData.presetId}
                      onChange={(e) => {
                        const selectedPreset = presets.find((p) => p._id === e.target.value);
                        if (selectedPreset) {
                          handlePresetSelect(selectedPreset);
                        } else {
                          // 清除预设选择
                          setFormData((prev) => ({
                            ...prev,
                            presetId: '',
                            presetName: '',
                            certifyingBody: '',
                            event: '',
                          }));
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <option value="">-- 选择赛考预设 --</option>
                      {presets.map((preset) => (
                        <option key={preset._id} value={preset._id}>
                          {preset.type === 'competition' ? '🏆 ' : '📚 '}{preset.name}
                        </option>
                      ))}
                    </select>
                    <div className="form-hint">选择一个赛考预设快速填充证书信息</div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="username">选择用户 *</label>
                    <input
                      ref={userInputRef}
                      type="text"
                      id="username"
                      name="username"
                      className="eui-form-control"
                      placeholder="搜索用户名..."
                      value={formData.username}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }));
                      }}
                      disabled={isSubmitting}
                    />
                    <div className="form-hint">搜索并选择要添加证书的用户</div>
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
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="event">赛项 *</label>
                    <select
                      id="event"
                      name="event"
                      value={formData.event}
                      onChange={handleInputChange}
                      disabled={isSubmitting || !formData.presetId}
                      required
                    >
                      <option value="">-- 选择赛项 --</option>
                      {(() => {
                        const selectedPreset = presets.find(
                          (p) => p._id === formData.presetId,
                        );
                        return selectedPreset?.events?.map((e) => (
                          <option key={e.name} value={e.name}>
                            {e.name}
                          </option>
                        ));
                      })()}
                    </select>
                    <div className="form-hint">选择赛项</div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="level">证书等级 *</label>
                    <select
                      id="level"
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">-- 选择等级 --</option>
                      {(() => {
                        const selectedPreset = presets.find((p) => p._id === formData.presetId);
                        if (selectedPreset?.type === 'competition') {
                          return (
                            <>
                              <option value="一等奖">🥇 一等奖</option>
                              <option value="二等奖">🥈 二等奖</option>
                              <option value="三等奖">🥉 三等奖</option>
                            </>
                          );
                        } if (selectedPreset?.type === 'certification') {
                          return (
                            <option value="通过">✅ 通过</option>
                          );
                        }
                        return (
                          <>
                            <option value="初级">初级</option>
                            <option value="中级">中级</option>
                            <option value="高级">高级</option>
                            <option value="专家">专家</option>
                          </>
                        );
                      })()}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="issueDate">颁发日期 *</label>
                    <input
                      type="date"
                      id="issueDate"
                      name="issueDate"
                      value={formData.issueDate}
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
                          presetName: '',
                          certifyingBody: '',
                          event: '',
                          level: '',
                          issueDate: '',
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
          </div>
        </div>
      )}

      {/* 赛考设置Modal */}
      {showExamSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowExamSettingsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ 赛考设置</h2>
              <button
                className="modal-close"
                onClick={() => setShowExamSettingsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="exam-settings-container">
                {/* 左侧：赛考列表 */}
                <div className="exam-list-panel">
                  <div className="panel-header">
                    <h3>赛考列表</h3>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setEditingPresetId(null);
                        setPresetFormData({
                          type: 'competition',
                          name: '',
                          certifyingBody: '',
                          weight: 1,
                          description: '',
                          events: [],
                        });
                        setShowAddExamForm(true);
                      }}
                    >
                      ➕ 添加赛考
                    </button>
                  </div>

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

                  {loading ? (
                    <div className="loading">加载中...</div>
                  ) : allPresets.length === 0 ? (
                    <div className="empty-state">
                      <p>📭 暂无赛考数据</p>
                    </div>
                  ) : (
                    <div className="presets-table">
                      <div className="table-header">
                        <div className="col-type">类型</div>
                        <div className="col-name">赛考名称</div>
                        <div className="col-cert-name">认证机构</div>
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
                            <span>{preset.certifyingBody}</span>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑赛考Modal */}
      {showAddExamForm && (
        <div className="modal-overlay" onClick={() => setShowAddExamForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPresetId ? '✏️ 编辑赛考' : '➕ 添加赛考'}</h2>
              <button
                className="modal-close"
                onClick={() => setShowAddExamForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handlePresetSubmit} className="preset-form">
                <div className="form-group">
                  <label htmlFor="preset-type">赛考类型 *</label>
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
                    {presetFormData.type === 'competition' ? '用于管理各类竞赛赛考' : '用于管理各类考级赛考'}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="preset-name">赛考名称 *</label>
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
                  <div className="form-hint">赛考的名称</div>
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

                <div className="form-group full-width">
                  <label htmlFor="preset-description">描述</label>
                  <textarea
                    id="preset-description"
                    name="description"
                    value={presetFormData.description}
                    onChange={handlePresetInputChange}
                    placeholder="输入赛考的描述信息（可选）"
                    rows={3}
                    disabled={isPresetSubmitting}
                  />
                </div>

                <div className="form-group full-width">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label>赛项 *</label>
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={() => {
                        setPresetFormData((prev) => ({
                          ...prev,
                          events: [...(prev.events || []), { name: '', description: '' }],
                        }));
                      }}
                      disabled={isPresetSubmitting}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      ➕ 添加赛项
                    </button>
                  </div>

                  {presetFormData.events && presetFormData.events.length > 0 ? (
                    <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', padding: '10px' }}>
                      {presetFormData.events.map((event, index) => {
                        const isLastEvent = index === presetFormData.events!.length - 1;
                        return (
                          <div
                            key={index}
                            style={{
                              marginBottom: '10px',
                              paddingBottom: '10px',
                              borderBottom: isLastEvent ? 'none' : '1px solid #f0f0f0',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <input
                                type="text"
                                placeholder="赛项名称"
                                value={event.name}
                                onChange={(e) => {
                                  const newEvents = [...presetFormData.events!];
                                  newEvents[index].name = e.target.value;
                                  setPresetFormData((prev) => ({
                                    ...prev,
                                    events: newEvents,
                                  }));
                                }}
                                disabled={isPresetSubmitting}
                                style={{
                                  flex: 1,
                                  padding: '6px',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  fontSize: '14px',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newEvents = presetFormData.events!.filter(
                                    (_, i) => i !== index,
                                  );
                                  setPresetFormData((prev) => ({
                                    ...prev,
                                    events: newEvents,
                                  }));
                                }}
                                disabled={isPresetSubmitting}
                                className="btn btn-text"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  color: '#ff4444',
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        color: '#ff4444',
                        fontSize: '12px',
                        padding: '10px',
                        textAlign: 'center',
                        backgroundColor: '#fff5f5',
                        borderRadius: '4px',
                        border: '1px solid #ffcccc',
                      }}
                    >
                      请点击"添加赛项"按钮添加至少一个赛项
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={isPresetSubmitting}>
                    {isPresetSubmitting ? '提交中...' : editingPresetId ? '更新赛考' : '创建赛考'}
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
                          certifyingBody: '',
                          weight: 1,
                          description: '',
                          events: [],
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
          </div>
        </div>
      )}

      {/* 证书图片预览Modal */}
      {previewingCertId && (
        <div className="modal-overlay" onClick={() => setPreviewingCertId(null)}>
          <div className="modal-content modal-preview" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📷 证书图片预览</h2>
              <button
                className="modal-close"
                onClick={() => setPreviewingCertId(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {(() => {
                const cert = certificates.find((c) => c._id === previewingCertId);
                if (!cert) return null;
                return (
                  <div className="certificate-preview-container">
                    <div className="preview-image-wrapper">
                      <img
                        src={cert.certificateImageUrl}
                        alt={cert.certificateName}
                        className="preview-certificate-image"
                      />
                    </div>
                    <div className="preview-details">
                      <div className="detail-item">
                        <span className="detail-label">证书名称：</span>
                        <span className="detail-value">{cert.certificateName}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">认证机构：</span>
                        <span className="detail-value">{cert.certifyingBody}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">分类：</span>
                        <span className="detail-value">{cert.category}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">等级：</span>
                        <span className="detail-value">{cert.level || '-'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">颁发日期：</span>
                        <span className="detail-value">
                          {new Date(cert.issueDate).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">状态：</span>
                        <span className={`detail-value status-${cert.status || 'active'}`}>
                          {cert.status === 'expired'
                            ? '已过期'
                            : cert.status === 'revoked'
                              ? '已撤销'
                              : '有效'}
                        </span>
                      </div>
                      {cert.notes && (
                        <div className="detail-item">
                          <span className="detail-label">备注：</span>
                          <span className="detail-value">{cert.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 初始化React组件到DOM
if (document.getElementById('certificate-management-root')) {
  const root = createRoot(document.getElementById('certificate-management-root')!);
  root.render(<CertificateManagement />);
}

export default CertificateManagement;
