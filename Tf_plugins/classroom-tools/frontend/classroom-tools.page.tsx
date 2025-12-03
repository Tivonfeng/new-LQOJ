import './classroom-tools.page.css';

import {
  PlayCircleOutlined,
  RedoOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  message,
  Row,
  Space,
  Switch,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ApiResponse, ClassroomToolsData, RandomNumberConfig, RandomNumberResult } from './types';

const { Title, Text } = Typography;

const ClassroomToolsApp: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [form] = Form.useForm();
  const rollIntervalsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const toolsData = (window as any).classroomToolsData as ClassroomToolsData;
    console.log('Classroom tools data loaded:', toolsData);
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      rollIntervalsRef.current.forEach(clearInterval);
    };
  }, []);

  const getRandomNumber = useCallback((min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }, []);

  const handleStart = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const config: RandomNumberConfig = {
        min: values.min,
        max: values.max,
        count: values.count,
        allowDuplicate: values.allowDuplicate ?? true,
      };

      if (config.min > config.max) {
        message.error('最小值不能大于最大值');
        return;
      }

      // Start rolling animation
      setRolling(true);
      setResults([]);

      const tempNumbers = Array.from({ length: config.count }, () => 0);
      setResults(tempNumbers);

      // Clear old intervals
      rollIntervalsRef.current.forEach(clearInterval);
      rollIntervalsRef.current = [];

      // Create rolling intervals for each number
      for (let i = 0; i < config.count; i++) {
        const interval = setInterval(() => {
          setResults((prev) => {
            const newResults = [...prev];
            newResults[i] = getRandomNumber(config.min, config.max);
            return newResults;
          });
        }, 50);
        rollIntervalsRef.current.push(interval);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [form, getRandomNumber]);

  const handleStop = useCallback(async () => {
    if (!rolling) return;

    try {
      // Stop all intervals
      rollIntervalsRef.current.forEach(clearInterval);
      rollIntervalsRef.current = [];

      const values = form.getFieldsValue();
      const config: RandomNumberConfig = {
        min: values.min,
        max: values.max,
        count: values.count,
        allowDuplicate: values.allowDuplicate ?? true,
      };

      setLoading(true);

      // Fetch final results from server
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'random_number',
          ...config,
        }),
      });

      const result: ApiResponse<RandomNumberResult> = await response.json();

      if (result.success && result.data) {
        // Display final numbers with stagger animation
        result.data.numbers.forEach((num, index) => {
          setTimeout(() => {
            setResults((prev) => {
              const newResults = [...prev];
              newResults[index] = num;
              return newResults;
            });
          }, index * 100);
        });
        message.success('生成完成');
      } else {
        message.error(result.message || '生成失败');
      }
    } catch (error) {
      message.error('请求失败，请重试');
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRolling(false);
    }
  }, [rolling, form]);

  const handleReset = useCallback(() => {
    // Stop rolling if active
    rollIntervalsRef.current.forEach(clearInterval);
    rollIntervalsRef.current = [];

    setRolling(false);
    setResults([]);
    form.resetFields();
    message.info('已重置');
  }, [form]);

  // Keyboard shortcut: Space to start/stop
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (rolling) {
          handleStop();
        } else {
          handleStart();
        }
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [rolling, handleStart, handleStop]);

  return (
        <div className="classroom-tools-wrapper">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-icon">
                    <ThunderboltOutlined />
                </div>
                <Title level={2} className="hero-title">
                    课堂工具
                </Title>
                <Text className="hero-subtitle">为课堂活动生成随机数字</Text>
            </div>

            {/* Main Content */}
            <div className="main-container">
                <Row gutter={20} style={{ height: '100%' }}>
                    {/* Control Panel */}
                    <Col xs={24} lg={10} xl={8}>
                        <Card className="control-panel" title="参数设置" bordered={false}>
                            <Form
                                form={form}
                                layout="vertical"
                                initialValues={{
                                  min: 1,
                                  max: 10,
                                  count: 1,
                                  allowDuplicate: false,
                                }}
                            >
                                <Form.Item
                                    label="最小值"
                                    name="min"
                                    rules={[{ required: true, message: '请输入最小值' }]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        size="large"
                                        disabled={rolling}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="最大值"
                                    name="max"
                                    rules={[{ required: true, message: '请输入最大值' }]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        size="large"
                                        disabled={rolling}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="数量"
                                    name="count"
                                    rules={[{ required: true, message: '请输入数量' }]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        size="large"
                                        min={1}
                                        max={50}
                                        disabled={rolling}
                                    />
                                </Form.Item>

                                <Form.Item label="允许重复" name="allowDuplicate" valuePropName="checked">
                                    <Switch disabled={rolling} />
                                </Form.Item>
                            </Form>

                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                {!rolling ? (
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<PlayCircleOutlined />}
                                        onClick={handleStart}
                                        block
                                    >
                                        开始摇号
                                    </Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        danger
                                        size="large"
                                        icon={<StopOutlined />}
                                        onClick={handleStop}
                                        loading={loading}
                                        block
                                    >
                                        停止摇号
                                    </Button>
                                )}

                                <Button
                                    size="large"
                                    icon={<RedoOutlined />}
                                    onClick={handleReset}
                                    block
                                >
                                    重新开始
                                </Button>

                                <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                                    按空格键开始/停止
                                </Text>
                            </Space>
                        </Card>
                    </Col>

                    {/* Results Panel */}
                    <Col xs={24} lg={14} xl={16}>
                        <Card className="results-panel" title="结果显示" bordered={false}>
                            {results.length === 0 ? (
                                <div className="results-empty">
                                    <Text type="secondary">点击开始按钮开始摇号</Text>
                                </div>
                            ) : (
                                <div className="results-grid">
                                    {results.map((num, index) => (
                                        <div
                                            key={index}
                                            className={`number-badge ${rolling ? 'rolling' : 'final'}`}
                                        >
                                            {num}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
  );
};

// React App 挂载
const container = document.getElementById('classroom-tools-react-app');
if (container) {
  const root = createRoot(container);
  root.render(<ClassroomToolsApp />);
}

export default ClassroomToolsApp;
