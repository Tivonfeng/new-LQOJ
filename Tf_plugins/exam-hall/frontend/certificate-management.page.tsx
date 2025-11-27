import './certificate-management.page.css';

import { UserSelectAutoComplete } from '@hydrooj/ui-default';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileAddOutlined,
  PlusOutlined,
  SearchOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { TabsProps } from 'antd';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Image,
  Input,
  message,
  Modal,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import $ from 'jquery';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import type { CertificateInfo, CertificatePreset } from './types';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

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
}

type CertificateTableRecord = CertificateInfo & {
  key: string;
  index: number;
};

const DEFAULT_LEVEL_OPTIONS = [
  { value: '初级', label: '初级' },
  { value: '中级', label: '中级' },
  { value: '高级', label: '高级' },
  { value: '专家', label: '专家' },
];

const COMPETITION_LEVEL_OPTIONS = [
  { value: '一等奖', label: '🥇 一等奖' },
  { value: '二等奖', label: '🥈 二等奖' },
  { value: '三等奖', label: '🥉 三等奖' },
];

const CERTIFICATION_LEVEL_OPTIONS = [
  { value: '通过', label: '✅ 通过' },
];

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

  const validateFile = (file: File): { valid: boolean, error?: string } => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: '文件大小不能超过 10MB' };
    }
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.type)) {
      return { valid: false, error: '仅支持 JPG、PNG、PDF 格式' };
    }
    return { valid: true };
  };

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      onUploadError?.(validation.error || '文件验证失败');
      return;
    }

    // 仅对图片生成预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFileSelected?.(file);
  };

  const isImage = value && !value.toLowerCase().includes('.pdf');
  const hasFile = value || preview || pendingUpload;

  return (
    <Upload
      accept="image/*,.pdf"
      beforeUpload={(file) => {
        if (disabled || isUploading) return Upload.LIST_IGNORE;
        handleFileSelect(file as File);
        return false;
      }}
      showUploadList={false}
      disabled={disabled || isUploading}
    >
      {isUploading ? (
        <div style={{ textAlign: 'center', padding: '12px', border: '1px dashed #d9d9d9', borderRadius: 6 }}>
          <Spin size="small" />
          <div style={{ marginTop: 8 }}>
            <Progress percent={Math.round(uploadProgress)} size="small" showInfo={false} />
          </div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            上传中...
          </Text>
        </div>
      ) : hasFile ? (
        <div style={{ textAlign: 'center', padding: '8px', border: '1px dashed #d9d9d9', borderRadius: 6 }}>
          {preview || (isImage && value) ? (
            <Image
              src={preview || value || ''}
              alt="证书预览"
              width={100}
              style={{ borderRadius: 4, display: 'block', margin: '0 auto 4px' }}
              preview={false}
            />
          ) : (
            <div style={{ fontSize: 24, marginBottom: 4 }}>📄</div>
          )}
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
            {pendingUpload ? '待上传' : '已选择'}
          </Text>
          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
            点击更换
          </Text>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px', border: '1px dashed #d9d9d9', borderRadius: 6, cursor: 'pointer' }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>📤</div>
          <Text style={{ display: 'block', fontSize: 12, marginBottom: 2 }}>点击上传</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>
            JPG/PNG/PDF，最大 10MB
          </Text>
        </div>
      )}
    </Upload>
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
  level: 'city' | 'province' | 'national' | 'international';
  description: string;
  events: ExamEventData[];
}

/**
 * 获取级别文本
 */
