/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Space,
  Switch,
  Tag,
} from 'antd';
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

// 简化为本地文本域，后台渲染时再走 Markdown 解析，避免运行时加载问题

interface TaskView {
  id: string;
  title: string;
  description: string;
  answerCode?: string;
  isPublished: boolean;
  order: number;
  updatedAt?: string;
  createdAt?: string;
}

interface AdminData {
  tasks: TaskView[];
}

const TaskAdmin: React.FC<AdminData> = ({ tasks }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskView | null>(null);
  const [form] = Form.useForm<TaskView>();

  const orderedTasks = useMemo(
    () => [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [tasks],
  );

  const openModal = (task?: TaskView) => {
    setEditingTask(task || null);
    setModalOpen(true);
    form.setFieldsValue(
      task || {
        title: '',
        description: '',
        answerCode: '',
        isPublished: true,
        order: Date.now(),
      },
    );
  };

  const submitTask = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      const payload = {
        ...values,
        action: editingTask ? 'update' : 'create',
        taskId: editingTask?.id,
      };
      const resp = await fetch('/turtle/course-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success) {
        message.success('任务保存成功');
        window.location.reload();
      } else {
        message.error(data.message || '保存失败');
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    Modal.confirm({
      title: '确认删除任务？',
      content: '该操作将删除任务及其所有学员进度，确定继续？',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const resp = await fetch('/turtle/course-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', taskId }),
          });
          const data = await resp.json();
          if (data.success) {
            message.success('任务已删除');
            window.location.reload();
          } else {
            message.error(data.message || '删除失败');
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败');
        }
      },
    });
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 64px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>🐢 Turtle 课程任务管理</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>创建任务并追踪学员进度。</p>
        </div>
        <Button type="primary" onClick={() => openModal()}>
          新建任务
        </Button>
      </header>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {orderedTasks.map((task) => (
          <Card
            key={task.id}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>{task.title}</span>
                <Tag color={task.isPublished ? 'green' : 'default'}>
                  {task.isPublished ? '已发布' : '草稿'}
                </Tag>
              </div>
            }
            extra={
              <Space>
                <Button size="small" onClick={() => openModal(task)}>
                  编辑
                </Button>
                <Button size="small" danger onClick={() => deleteTask(task.id)}>
                  删除
                </Button>
              </Space>
            }
          >
            <p style={{ whiteSpace: 'pre-line', marginBottom: 12 }}>{task.description}</p>
          </Card>
        ))}

        {orderedTasks.length === 0 && (
          <Card>
            <p style={{ margin: 0, color: '#6b7280' }}>尚未创建任何任务，点击右上角“新建任务”开始。</p>
          </Card>
        )}
      </Space>

      <Modal
        title={editingTask ? '编辑任务' : '新建任务'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submitTask}
        confirmLoading={confirmLoading}
        width={720}
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入任务标题' }]}>
            <Input placeholder="如：用循环绘制多边形" />
          </Form.Item>
          <Form.Item
            name="description"
            label="任务描述 / 要求"
            rules={[{ required: true, message: '请输入任务描述' }]}
            valuePropName="value"
            getValueFromEvent={(v) => v}
          >
            <Input.TextArea rows={6} placeholder="支持 Markdown，提交后后台渲染" />
          </Form.Item>
          <Form.Item name="answerCode" label="参考答案代码">
            <Input.TextArea rows={6} placeholder="仅教师可见的参考答案代码" />
          </Form.Item>
          <Form.Item name="order" label="排序值">
            <Input type="number" placeholder="数字越小越靠前" />
          </Form.Item>
          <Form.Item name="isPublished" label="是否发布" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

addPage(
  new NamedPage(['turtle_course_admin'], async () => {
    const container = document.getElementById('turtle-course-admin-app');
    const dataElement = document.getElementById('turtle-course-admin-data');
    if (!container || !dataElement) return;
    try {
      const data: AdminData = JSON.parse(dataElement.textContent || '{}');
      const root = createRoot(container);
      root.render(<TaskAdmin {...data} />);
    } catch (error) {
      console.error('[TurtleCourseAdmin] Failed to bootstrap page', error);
    }
  }),
);
