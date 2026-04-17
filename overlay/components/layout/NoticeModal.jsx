import React, { useEffect, useState } from 'react';
import { Modal, Button } from '@douyinfe/semi-ui';
import { marked } from 'marked';
import { API, showError } from '../../helpers';

const NoticeModal = ({ visible, onClose, isMobile }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!visible) return;
    API.get('/api/notice').then((res) => {
      const { success, message, data } = res.data;
      if (success && data) {
        setContent(marked.parse(data));
      } else if (!success) {
        showError(message);
      }
    });
  }, [visible]);

  const handleTodayClose = () => {
    localStorage.setItem('notice_close_date', new Date().toDateString());
    onClose();
  };

  return (
    <Modal
      title={<span>📢 系统公告</span>}
      visible={visible}
      onCancel={onClose}
      size={isMobile ? 'full-width' : 'medium'}
      footer={
        <div className='flex justify-end gap-2'>
          <Button type='tertiary' onClick={handleTodayClose}>
            今日不再显示
          </Button>
          <Button
            onClick={onClose}
            style={{ background: '#c4956a', color: '#fff', border: 'none' }}
          >
            我知道了
          </Button>
        </div>
      }
    >
      <div
        className='overflow-y-auto pr-1'
        style={{ maxHeight: '60vh', lineHeight: 1.7, fontSize: 14, color: '#333' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </Modal>
  );
};

export default NoticeModal;