const getLevelText = (level: string): string => {
  if (level === 'city') return '市级';
  if (level === 'province') return '省级';
  if (level === 'national') return '国级';
  if (level === 'international') return '国际级';
  return '未知';
};

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
  });
  const [pendingCertificateFile, setPendingCertificateFile] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  // Modal 状态管理
  const [showAddCertificateModal, setShowAddCertificateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'certificates' | 'exams'>('certificates');
  const [showAddExamForm, setShowAddExamForm] = useState(false);

  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [presets, setPresets] = useState<CertificatePreset[]>([]);
  const [allPresets, setAllPresets] = useState<CertificatePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  // 筛选条件
  const [filters, setFilters] = useState({
    username: '',
    certificateName: '',
    category: '',
    certifyingBody: '',
  });
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presetType, setPresetType] = useState<'all' | 'competition' | 'certification'>('all');
  const [presetSearch, setPresetSearch] = useState('');
  const [presetFormData, setPresetFormData] = useState<PresetFormData>({
    type: 'competition',
    name: '',
    certifyingBody: '',
    level: 'city',
    description: '',
    events: [],
  });
  const [isPresetSubmitting, setIsPresetSubmitting] = useState(false);
  const [previewingCertId, setPreviewingCertId] = useState<string | null>(null);
  const [arePresetsLoading, setArePresetsLoading] = useState(false);
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset._id === formData.presetId),
    [presets, formData.presetId],
  );

  // 证书统计数据
  const certificateStats = useMemo(() => {
    const total = certificates.length;
    const active = certificates.filter((cert) => cert.status === 'active').length;
    return { total, active };
  }, [certificates]);

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

  const filteredCertificates = useMemo(() => {
    // 进行筛选
    let filtered = [...certificates];

    if (filters.username.trim()) {
      const usernameFilter = filters.username.trim().toLowerCase();
      filtered = filtered.filter((cert) => {
        const username = (cert.username || '').toLowerCase();
        const uid = String(cert.uid || '');
        return username.includes(usernameFilter) || uid.includes(usernameFilter);
      });
    }

    if (filters.certificateName.trim()) {
      const nameFilter = filters.certificateName.trim().toLowerCase();
      filtered = filtered.filter((cert) =>
        (cert.certificateName || '').toLowerCase().includes(nameFilter),
      );
    }

    if (filters.category.trim()) {
      const categoryFilter = filters.category.trim().toLowerCase();
      filtered = filtered.filter((cert) =>
        (cert.category || '').toLowerCase().includes(categoryFilter),
      );
    }

    if (filters.certifyingBody.trim()) {
      const bodyFilter = filters.certifyingBody.trim().toLowerCase();
      filtered = filtered.filter((cert) =>
        (cert.certifyingBody || '').toLowerCase().includes(bodyFilter),
      );
    }

    return filtered;
  }, [certificates, filters]);

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
            getLevelText(preset.level),
          ].some((field) => (field ? field.toLowerCase().includes(search) : false));
        return typeMatch && searchMatch;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN'));
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
    const warn = (text: string) => {
      messageApi.warning(text);
      return false;
    };
    if (!presetFormData.type) {
      return warn('请选择赛考类型');
    }
    if (!presetFormData.name.trim()) {
      return warn('请输入赛考名称');
    }
    if (!presetFormData.certifyingBody.trim()) {
      return warn('请输入认证机构');
    }
    if (!presetFormData.level) {
      return warn('请选择级别');
    }
    if (!presetFormData.events || presetFormData.events.length === 0) {
      return warn('请添加至少一个赛项');
    }
    if (presetFormData.events.some((event) => !event.name.trim())) {
      return warn('赛项名称不能为空');
    }

    return true;
  };

  const handlePresetInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setPresetFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePresetSubmit = async () => {
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
        level: presetFormData.level,
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
          level: 'city',
          description: '',
          events: [],
        });
        setEditingPresetId(null);
        await fetchAllPresets();
        await fetchPresets(presetType === 'all' ? undefined : presetType);
        messageApi.success(editingPresetId ? '赛考已更新' : '赛考已创建');
        setShowAddExamForm(false);
      } else {
        const errorMessage = data.error || '操作失败';
        console.error('预设保存失败:', errorMessage);
        messageApi.error(errorMessage);
      }
    } catch (error) {
      console.error('预设保存失败:', error);
      messageApi.error('赛考保存失败，请稍后重试');
    } finally {
      setIsPresetSubmitting(false);
    }
  };

  const handlePresetDelete = (id: string) => {
    if (!id) return;
    modalApi.confirm({
      title: '确定要删除这个赛考吗？',
      content: '删除后将无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`/exam/admin/presets/${id}`, {
            method: 'DELETE',
          });
          const data = await response.json();
          if (data.success) {
            await fetchAllPresets();
            await fetchPresets(presetType === 'all' ? undefined : presetType);
            messageApi.success('赛考已删除');
          } else {
            const errorMessage = data.error || '删除失败';
            console.error('预设删除失败:', errorMessage);
            messageApi.error(errorMessage);
          }
        } catch (error) {
          console.error('预设删除失败:', error);
          messageApi.error('赛考删除失败，请稍后重试');
        }
      },
    });
  };

  const handlePresetEdit = (preset: CertificatePreset) => {
    setPresetFormData({
      type: preset.type,
      name: preset.name,
      certifyingBody: preset.certifyingBody,
      level: preset.level,
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
    if (activeTab === 'exams') {
      fetchAllPresets();
    }
  }, [activeTab]);

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
      examType: preset.type,
      competitionName: preset.type === 'competition'
        ? preset.name
        : '',
      certificationSeries: preset.type === 'certification'
        ? preset.name
        : '',
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
    messageApi.error(error);
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
    });
    setPendingCertificateFile(null);
    setFileUploadProgress(0);
    setIsFileUploading(false);
    setFormErrors({});
    // 清理UserSelectAutoComplete
    if (userSelectComponentRef.current) {
      try {
        userSelectComponentRef.current.clear();
      } catch (error) {
        console.warn('Failed to clear UserSelectAutoComplete:', error);
      }
    }
  };

  /**
   * 验证表单字段
   * @param fieldName 可选，如果提供则只验证该字段
   * @returns 验证是否通过
   */
  const validateForm = (fieldName?: string): boolean => {
    const errors: Record<string, string> = {};

    // 如果指定了字段名，只验证该字段
    if (fieldName) {
      switch (fieldName) {
        case 'username':
          if (!formData.username.trim()) {
            errors.username = '请选择用户';
          }
          break;
        case 'presetId':
          if (!formData.presetId) {
            errors.presetId = '请选择赛考预设';
          }
          break;
        case 'event':
          if (!formData.event.trim()) {
            errors.event = '请选择赛项';
          }
          break;
        case 'level':
          if (!formData.level.trim()) {
            errors.level = '请选择证书等级';
          }
          break;
        case 'issueDate':
          if (!formData.issueDate) {
            errors.issueDate = '请选择颁发日期';
          } else {
            const issueDate = new Date(formData.issueDate);
            if (issueDate > new Date()) {
              errors.issueDate = '颁发日期不能是未来日期';
            }
          }
          break;
        case 'certificateImage':
          if (!formData.certificateImageUrl && !pendingCertificateFile) {
            errors.certificateImage = '请上传证书材料';
          }
          break;
      }
      setFormErrors((prev) => ({ ...prev, ...errors }));
      return Object.keys(errors).length === 0;
    }

    // 验证所有字段
    if (!formData.username.trim()) {
      errors.username = '请选择用户';
    }
    if (!formData.presetId) {
      errors.presetId = '请选择赛考预设';
    }
    if (!formData.event.trim()) {
      errors.event = '请选择赛项';
    }
    if (!formData.level.trim()) {
      errors.level = '请选择证书等级';
    }
    if (!formData.issueDate) {
      errors.issueDate = '请选择颁发日期';
    } else {
      const issueDate = new Date(formData.issueDate);
      if (issueDate > new Date()) {
        errors.issueDate = '颁发日期不能是未来日期';
      }
    }
    if (!formData.certificateImageUrl && !pendingCertificateFile) {
      errors.certificateImage = '请上传证书材料';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      // 显示第一个错误
      const firstError = Object.values(errors)[0];
      messageApi.warning(firstError);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单，如果失败则滚动到第一个错误字段
    if (!validateForm()) {
      // 延迟滚动，确保错误信息已渲染
      setTimeout(() => {
        const firstErrorField = document.querySelector('.form-field .ant-select-status-error, .form-field input.error, .ant-picker-status-error');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setIsSubmitting(true);
    let certificateImageUrl = formData.certificateImageUrl;
    let certificateImageKey = formData.certificateImageKey;

    // 如果有待上传的文件，先上传
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

    // 提交证书数据
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
        resetFormAndUser();
        setEditingId(null);
        await fetchCertificates();
        messageApi.success({
          content: editingId ? '证书已更新' : '证书已创建',
          duration: 2,
        });
        setShowAddCertificateModal(false);
      } else {
        const errorMessage = data.error || '操作失败';
        console.error('证书保存失败:', errorMessage);
        messageApi.error({
          content: errorMessage,
          duration: 4,
        });
        // 如果是字段验证错误，可以尝试解析并显示在对应字段
        if (errorMessage.includes('用户') || errorMessage.includes('username')) {
          setFormErrors((prev) => ({ ...prev, username: errorMessage }));
        } else if (errorMessage.includes('预设') || errorMessage.includes('preset')) {
          setFormErrors((prev) => ({ ...prev, presetId: errorMessage }));
        }
      }
    } catch (error) {
      console.error('证书保存失败:', error);
      const errorMessage = error instanceof Error ? error.message : '证书保存失败，请稍后重试';
      messageApi.error({
        content: errorMessage,
        duration: 4,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!id) return;
    modalApi.confirm({
      title: '确定要删除这个证书吗？',
      content: '删除后将无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`/exam/admin/certificates/${id}`, {
            method: 'DELETE',
          });
          const data = await response.json();
          if (data.success) {
            await fetchCertificates();
            messageApi.success('证书已删除');
          } else {
            const errorMessage = data.error || '删除失败';
            console.error('证书删除失败:', errorMessage);
            messageApi.error(errorMessage);
          }
        } catch (error) {
          console.error('证书删除失败:', error);
          messageApi.error('证书删除失败，请稍后重试');
        }
      },
    });
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
      issueDate: cert.issueDate ? dayjs(cert.issueDate).format('YYYY-MM-DD') : '',
      certificateImageUrl: cert.certificateImageUrl || '',
      certificateImageKey: cert.certificateImageKey || '',
      notes: cert.notes || '',
      examType: cert.examType || '',
      competitionName: cert.competitionName || '',
      certificationSeries: cert.certificationSeries || '',
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

  // 下载证书图片
  const handleDownloadCertificate = (cert: CertificateInfo) => {
    if (!cert.certificateImageUrl) {
      messageApi.warning('证书图片不存在');
      return;
    }

    try {
      // 创建一个临时链接来下载图片
      const link = document.createElement('a');
      link.href = cert.certificateImageUrl;
      const fileExtension = cert.certificateImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${cert.certificateName || 'certificate'}-${cert._id || Date.now()}.${fileExtension}`;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      messageApi.success('证书下载中...');
    } catch (error) {
      console.error('下载证书失败:', error);
      messageApi.error('下载证书失败，请稍后重试');
    }
  };

  const certificateColumns = useMemo<ColumnsType<CertificateTableRecord>>(() => [
    {
      title: '序号',
      dataIndex: 'index',
      width: 70,
      align: 'center',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      sorter: (a, b) => {
        const usernameA = (a.username || `#${a.uid}`).toLowerCase();
        const usernameB = (b.username || `#${b.uid}`).toLowerCase();
        return usernameA.localeCompare(usernameB, 'zh-Hans-CN');
      },
      render: (text, record) => text || `#${record.uid}`,
    },
    {
      title: '赛考名称',
      dataIndex: 'certificateName',
      sorter: (a, b) => {
        const nameA = (a.certificateName || '').toLowerCase();
        const nameB = (b.certificateName || '').toLowerCase();
        return nameA.localeCompare(nameB, 'zh-Hans-CN');
      },
      ellipsis: true,
    },
    {
      title: '赛项',
      dataIndex: 'category',
      sorter: (a, b) => {
        const categoryA = (a.category || '').toLowerCase();
        const categoryB = (b.category || '').toLowerCase();
        return categoryA.localeCompare(categoryB, 'zh-Hans-CN');
      },
      ellipsis: true,
    },
    {
      title: '主办单位',
      dataIndex: 'certifyingBody',
      sorter: (a, b) => {
        const bodyA = (a.certifyingBody || '').toLowerCase();
        const bodyB = (b.certifyingBody || '').toLowerCase();
        return bodyA.localeCompare(bodyB, 'zh-Hans-CN');
      },
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'issueDate',
      sorter: (a, b) => {
        const dateA = a.issueDate ? new Date(a.issueDate).getTime() : 0;
        const dateB = b.issueDate ? new Date(b.issueDate).getTime() : 0;
        return dateA - dateB;
      },
      render: (_, record) => {
        const parsed = dayjs(record.issueDate);
        return parsed.isValid() ? parsed.format('YYYY/MM/DD') : '日期未填写';
      },
    },
    {
      title: '权重',
      dataIndex: 'calculatedWeight',
      width: 100,
      align: 'center',
      sorter: (a, b) => {
        const weightA = typeof a.calculatedWeight === 'number' ? a.calculatedWeight : 0;
        const weightB = typeof b.calculatedWeight === 'number' ? b.calculatedWeight : 0;
        return weightA - weightB;
      },
      render: (value, record) => {
        if (typeof value === 'number') {
          return (
            <Tooltip
              title={
                record.weightBreakdown ? (
                  <div>
                    <div>基础权重: {record.weightBreakdown.baseWeight}分</div>
                    <div>级别系数: ×{record.weightBreakdown.levelFactor}</div>
                    <div>奖项系数: ×{record.weightBreakdown.awardFactor}</div>
                    <div>类型系数: ×{record.weightBreakdown.typeFactor}</div>
                    <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>
                      {record.weightBreakdown.calculation}
                    </div>
                  </div>
                ) : (
                  `权重: ${value.toFixed(2)}`
                )
              }
            >
              <Tag color="blue" style={{ cursor: 'help' }}>
                {value.toFixed(2)}
              </Tag>
            </Tooltip>
          );
        }
        return <Tag color="default">未计算</Tag>;
      },
    },
    {
      title: '证书图片',
      dataIndex: 'certificateImageUrl',
      render: (value, record) => (value ? (
        <Image
          width={64}
          src={value}
          alt={record.certificateName}
          preview={false}
          className="certificate-thumbnail"
          onClick={() => setPreviewingCertId(record._id || '')}
        />
      ) : (
        <Tag>暂无</Tag>
      )),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id || '')}
          />
        </Space>
      ),
    },
  ], [handleDelete, handleEdit]);

  // 更新分页总数
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      total: filteredCertificates.length,
    }));
  }, [filteredCertificates.length]);

  // 分页后的证书数据
  const certificateTableData = useMemo<CertificateTableRecord[]>(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredCertificates
      .slice(start, end)
      .map((cert, index) => ({
        ...cert,
        key: cert._id || `${cert.uid}-${index}`,
        index: start + index + 1,
      }));
  }, [filteredCertificates, pagination.current, pagination.pageSize]);

  const examFilterOptions = useMemo(() => ([
    { value: 'all', label: `全部 (${presetStats.total})` },
    { value: 'competition', label: `竞赛 (${presetStats.competition})` },
    { value: 'certification', label: `考级 (${presetStats.certification})` },
  ]), [presetStats.certification, presetStats.competition, presetStats.total]);

  const presetOptions = useMemo(() => presets.map((preset) => ({
    value: preset._id || '',
    label: `${preset.type === 'competition' ? '🏆' : '📚'} ${preset.name}`,
  })), [presets]);

  const eventOptions = useMemo(() => (
    selectedPreset?.events?.map((event) => ({
      value: event.name,
      label: event.name,
    })) || []
  ), [selectedPreset?.events]);

  const levelOptions = useMemo(() => {
    if (!selectedPreset) return DEFAULT_LEVEL_OPTIONS;
    if (selectedPreset.type === 'competition') return COMPETITION_LEVEL_OPTIONS;
    if (selectedPreset.type === 'certification') return CERTIFICATION_LEVEL_OPTIONS;
    return DEFAULT_LEVEL_OPTIONS;
  }, [selectedPreset]);

  const certificateTabContent = (
    <Card variant="borderless" className="tab-card">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space wrap size="middle" className="certificate-toolbar">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              resetFormAndUser();
              setEditingId(null);
              setShowAddCertificateModal(true);
            }}
          >
            添加证书
          </Button>
        </Space>

        {/* 筛选条件 */}
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              allowClear
              placeholder="筛选用户名"
              prefix={<SearchOutlined />}
              value={filters.username}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, username: e.target.value }));
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              allowClear
              placeholder="筛选赛考名称"
              prefix={<SearchOutlined />}
              value={filters.certificateName}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, certificateName: e.target.value }));
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              allowClear
              placeholder="筛选赛项"
              prefix={<SearchOutlined />}
              value={filters.category}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, category: e.target.value }));
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              allowClear
              placeholder="筛选主办单位"
              prefix={<SearchOutlined />}
              value={filters.certifyingBody}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, certifyingBody: e.target.value }));
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </Col>
        </Row>
        <Table<CertificateTableRecord>
          rowKey="key"
          columns={certificateColumns}
          dataSource={certificateTableData}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize,
              }));
            },
          }}
          loading={loading}
          scroll={{ x: 960 }}
          locale={{ emptyText: <Empty description="暂无证书数据" /> }}
          onChange={(paginationConfig, tableFilters, sorter) => {
            // 排序时重置到第一页
            if (sorter && 'order' in sorter) {
              setPagination((prev) => ({ ...prev, current: 1 }));
            }
          }}
        />
      </Space>
    </Card>
  );

  const examTabContent = (
    <Card variant="borderless" className="tab-card">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={[16, 16]} justify="space-between" align="middle">
          <Col flex="auto">
            <Space wrap size="middle">
              <Button
                type="primary"
                icon={<FileAddOutlined />}
                onClick={() => {
                  setEditingPresetId(null);
                  setPresetFormData({
                    type: 'competition',
                    name: '',
                    certifyingBody: '',
                    level: 'city',
                    description: '',
                    events: [],
                  });
                  setShowAddExamForm(true);
                }}
              >
                添加赛考
              </Button>
              <Segmented
                options={examFilterOptions}
                value={presetType}
                onChange={(value) => setPresetType(value as typeof presetType)}
              />
            </Space>
          </Col>
          <Col flex="320px">
            <Input
              allowClear
              placeholder="搜索赛考名称或认证机构..."
              prefix={<SearchOutlined />}
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
            />
          </Col>
        </Row>

        {arePresetsLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin tip="加载赛考预设..." />
          </div>
        ) : filteredPresets.length === 0 ? (
          <Empty description="暂无匹配的赛考，试着调整筛选条件" />
        ) : (
                    <Row gutter={[12, 12]}>
            {filteredPresets.map((preset) => {
              const eventCount = preset.events?.length || 0;
              return (
                <Col xs={24} md={12} xl={8} key={preset._id}>
                  <Card
                    className="preset-card"
                    title={preset.name}
                    extra={<Tag color="geekblue">{getLevelText(preset.level)}</Tag>}
                    actions={[
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handlePresetEdit(preset)}
                        key="edit"
                      />,
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handlePresetDelete(preset._id || '')}
                        key="delete"
                      />,
                    ]}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Tag color={preset.type === 'competition' ? 'gold' : 'purple'}>
                        {preset.type === 'competition' ? '竞赛' : '考级'}
                      </Tag>
                      <Text type="secondary">{preset.certifyingBody}</Text>
                      {preset.description && <Paragraph ellipsis={{ rows: 2 }}>{preset.description}</Paragraph>}
                      <div>
                        <Text type="secondary">赛项数量</Text>
                        <Title level={4} style={{ margin: 0 }}>
                          {eventCount}
                        </Title>
                      </div>
                      {eventCount > 0 && (
                        <Space wrap size="small">
                          {preset.events?.slice(0, 4).map((event, index) => (
                            <Tag key={`${preset._id}-event-${index}`} color="blue">
                              {event.name}
                            </Tag>
                          ))}
                          {eventCount > 4 && <Tag color="default">+{eventCount - 4} 更多</Tag>}
                        </Space>
                      )}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Space>
    </Card>
  );

  const tabItems: TabsProps['items'] = [
    {
      key: 'certificates',
      label: (
        <Space size={6}>
          <FileAddOutlined />
          <span>证书列表</span>
          <Tag color="blue">{certificateStats.total}</Tag>
        </Space>
      ),
      children: certificateTabContent,
    },
    {
      key: 'exams',
      label: (
        <Space size={6}>
          <TrophyOutlined />
          <span>赛考管理</span>
          <Tag color="purple">{presetStats.total}</Tag>
        </Space>
      ),
      children: examTabContent,
    },
  ];

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <div className="dashboard-hero" role="banner">
        <Title level={4}>📋 证书&赛考管理</Title>
      </div>

      <Tabs
        className="management-tabs"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'certificates' | 'exams')}
        items={tabItems}
      />

      <Modal
        open={showAddCertificateModal}
        onCancel={() => {
          if (!isSubmitting && !isFileUploading) {
            resetFormAndUser();
            setFormErrors({});
            setShowAddCertificateModal(false);
          }
        }}
        title={editingId ? '✏️ 编辑证书' : '➕ 添加证书'}
        width={520}
        footer={null}
        destroyOnClose
        maskClosable={!isSubmitting && !isFileUploading}
        className="compact-certificate-modal ultra-compact"
      >
        <form id="certificate-form" onSubmit={handleSubmit} className="certificate-form compact-form" noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="form-field">
              <label>选择赛考 *</label>
              <Select
                value={formData.presetId || undefined}
                placeholder="请选择赛考预设"
                disabled={isSubmitting}
                showSearch
                optionFilterProp="label"
                status={formErrors.presetId ? 'error' : undefined}
                options={presetOptions}
                dropdownMatchSelectWidth={false}
                dropdownStyle={{ minWidth: '400px', maxWidth: '500px' }}
                listHeight={300}
                onChange={(value) => {
                  const matchedPreset = presets.find((p) => p._id === value);
                  if (matchedPreset) {
                    handlePresetSelect(matchedPreset);
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      presetId: '',
                      presetName: '',
                      certifyingBody: '',
                      event: '',
                      examType: '',
                      competitionName: '',
                      certificationSeries: '',
                    }));
                  }
                  if (formErrors.presetId) {
                    setFormErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.presetId;
                      return newErrors;
                    });
                  }
                }}
              />
              {formErrors.presetId && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                  {formErrors.presetId}
                </div>
              )}
            </div>

            {selectedPreset && (
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '8px',
                padding: '6px 8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                <span style={{ color: '#666' }}>认证机构：</span>
                <span style={{ fontWeight: 500 }}>{formData.certifyingBody}</span>
                <span style={{ color: '#999', margin: '0 4px' }}>|</span>
                <span style={{ color: '#666' }}>类型：</span>
                <Tag
                  color={formData.examType === 'competition' ? 'gold' : 'purple'}
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    lineHeight: '18px',
                    padding: '0 6px',
                  }}
                >
                  {formData.examType === 'competition' ? '竞赛' : '考级'}
                </Tag>
                <span style={{ color: '#999', margin: '0 4px' }}>|</span>
                <span style={{ color: '#666' }}>级别：</span>
                <Tag
                  color="blue"
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    lineHeight: '18px',
                    padding: '0 6px',
                  }}
                >
                  {getLevelText(selectedPreset.level)}
                </Tag>
              </div>
            )}

            <div className="form-field">
              <label>选择用户 *</label>
              <input
                ref={userInputRef}
                type="text"
                className={`eui-form-control ${formErrors.username ? 'error' : ''}`}
                placeholder="搜索用户名..."
                value={formData.username}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }));
                  if (formErrors.username) {
                    setFormErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.username;
                      return newErrors;
                    });
                  }
                }}
                disabled={isSubmitting}
              />
              {formErrors.username && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                  {formErrors.username}
                </div>
              )}
            </div>

            <Row gutter={6}>
              <Col span={12}>
                <div className="form-field">
                  <label>赛项 *</label>
                  <Select
                    placeholder={selectedPreset ? '请选择赛项' : '请先选择赛考预设'}
                    value={formData.event || undefined}
                    disabled={
                      isSubmitting
                      || !selectedPreset
                      || !selectedPreset.events
                      || selectedPreset.events.length === 0
                    }
                    status={formErrors.event ? 'error' : undefined}
                    options={eventOptions}
                    dropdownMatchSelectWidth={false}
                    dropdownStyle={{ minWidth: '250px' }}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        event: value,
                      }));
                      if (formErrors.event) {
                        setFormErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.event;
                          return newErrors;
                        });
                      }
                    }}
                  />
                  {formErrors.event && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.event}
                    </div>
                  )}
                </div>
              </Col>
              <Col span={12}>
                <div className="form-field">
                  <label>证书等级 *</label>
                  <Select
                    placeholder="请选择等级"
                    value={formData.level || undefined}
                    disabled={isSubmitting}
                    status={formErrors.level ? 'error' : undefined}
                    options={levelOptions}
                    dropdownMatchSelectWidth={false}
                    dropdownStyle={{ minWidth: '200px' }}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        level: value,
                      }));
                      if (formErrors.level) {
                        setFormErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.level;
                          return newErrors;
                        });
                      }
                    }}
                  />
                  {formErrors.level && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.level}
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            <div className="form-field">
              <label>颁发日期 *</label>
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                value={formData.issueDate ? dayjs(formData.issueDate) : null}
                disabled={isSubmitting}
                status={formErrors.issueDate ? 'error' : undefined}
                onChange={(date) => {
                  setFormData((prev) => ({
                    ...prev,
                    issueDate: date ? date.format('YYYY-MM-DD') : '',
                  }));
                  if (formErrors.issueDate) {
                    setFormErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.issueDate;
                      return newErrors;
                    });
                  }
                }}
              />
              {formErrors.issueDate && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                  {formErrors.issueDate}
                </div>
              )}
            </div>

            <div className="form-field">
              <label>证书材料 *</label>
              <CertificateUploader
                value={formData.certificateImageUrl}
                onFileSelected={(file) => {
                  setPendingCertificateFile(file);
                  setFormData((prev) => ({
                    ...prev,
                    certificateImageUrl: '',
                    certificateImageKey: '',
                  }));
                  if (formErrors.certificateImage) {
                    setFormErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.certificateImage;
                      return newErrors;
                    });
                  }
                }}
                onUploadError={handleUploadError}
                disabled={isSubmitting || isFileUploading}
                isUploading={isFileUploading}
                uploadProgress={fileUploadProgress}
                pendingUpload={Boolean(pendingCertificateFile)}
              />
              {formErrors.certificateImage && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>
                  {formErrors.certificateImage}
                </div>
              )}
            </div>

            <div className="form-field">
              <label>备注</label>
              <TextArea
                id="notes"
                name="notes"
                value={formData.notes}
                placeholder="输入备注信息（可选）"
                rows={2}
                disabled={isSubmitting}
                onChange={(e) => handleInputChange(e as any)}
              />
            </div>
          </div>
          <div className="modal-actions">
            <Space>
              <Button
                onClick={() => {
                  if (!isSubmitting && !isFileUploading) {
                    resetFormAndUser();
                    setEditingId(null);
                    setShowAddCertificateModal(false);
                  }
                }}
                disabled={isSubmitting || isFileUploading}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                form="certificate-form"
                loading={isSubmitting || isFileUploading}
              >
                {isFileUploading ? '上传中...' : editingId ? '更新证书' : '创建证书'}
              </Button>
            </Space>
          </div>
        </form>
      </Modal>

      <Modal
        open={showAddExamForm}
        onCancel={() => setShowAddExamForm(false)}
        title={editingPresetId ? '✏️ 编辑赛考' : '➕ 添加赛考'}
        width={480}
        footer={null}
        destroyOnHidden
        maskClosable={false}
      >
        <Form
          layout="vertical"
          onFinish={handlePresetSubmit}
          initialValues={presetFormData}
          size="small"
        >
          <Form.Item
            label="赛考类型 *"
            name="type"
            rules={[{ required: true, message: '请选择赛考类型' }]}
            style={{ marginBottom: 12 }}
          >
            <Select
              size="small"
              value={presetFormData.type}
              onChange={(value) => {
                setPresetFormData((prev) => ({ ...prev, type: value as 'competition' | 'certification' }));
              }}
              disabled={isPresetSubmitting || editingPresetId !== null}
              options={[
                { value: 'competition', label: '竞赛' },
                { value: 'certification', label: '考级' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="赛考名称 *"
            name="name"
            rules={[{ required: true, message: '请输入赛考名称' }]}
            style={{ marginBottom: 12 }}
          >
            <Input
              size="small"
              value={presetFormData.name}
              onChange={handlePresetInputChange}
              placeholder={presetFormData.type === 'competition' ? '例如：全国信息学竞赛' : '例如：Python等级考试'}
              disabled={isPresetSubmitting}
            />
          </Form.Item>

          <Form.Item
            label="认证机构 *"
            name="certifyingBody"
            rules={[{ required: true, message: '请输入认证机构' }]}
            style={{ marginBottom: 12 }}
          >
            <Input
              size="small"
              value={presetFormData.certifyingBody}
              onChange={handlePresetInputChange}
              placeholder="例如：全国青少年信息学奥林匹克竞赛委员会"
              disabled={isPresetSubmitting}
            />
          </Form.Item>

          <Form.Item
            label="级别 *"
            name="level"
            rules={[{ required: true, message: '请选择级别' }]}
            style={{ marginBottom: 12 }}
          >
            <Select
              size="small"
              value={presetFormData.level}
              onChange={(value) => {
                setPresetFormData((prev) => ({ ...prev, level: value as typeof prev.level }));
              }}
              disabled={isPresetSubmitting}
              options={[
                { value: 'city', label: '市级' },
                { value: 'province', label: '省级' },
                { value: 'national', label: '国级' },
                { value: 'international', label: '国际级' },
              ]}
            />
          </Form.Item>

          <Form.Item label="描述" name="description" style={{ marginBottom: 12 }}>
            <TextArea
              size="small"
              value={presetFormData.description}
              onChange={handlePresetInputChange}
              placeholder="输入赛考的描述信息（可选）"
              rows={2}
              disabled={isPresetSubmitting}
            />
          </Form.Item>

          <Form.Item
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>赛项 *</span>
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setPresetFormData((prev) => ({
                      ...prev,
                      events: [...(prev.events || []), { name: '', description: '' }],
                    }));
                  }}
                  disabled={isPresetSubmitting}
                >
                  添加赛项
                </Button>
              </div>
            }
            required
            style={{ marginBottom: 12 }}
          >
            {presetFormData.events && presetFormData.events.length > 0 ? (
              <Card size="small" style={{ backgroundColor: '#fafafa', padding: '8px' }}>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {presetFormData.events.map((event, index) => (
                    <div key={index} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <Input
                        size="small"
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
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
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
                      />
                    </div>
                  ))}
                </Space>
              </Card>
            ) : (
              <Empty
                description='请点击"添加赛项"按钮添加至少一个赛项'
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '12px 0' }}
              />
            )}
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                size="small"
                htmlType="submit"
                loading={isPresetSubmitting}
              >
                {editingPresetId ? '更新赛考' : '创建赛考'}
              </Button>
              {editingPresetId && (
                <Button
                  size="small"
                  onClick={() => {
                    setEditingPresetId(null);
                    setPresetFormData({
                      type: 'competition',
                      name: '',
                      certifyingBody: '',
                      level: 'city',
                      description: '',
                      events: [],
                    });
                  }}
                  disabled={isPresetSubmitting}
                >
                  取消编辑
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(previewingCertId)}
        onCancel={() => setPreviewingCertId(null)}
        title="📷 证书图片预览"
        width="90%"
        style={{ maxWidth: 1200 }}
        footer={null}
        destroyOnHidden
        centered
      >
        {(() => {
          const cert = certificates.find((c) => c._id === previewingCertId);
          if (!cert || !cert.certificateImageUrl) return null;
          return (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <img
                src={cert.certificateImageUrl}
                alt={cert.certificateName || '证书图片'}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  marginBottom: '20px',
                }}
              />
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="large"
                onClick={() => handleDownloadCertificate(cert)}
              >
                下载证书
              </Button>
            </div>
          );
        })()}
      </Modal>
    </>
  );
};

// 初始化React组件到DOM
if (document.getElementById('certificate-management-root')) {
  const root = createRoot(document.getElementById('certificate-management-root')!);
  root.render(<CertificateManagement />);
}

export default CertificateManagement;
