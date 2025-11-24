import { UserSelectAutoComplete } from '@hydrooj/ui-default';
import $ from 'jquery';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import './certificate-management.css';
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
  examType: '' | 'competition' | 'certification';
  competitionName: string;
  certificationSeries: string;
  weight: number | '';
}

const CertificateUploader: React.FC<{
  value?: string;
  onFileSelected?: (file: File) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  pendingUpload?: boolean;
}> = ({
  value,
  onFileSelected,
  onUploadError,
  disabled = false,
  isUploading = false,
  uploadProgress = 0,
  pendingUpload = false,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const derivedPreviewType = React.useMemo(() => {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower.endsWith('.pdf') || lower.includes('.pdf?')) {
      return 'pdf';
    }
    return 'image';
  }, [value]);
  const displayedPreview = preview || value || null;
  const displayedType = preview ? previewType : derivedPreviewType;
  const previewFromValue = !preview && Boolean(value);

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

    onFileSelected?.(file);
  };

  const wasPendingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasPendingRef.current && !pendingUpload) {
      setPreview(null);
      setPreviewType(null);
    }
    wasPendingRef.current = pendingUpload;
  }, [pendingUpload]);

  return (
    <div className="certificate-uploader">
      <div className="certificate-uploader-body">
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

        {displayedPreview && displayedType === 'image' ? (
          <div className="preview">
            <img src={displayedPreview} alt="证书预览" className="preview-image" />
            <p className="preview-hint">点击以重新上传或替换证书材料</p>
          </div>
        ) : displayedType === 'pdf' && displayedPreview ? (
          <div className="preview">
            <div className="pdf-preview">
              <span>{previewFromValue ? '📄 已上传 PDF' : '📄 已选择 PDF 文件'}</span>
              {previewFromValue ? (
                <a
                  href={displayedPreview}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  新窗口打开
                </a>
              ) : (
                <small>上传完成后可在此预览</small>
              )}
            </div>
          </div>
        ) : (
          <div className="upload-icon">📤</div>
        )}

        {isUploading ? (
          <div className="uploading-state">
            <p className="uploading-text">上传中...</p>
            <div className="upload-progress-container">
              <div
                className="upload-progress"
                role="progressbar"
                aria-label="上传进度"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="progress-text">{Math.round(uploadProgress)}%</p>
          </div>
        ) : (
          <div className="upload-text">
            <p className="drag-text">
              {disabled
                ? '上传已禁用'
                : displayedPreview
                  ? '点击该区域重新上传或拖入新文件'
                  : '拖拽文件到此或点击选择'}
            </p>
            <p className="size-text">支持 JPG/PNG/PDF，最大 10MB</p>
            {pendingUpload && (
              <p className="pending-text">文件将于点击“创建证书”时上传</p>
            )}
          </div>
        )}
      </div>
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
    examType: '',
    competitionName: '',
    certificationSeries: '',
    weight: '',
  });
  const [pendingCertificateFile, setPendingCertificateFile] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);

  // Modal 状态管理
  const [showAddCertificateModal, setShowAddCertificateModal] = useState(false);
  const [showExamSettingsModal, setShowExamSettingsModal] = useState(false);
  const [showAddExamForm, setShowAddExamForm] = useState(false);

  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [presets, setPresets] = useState<CertificatePreset[]>([]);
  const [allPresets, setAllPresets] = useState<CertificatePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUid, setSearchUid] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presetType, setPresetType] = useState<'all' | 'competition' | 'certification'>('all');
  const [presetSearch, setPresetSearch] = useState('');
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
  const [arePresetsLoading, setArePresetsLoading] = useState(false);
  const [certificateFilter, setCertificateFilter] = useState<'all' | 'withImage' | 'noImage'>('all');
  const [certificateSort, setCertificateSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset._id === formData.presetId),
    [presets, formData.presetId],
  );

  const appliedWeight = useMemo<number | ''>(() => {
    if (typeof selectedPreset?.weight === 'number') {
      return selectedPreset.weight;
    }
    if (typeof formData.weight === 'number') {
      return formData.weight;
    }
    return '';
  }, [selectedPreset?.weight, formData.weight]);

  const presetStats = useMemo(() => allPresets.reduce((acc, preset) => {
    acc.total += 1;
    if (preset.type === 'competition') {
      acc.competition += 1;
    } else if (preset.type === 'certification') {
      acc.certification += 1;
    }
    return acc;
  }, {
    total: 0,
    competition: 0,
    certification: 0,
  }), [allPresets]);

  const certificateStats = useMemo(() => {
    const stats = {
      total: certificates.length,
      withImage: 0,
      noImage: 0,
      recent: 0,
      uniqueUsers: 0,
    };
    const userSet = new Set<string>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    certificates.forEach((cert) => {
      if (cert.certificateImageUrl) {
        stats.withImage += 1;
      } else {
        stats.noImage += 1;
      }

      if (cert.issueDate) {
        const issueDate = new Date(cert.issueDate);
        if (!Number.isNaN(issueDate.getTime()) && issueDate >= thirtyDaysAgo) {
          stats.recent += 1;
        }
      }

      if (cert.uid !== undefined && cert.uid !== null) {
        userSet.add(String(cert.uid));
      } else if (cert.username) {
        userSet.add(cert.username);
      }
    });

    stats.uniqueUsers = userSet.size;
    return stats;
  }, [certificates]);

  const filteredCertificates = useMemo(() => {
    let workingList = certificates;
    if (certificateFilter === 'withImage') {
      workingList = certificates.filter((cert) => Boolean(cert.certificateImageUrl));
    } else if (certificateFilter === 'noImage') {
      workingList = certificates.filter((cert) => !cert.certificateImageUrl);
    }

    const getIssueTimestamp = (cert: CertificateInfo) => {
      if (!cert.issueDate) return 0;
      const time = new Date(cert.issueDate).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const sorted = [...workingList].sort((a, b) => {
      if (certificateSort === 'newest') {
        return getIssueTimestamp(b) - getIssueTimestamp(a);
      }
      if (certificateSort === 'oldest') {
        return getIssueTimestamp(a) - getIssueTimestamp(b);
      }
      if (certificateSort === 'name') {
        return (a.certificateName || '').localeCompare(b.certificateName || '', 'zh-Hans-CN');
      }
      return 0;
    });

    return sorted;
  }, [certificateFilter, certificates, certificateSort]);

  const filteredPresets = useMemo(() => {
    const search = presetSearch.trim().toLowerCase();
    return [...allPresets]
      .filter((preset) => {
        const typeMatch = presetType === 'all' || preset.type === presetType;
        const searchMatch = !search
          || [
            preset.name,
            preset.certifyingBody,
            preset.description,
          ].some((field) => (field ? field.toLowerCase().includes(search) : false));
        return typeMatch && searchMatch;
      })
      .sort((a, b) => (b.weight || 1) - (a.weight || 1));
  }, [allPresets, presetType, presetSearch]);

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
              const rawUid = value.uid || value._id;
              const username = value.uname || value.username || '';
              const numericUid = Number(rawUid);
              setFormData((prev) => ({
                ...prev,
                username,
                uid: Number.isNaN(numericUid) ? '' : numericUid,
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
        console.error('获取证书列表失败:', data.error || '获取证书列表失败');
      }
    } catch (error) {
      console.error('获取证书列表失败:', error);
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
        console.error('获取预设列表失败:', data.error || '获取预设列表失败');
      }
    } catch (error) {
      console.error('获取预设列表失败:', error);
    }
  };

  const fetchAllPresets = async () => {
    setArePresetsLoading(true);
    try {
      const response = await fetch('/exam/admin/presets');
      const data = await response.json();
      if (data.success) {
        setAllPresets(data.data || []);
      } else {
        console.error('获取全部预设失败:', data.error || '获取预设列表失败');
      }
    } catch (error) {
      console.error('获取全部预设失败:', error);
    } finally {
      setArePresetsLoading(false);
    }
  };

  const validatePresetForm = (): boolean => {
    if (!presetFormData.type) {
      console.warn('请选择赛考类型');
      return false;
    }
    if (!presetFormData.name.trim()) {
      console.warn('请输入赛考名称');
      return false;
    }
    if (!presetFormData.certifyingBody.trim()) {
      console.warn('请输入认证机构');
      return false;
    }
    if (!presetFormData.events || presetFormData.events.length === 0) {
      console.warn('请添加至少一个赛项');
      return false;
    }
    if (presetFormData.events.some((event) => !event.name.trim())) {
      console.warn('赛项名称不能为空');
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
        setPresetFormData({
          type: 'competition',
          name: '',
          certifyingBody: '',
          weight: 1,
          description: '',
          events: [],
        });
        setEditingPresetId(null);
        await fetchAllPresets();
      } else {
        console.error('预设保存失败:', data.error || '操作失败');
      }
    } catch (error) {
      console.error('预设保存失败:', error);
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
        await fetchAllPresets();
      } else {
        console.error('预设删除失败:', data.error || '删除失败');
      }
    } catch (error) {
      console.error('预设删除失败:', error);
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
    }
  }, [showAddCertificateModal]);

  useEffect(() => {
    if (showExamSettingsModal) {
      fetchAllPresets();
    }
  }, [showExamSettingsModal]);

  useEffect(() => {
    const presetWeight = selectedPreset?.weight;
    if (
      typeof presetWeight === 'number'
      && formData.weight !== presetWeight
    ) {
      setFormData((prev) => ({
        ...prev,
        weight: presetWeight,
      }));
    }
  }, [selectedPreset?.weight, formData.weight]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'weight') {
        return {
          ...prev,
          [name]: value === '' ? '' : Number(value),
        } as CertificateFormData;
      }
      return {
        ...prev,
        [name]: value,
      };
    });
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
      examType: preset.type,
      competitionName: preset.type === 'competition'
        ? preset.name
        : '',
      certificationSeries: preset.type === 'certification'
        ? preset.name
        : '',
      weight: typeof preset.weight === 'number'
        ? preset.weight
        : (prev.weight || ''),
    }));
  };

  const uploadCertificateFile = (file: File) => new Promise<{
    url: string;
    key: string;
    size: number;
  }>((resolve, reject) => {
    const formDataPayload = new FormData();
    formDataPayload.append('image', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        setFileUploadProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success && response.url) {
            resolve({
              url: response.url,
              key: response.key,
              size: response.size,
            });
          } else {
            reject(new Error(response.error || '上传失败'));
          }
        } catch (err) {
          reject(err instanceof Error ? err : new Error('上传失败'));
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: 上传失败`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'));
    });

    xhr.open('POST', '/exam/admin/upload-certificate');
    xhr.send(formDataPayload);
  });

  const handleUploadError = (error: string) => {
    console.error('证书文件上传失败:', error);
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      console.warn('请选择用户');
      return false;
    }
    if (!formData.presetId) {
      console.warn('请选择赛考');
      return false;
    }
    if (!formData.event.trim()) {
      console.warn('请选择赛项');
      return false;
    }
    if (!formData.level.trim()) {
      console.warn('请选择证书等级');
      return false;
    }
    if (!formData.issueDate) {
      console.warn('请选择颁发日期');
      return false;
    }
    if (!formData.certificateImageUrl && !pendingCertificateFile) {
      console.warn('请先选择证书材料');
      return false;
    }

    const issueDate = new Date(formData.issueDate);
    if (issueDate > new Date()) {
      console.warn('颁发日期不能是未来日期');
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
    let certificateImageUrl = formData.certificateImageUrl;
    let certificateImageKey = formData.certificateImageKey;

    if (pendingCertificateFile) {
      setIsFileUploading(true);
      setFileUploadProgress(0);
      try {
        const uploadResult = await uploadCertificateFile(pendingCertificateFile);
        certificateImageUrl = uploadResult.url;
        certificateImageKey = uploadResult.key;
        setFormData((prev) => ({
          ...prev,
          certificateImageUrl,
          certificateImageKey,
        }));
        setPendingCertificateFile(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '上传失败';
        handleUploadError(errorMessage);
        setIsSubmitting(false);
        setIsFileUploading(false);
        setFileUploadProgress(0);
        return;
      } finally {
        setIsFileUploading(false);
        setFileUploadProgress(0);
      }
    }

    try {
      const endpoint = editingId ? `/exam/admin/certificates/${editingId}` : '/exam/admin/certificates';
      const method = editingId ? 'PUT' : 'POST';

      const requestBody = {
        uid: typeof formData.uid === 'number' ? formData.uid : undefined,
        username: formData.username.trim(),
        presetId: formData.presetId || undefined,
        certificateName: formData.presetName,
        certifyingBody: formData.certifyingBody,
        category: formData.event || undefined, // 将 event（赛项）作为 category 发送给后端
        level: formData.level || undefined,
        issueDate: formData.issueDate,
        certificateImageUrl: certificateImageUrl || undefined,
        certificateImageKey: certificateImageKey || undefined,
        notes: formData.notes || undefined,
        examType: formData.examType || undefined,
        competitionName: formData.examType === 'competition'
          ? (formData.competitionName.trim() || formData.presetName)
          : undefined,
        certificationSeries: formData.examType === 'certification'
          ? (formData.certificationSeries.trim() || formData.presetName)
          : undefined,
        weight: typeof appliedWeight === 'number' ? appliedWeight : undefined,
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
          examType: '',
          competitionName: '',
          certificationSeries: '',
          weight: '',
        });
        setPendingCertificateFile(null);
        setFileUploadProgress(0);
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
        console.error('证书保存失败:', data.error || '操作失败');
      }
    } catch (error) {
      console.error('证书保存失败:', error);
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
        await fetchCertificates();
      } else {
        console.error('证书删除失败:', data.error || '删除失败');
      }
    } catch (error) {
      console.error('证书删除失败:', error);
    }
  };

  /**
   * 格式化日期为 YYYY-MM-DD 字符串格式
   */
  const formatDateToString = (date: string | Date | undefined): string => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    return date instanceof Date ? date.toISOString().split('T')[0] : '';
  };

  /**
   * 将日期转换为易读格式
   */
  const formatDisplayDate = (date: string | Date | undefined): string => {
    if (!date) return '日期未填写';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return '日期未填写';
    }
    return parsed.toLocaleDateString('zh-CN');
  };

  const getAvatarText = (cert: CertificateInfo): string => {
    if (cert.username) {
      return cert.username.slice(0, 1).toUpperCase();
    }
    if (cert.uid !== undefined && cert.uid !== null) {
      return String(cert.uid).slice(0, 1);
    }
    return 'U';
  };

  /**
   * 重置表单并清除用户选择组件
   */
  const resetFormAndUser = () => {
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
      examType: '',
      competitionName: '',
      certificationSeries: '',
      weight: '',
    });
    setPendingCertificateFile(null);
    setFileUploadProgress(0);
    setIsFileUploading(false);
    // 清理UserSelectAutoComplete
    if (userSelectComponentRef.current) {
      try {
        userSelectComponentRef.current.clear();
      } catch (error) {
        console.warn('Failed to clear UserSelectAutoComplete:', error);
      }
    }
  };

  const handleEdit = (cert: CertificateInfo) => {
    setFormData({
      username: cert.username || '',
      uid: cert.uid,
      presetId: cert.presetId || '',
      presetName: cert.certificateName,
      certifyingBody: cert.certifyingBody,
      event: cert.category || '', // 从 category 加载赛项
      level: cert.level || '',
      issueDate: formatDateToString(cert.issueDate),
      certificateImageUrl: cert.certificateImageUrl || '',
      certificateImageKey: cert.certificateImageKey || '',
      notes: cert.notes || '',
      examType: cert.examType || '',
      competitionName: cert.competitionName || '',
      certificationSeries: cert.certificationSeries || '',
      weight: typeof cert.weight === 'number' ? cert.weight : '',
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
    setPendingCertificateFile(null);
    setFileUploadProgress(0);
    setIsFileUploading(false);
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
        <div className="dashboard-hero">
          <div className="hero-copy">
            <p className="eyebrow">Certificate Control Center</p>
            <h1>📜 证书管理</h1>
            <p>创建、编辑和管理用户证书，实时掌握发放进度与质量。</p>
          </div>
        </div>
      </div>

      {/* 主界面头部 - 操作按钮栏 */}
      <div className="header-actions">
        <div className="header-left">
          <h2>证书列表</h2>
        </div>
        <div className="header-right">
          <button
            className="btn btn-primary"
            onClick={() => {
              resetFormAndUser();
              setEditingId(null);
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
              className="form-control"
              placeholder="搜索用户 ID 或用户名..."
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            {searchUid && (
              <button
                className="btn-clear"
                onClick={() => setSearchUid('')}
                aria-label="清除"
              >
                ✕
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? '搜索中...' : '🔍 搜索'}
            </button>
          </div>

          <div className="certificates-toolbar">
            <div className="filter-chips">
              {([
                { value: 'all', label: '全部', count: certificateStats.total },
                { value: 'withImage', label: '有图片', count: certificateStats.withImage },
                { value: 'noImage', label: '待补图', count: certificateStats.noImage },
              ] as const).map((tab) => (
                <button
                  key={tab.value}
                  className={`filter-chip ${certificateFilter === tab.value ? 'active' : ''}`}
                  onClick={() => setCertificateFilter(tab.value)}
                >
                  <span>{tab.label}</span>
                  <span className="chip-divider">|</span>
                  <span className="chip-count">{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="toolbar-right">
              <div className="certificate-controls">
                <label className="sort-select" htmlFor="certificate-sort">
                  排序
                  <select
                    id="certificate-sort"
                    value={certificateSort}
                    onChange={(e) => setCertificateSort(e.target.value as typeof certificateSort)}
                    disabled={loading}
                  >
                    <option value="newest">最新优先</option>
                    <option value="oldest">最早优先</option>
                    <option value="name">按名称排序</option>
                  </select>
                </label>
                <div className="view-toggle" role="group">
                  <button
                    className={`btn btn-sm ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    aria-pressed={viewMode === 'table'}
                  >
                    📋 列表
                  </button>
                  <button
                    className={`btn btn-sm ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    aria-pressed={viewMode === 'grid'}
                  >
                    🗂️ 卡片
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" role="status" aria-live="polite">加载中...</div>
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="empty-state">
            <p>
              {certificateFilter === 'withImage'
                ? '📷 暂无已上传图片的证书'
                : certificateFilter === 'noImage'
                  ? '🖼️ 暂无待补充图片的证书'
                  : '📭 暂无证书数据'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <table className="certificates-table" aria-label="证书列表">
            <thead>
              <tr>
                <th>序号</th>
                <th>用户名</th>
                <th>赛考名称</th>
                <th>赛项</th>
                <th>主办单位</th>
                <th>时间</th>
                <th>证书图片</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCertificates.map((cert, index) => (
                <tr key={cert._id || `${cert.username || cert.uid}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{cert.username || `#${cert.uid}`}</td>
                  <td>{cert.certificateName}</td>
                  <td>{cert.category || '-'}</td>
                  <td>{cert.certifyingBody}</td>
                  <td>{formatDisplayDate(cert.issueDate)}</td>
                  <td>
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
                      <span className="chip chip-warning chip-sm">暂无</span>
                    )}
                  </td>
                  <td>
                    <div className="table-action-group">
                      <button
                        className="btn btn-icon"
                        onClick={() => handleEdit(cert)}
                        aria-label="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-icon"
                        onClick={() => setPreviewingCertId(cert._id || '')}
                        aria-label="预览"
                        disabled={!cert.certificateImageUrl}
                      >
                        👁️
                      </button>
                      <button
                        className="btn btn-icon btn-danger"
                        onClick={() => handleDelete(cert._id || '')}
                        aria-label="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="certificate-card-grid">
            {filteredCertificates.map((cert) => (
              <div key={cert._id} className="certificate-card">
                <div className="certificate-card-top">
                  <div className="certificate-card-avatar">{getAvatarText(cert)}</div>
                  <div className="certificate-card-headline">
                    <p className="certificate-card-title">{cert.certificateName}</p>
                    <span className="certificate-card-subtitle">
                      {cert.certifyingBody || '主办单位未填写'}
                    </span>
                  </div>
                  <span className="chip chip-primary chip-sm">
                    {cert.level || '等级未定'}
                  </span>
                </div>
                <hr className="divider" />
                <div className="certificate-card-body">
                  <div className="certificate-card-meta">
                    <span>👤 {cert.username || `#${cert.uid}`}</span>
                    <span>🏷️ {cert.category || '赛项未填写'}</span>
                    <span>📅 {formatDisplayDate(cert.issueDate)}</span>
                    {cert.examType && (
                      <span>{cert.examType === 'competition' ? '🏆 竞赛' : '📚 考级'}</span>
                    )}
                    {typeof cert.weight === 'number' && (
                      <span>⚖️ 权重 {cert.weight}</span>
                    )}
                  </div>
                  {cert.notes && <p className="certificate-card-notes">📝 {cert.notes}</p>}
                  <div className="certificate-card-media">
                    {cert.certificateImageUrl ? (
                      <img
                        src={cert.certificateImageUrl}
                        alt={cert.certificateName}
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
                      <div className="certificate-card-placeholder">
                        <span>暂无图片</span>
                      </div>
                    )}
                  </div>
                </div>
                <hr className="divider" />
                <div className="certificate-card-footer">
                  <div className="card-actions">
                    <button
                      className="btn btn-icon"
                      aria-label="预览"
                      onClick={() => setPreviewingCertId(cert._id || '')}
                      disabled={!cert.certificateImageUrl}
                    >
                      👁️
                    </button>
                    <button
                      className="btn btn-icon"
                      aria-label="编辑"
                      onClick={() => handleEdit(cert)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-icon btn-danger"
                      aria-label="删除"
                      onClick={() => handleDelete(cert._id || '')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddCertificateModal && (
        <div className="modal-overlay" onClick={() => setShowAddCertificateModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ 编辑证书' : '➕ 添加证书'}</h2>
              <button
                className="btn btn-icon"
                onClick={() => setShowAddCertificateModal(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
                <form id="certificate-form" onSubmit={handleSubmit} className="certificate-form" noValidate>
                  <div className="form-layout">
                    <div className="form-column form-column-main">
                      <div className="form-section compact">
                        <div className="form-section-title">赛考预设信息</div>
                        <div className="form-grid form-grid-two-column">
                          <div className="form-group">
                            <label htmlFor="presetSelect">选择赛考 *</label>
                            <select
                              id="presetSelect"
                              value={formData.presetId}
                              onChange={(e) => {
                                const matchedPreset = presets.find((p) => p._id === e.target.value);
                                if (matchedPreset) {
                                  handlePresetSelect(matchedPreset);
                                } else {
                                  // 清除预设选择
                                  setFormData((prev) => ({
                                    ...prev,
                                    presetId: '',
                                    presetName: '',
                                    certifyingBody: '',
                                    event: '',
                                    examType: '',
                                    competitionName: '',
                                    certificationSeries: '',
                                    weight: '',
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
                            <label htmlFor="certifyingBody">认证机构 *</label>
                            <input
                              type="text"
                              id="certifyingBody"
                              name="certifyingBody"
                              value={formData.certifyingBody}
                              readOnly
                              disabled
                              placeholder={selectedPreset ? '预设已自动填充' : '请先选择赛考预设'}
                            />
                            <div className="form-hint">认证机构由赛考预设决定，如需修改请编辑赛考预设</div>
                          </div>

                          <div className="form-group">
                            <label>赛考类型</label>
                            <input
                              type="text"
                              value={
                                formData.examType === 'competition'
                                  ? '竞赛'
                                  : formData.examType === 'certification'
                                    ? '考级'
                                    : '未选择'
                              }
                              readOnly
                              disabled
                            />
                            <div className="form-hint">选择赛考预设后自动确定</div>
                          </div>

                          <div className="form-group">
                            <label htmlFor="weight">权重</label>
                            <input
                              type="number"
                              id="weight"
                              name="weight"
                              value={appliedWeight === '' ? '' : appliedWeight}
                              disabled
                              readOnly
                              placeholder={selectedPreset ? '预设权重已自动应用' : '请先选择赛考预设'}
                            />
                            <div className="form-hint">权重由赛考预设决定，如需调整请在赛考管理中修改</div>
                          </div>

                          {formData.examType === 'competition' && (
                            <div className="form-group">
                              <label>竞赛名称</label>
                              <input
                                type="text"
                                value={formData.competitionName || selectedPreset?.name || ''}
                                readOnly
                                disabled
                                placeholder={selectedPreset ? '预设已自动填充' : '请先选择赛考预设'}
                              />
                              <div className="form-hint">竞赛名称由赛考预设决定，如需调整请前往赛考管理修改预设</div>
                            </div>
                          )}

                          {formData.examType === 'certification' && (
                            <div className="form-group">
                              <label>考级系列</label>
                              <input
                                type="text"
                                value={formData.certificationSeries || selectedPreset?.name || ''}
                                readOnly
                                disabled
                                placeholder={selectedPreset ? '预设已自动填充' : '请先选择赛考预设'}
                              />
                              <div className="form-hint">考级系列由赛考预设决定，如需调整请前往赛考管理修改预设</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="form-section compact">
                        <div className="form-section-title">证书填写信息</div>
                        <div className="form-grid form-grid-two-column">
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
                            <label htmlFor="event">赛项 *</label>
                            <select
                              id="event"
                              name="event"
                              value={formData.event}
                              onChange={handleInputChange}
                              disabled={
                                isSubmitting
                                || !selectedPreset
                                || !selectedPreset.events
                                || selectedPreset.events.length === 0
                              }
                              required
                            >
                              <option value="">-- 选择赛项 --</option>
                              {selectedPreset?.events?.map((e) => (
                                <option key={e.name} value={e.name}>
                                  {e.name}
                                </option>
                              ))}
                            </select>
                            <div className="form-hint">
                              {!selectedPreset
                                ? '请先选择赛考预设'
                                : selectedPreset.events && selectedPreset.events.length > 0
                                  ? '只能选择预设中已配置的赛项'
                                  : '当前预设暂无赛项，请先在赛考管理中添加'}
                            </div>
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
                              {selectedPreset?.type === 'competition' && (
                                <>
                                  <option value="一等奖">🥇 一等奖</option>
                                  <option value="二等奖">🥈 二等奖</option>
                                  <option value="三等奖">🥉 三等奖</option>
                                </>
                              )}
                              {selectedPreset?.type === 'certification' && (
                                <option value="通过">✅ 通过</option>
                              )}
                              {!selectedPreset && (
                                <>
                                  <option value="初级">初级</option>
                                  <option value="中级">中级</option>
                                  <option value="高级">高级</option>
                                  <option value="专家">专家</option>
                                </>
                              )}
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
                      </div>
                    </div>

                    <div className="form-column form-column-side">
                      <div className="form-section compact side-panel">
                        <div className="form-section-title">证书材料</div>
                        <CertificateUploader
                          value={formData.certificateImageUrl}
                          onFileSelected={(file) => {
                            setPendingCertificateFile(file);
                            setFormData((prev) => ({
                              ...prev,
                              certificateImageUrl: '',
                              certificateImageKey: '',
                            }));
                          }}
                          onUploadError={handleUploadError}
                          disabled={isSubmitting || isFileUploading}
                          isUploading={isFileUploading}
                          uploadProgress={fileUploadProgress}
                          pendingUpload={Boolean(pendingCertificateFile)}
                        />

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
                      </div>

                      <div className="form-actions form-actions-compact form-actions-align-right side-panel-actions">
                        <button
                          type="submit"
                          form="certificate-form"
                          className="btn btn-primary"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? '提交中...' : editingId ? '更新证书' : '创建证书'}
                        </button>
                        {editingId && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingId(null);
                              resetFormAndUser();
                            }}
                            disabled={isSubmitting}
                          >
                            取消编辑
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {showExamSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowExamSettingsModal(false)}>
          <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ 赛考设置</h2>
              <button
                className="btn btn-icon"
                onClick={() => setShowExamSettingsModal(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
                <div className="exam-settings-container">
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

                    <div className="list-toolbar">
                      <div className="filter-tabs">
                        {([
                          { value: 'all', label: '全部', count: presetStats.total },
                          { value: 'competition', label: '竞赛', count: presetStats.competition },
                          { value: 'certification', label: '考级', count: presetStats.certification },
                        ] as const).map((tab) => (
                          <button
                            key={tab.value}
                            className={`filter-chip ${presetType === tab.value ? 'active' : ''}`}
                            onClick={() => setPresetType(tab.value)}
                          >
                            <span>{tab.label}</span>
                            <span className="chip-divider">|</span>
                            <span className="tab-count">{tab.count}</span>
                          </button>
                        ))}
                      </div>
                      <div className="search-box">
                        <input
                          type="search"
                          className="form-control"
                          placeholder="搜索赛考名称或认证机构..."
                          value={presetSearch}
                          onChange={(e) => setPresetSearch(e.target.value)}
                        />
                        {presetSearch && (
                          <button
                            className="btn-clear"
                            onClick={() => setPresetSearch('')}
                            aria-label="清除搜索"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {arePresetsLoading ? (
                      <div className="loading">
                        <div className="spinner" role="status" aria-live="polite">加载中...</div>
                      </div>
                    ) : filteredPresets.length === 0 ? (
                      <div className="empty-state">
                        <p>🔎 暂无匹配的赛考，试着调整筛选条件</p>
                      </div>
                    ) : (
                      <div className="preset-card-list">
                        {filteredPresets.map((preset) => {
                          const eventCount = preset.events?.length || 0;
                          return (
                            <div key={preset._id} className="preset-card">
                              <div className="preset-card-body">
                                <div className="card-main">
                                  <div className="card-info">
                                    <span className={`chip chip-sm ${preset.type === 'competition' ? 'chip-warning' : 'chip-secondary'}`}>
                                      {preset.type === 'competition' ? '竞赛' : '考级'}
                                    </span>
                                    <div className="name-info">
                                      <div className="name-line">
                                        <span className="preset-name">{preset.name}</span>
                                        <span className="certifying-body">{preset.certifyingBody}</span>
                                      </div>
                                      <p className={`preset-desc ${preset.description ? '' : 'muted'}`}>
                                        {preset.description || '暂无描述信息'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="card-meta">
                                    <div className="event-count">
                                      <span className="event-count-value">{eventCount}</span>
                                      <span className="event-count-label">赛项</span>
                                    </div>
                                    <span className="chip chip-sm">权重 {preset.weight || 1}</span>
                                    <div className="card-actions">
                                      <button
                                        className="btn btn-icon"
                                        aria-label="编辑"
                                        onClick={() => handlePresetEdit(preset)}
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        className="btn btn-icon btn-danger"
                                        aria-label="删除"
                                        onClick={() => handlePresetDelete(preset._id || '')}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <hr className="divider" />
                                <div className="card-footer">
                                  {eventCount > 0 ? (
                                    <div className="event-badges">
                                      {preset.events?.slice(0, 4).map((event, index) => (
                                        <span key={`${preset._id}-event-${index}`} className="chip chip-sm">
                                          {event.name}
                                        </span>
                                      ))}
                                      {eventCount > 4 && (
                                        <span className="chip chip-sm">
                                          +{eventCount - 4}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="event-empty">暂无赛项</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {showAddExamForm && (
        <div className="modal-overlay" onClick={() => setShowAddExamForm(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPresetId ? '✏️ 编辑赛考' : '➕ 添加赛考'}</h2>
              <button
                className="btn btn-icon"
                onClick={() => setShowAddExamForm(false)}
                aria-label="关闭"
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
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setPresetFormData((prev) => ({
                            ...prev,
                            events: [...(prev.events || []), { name: '', description: '' }],
                          }));
                        }}
                        disabled={isPresetSubmitting}
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
                                />
                                <button
                                  className="btn btn-icon btn-danger"
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
                                  aria-label="删除"
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
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isPresetSubmitting}
                    >
                      {isPresetSubmitting ? '提交中...' : editingPresetId ? '更新赛考' : '创建赛考'}
                    </button>
                    {editingPresetId && (
                      <button
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

      {previewingCertId && (
        <div className="modal-overlay" onClick={() => setPreviewingCertId(null)}>
          <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📷 证书图片预览</h2>
              <button
                className="btn btn-icon"
                onClick={() => setPreviewingCertId(null)}
                aria-label="关闭"
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
                        {cert.examType && (
                          <div className="detail-item">
                            <span className="detail-label">赛考类型：</span>
                            <span className="detail-value">
                              {cert.examType === 'competition' ? '竞赛' : '考级'}
                            </span>
                          </div>
                        )}
                        {cert.examType === 'competition' && cert.competitionName && (
                          <div className="detail-item">
                            <span className="detail-label">竞赛名称：</span>
                            <span className="detail-value">{cert.competitionName}</span>
                          </div>
                        )}
                        {cert.examType === 'certification' && cert.certificationSeries && (
                          <div className="detail-item">
                            <span className="detail-label">考级系列：</span>
                            <span className="detail-value">{cert.certificationSeries}</span>
                          </div>
                        )}
                        {typeof cert.weight === 'number' && (
                          <div className="detail-item">
                            <span className="detail-label">权重：</span>
                            <span className="detail-value">{cert.weight}</span>
                          </div>
                        )}
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
