/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext, useEffect, useState } from 'react';
import {
  Button,
  Typography,
  Input,
  ScrollList,
  ScrollItem,
} from '@douyinfe/semi-ui';
import { API, showError, copy, showSuccess } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import {
  IconGithubLogo,
  IconPlay,
  IconFile,
  IconCopy,
} from '@douyinfe/semi-icons';
import { Link, useNavigate } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import {
  Moonshot,
  OpenAI,
  XAI,
  Zhipu,
  Volcengine,
  Cohere,
  Claude,
  Gemini,
  Suno,
  Minimax,
  Wenxin,
  Spark,
  Qingyan,
  DeepSeek,
  Qwen,
  Midjourney,
  Grok,
  AzureAI,
  Hunyuan,
  Xinference,
} from '@lobehub/icons';

const { Text } = Typography;

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const navigate = useNavigate();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;
  const docsLink = statusState?.status?.docs_link || '';
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS.map((e) => ({ value: e }));
  const [endpointIndex, setEndpointIndex] = useState(0);
  const isChinese = i18n.language.startsWith('zh');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      // 如果内容是 URL，则发送主题模式
      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  const handleCopyEndpoint = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='flash-home'>
          <div className='flash-bg-grid'></div>
          <div className='flash-bg-glow'></div>

          {/* Hero Section */}
          <section style={{ textAlign: 'center', padding: '100px 32px 48px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '100px', border: '1px solid var(--flash-border)', background: 'rgba(6,182,212,0.05)', fontSize: '12px', color: 'var(--flash-cyan-light)', fontWeight: 500, marginBottom: '24px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--flash-cyan)', boxShadow: '0 0 8px var(--flash-cyan)', animation: 'flash-pulse 2s ease-in-out infinite' }}></span>
              {t('统一 AI 网关 — 支持 40+ 供应商')}
            </div>
            <h1 style={{ fontSize: isMobile ? '36px' : '52px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '16px', background: 'linear-gradient(135deg, #fff 0%, var(--flash-cyan-light) 50%, var(--flash-blue) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {t('一个 API')}<br/>{t('所有模型')}
            </h1>
            <p style={{ fontSize: isMobile ? '15px' : '18px', color: 'var(--flash-text-muted)', maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.6 }}>
              {t('通过一个闪电般快速的端点，访问 OpenAI、Claude、Gemini、DeepSeek 等 40+ AI 供应商。兼容 OpenAI 接口，零迁移成本。')}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button theme='solid' type='primary' size={isMobile ? 'default' : 'large'} onClick={() => navigate('/console')} style={{ borderRadius: '8px', padding: '12px 28px', fontSize: '15px' }}>
                {t('获取密钥')} →
              </Button>
              <Button size={isMobile ? 'default' : 'large'} onClick={() => window.open(docsLink || '/docs')} style={{ borderRadius: '8px', padding: '12px 28px', fontSize: '15px' }}>
                {t('查看文档')}
              </Button>
            </div>
          </section>

          {/* Bento Grid - Part 1 */}
          <section className='flash-bento'>
            {/* Card 1: Terminal (span 2) */}
            <div className='flash-card span-2'>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--flash-cyan)', marginBottom: '12px' }}>{t('实时演示')}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--flash-text-primary)', marginBottom: '8px' }}>{t('即刻体验')}</div>
              <div style={{ background: 'var(--flash-bg-code)', border: '1px solid var(--flash-border)', borderRadius: '10px', marginTop: '16px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid var(--flash-border)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }}></div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                </div>
                <div className='mono' style={{ padding: '14px', fontSize: isMobile ? '11px' : '12px', lineHeight: 1.8, color: 'var(--flash-text-dim)', overflowX: 'auto' }}>
                  <div><span style={{ color: 'var(--flash-cyan)' }}>$</span> <span style={{ color: 'var(--flash-text-dim)' }}>curl -X POST</span> <span style={{ color: 'var(--flash-blue)' }}>{serverAddress}/v1/chat/completions</span> \</div>
                  <div>&nbsp;&nbsp;<span style={{ color: 'var(--flash-text-dim)' }}>-H</span> <span style={{ color: 'var(--flash-cyan-light)' }}>"Authorization: Bearer sk-..."</span> \</div>
                  <div>&nbsp;&nbsp;<span style={{ color: 'var(--flash-text-dim)' }}>-d</span> <span style={{ color: 'var(--flash-blue)' }}>'{`{"model": "gpt-4o", "messages": [...]}`}'</span></div>
                  <div style={{ marginTop: '8px' }}><span style={{ color: '#22c55e' }}>✓ 200 OK</span> <span style={{ color: 'var(--flash-text-dim)' }}>· 47ms · streamed 1,204 tokens</span></div>
                  <span style={{ display: 'inline-block', width: '8px', height: '16px', background: 'var(--flash-cyan)', animation: 'flash-blink 1s step-end infinite', verticalAlign: 'text-bottom', marginLeft: '2px' }}></span>
                </div>
              </div>
            </div>

            {/* Card 2: Speed */}
            <div className='flash-card'>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--flash-cyan)', marginBottom: '12px' }}>{t('性能')}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--flash-text-primary)', marginBottom: '8px' }}>{t('闪电般快速')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '16px' }}>
                <span className='mono' style={{ fontSize: '56px', fontWeight: 800, color: 'var(--flash-cyan-light)', lineHeight: 1, textShadow: '0 0 40px rgba(6,182,212,0.3)' }}>&lt;50</span>
                <span style={{ fontSize: '20px', color: 'var(--flash-text-dim)', fontWeight: 500 }}>ms</span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--flash-text-muted)', lineHeight: 1.5 }}>{t('附加网关延迟')}</div>
              <div style={{ marginTop: '16px', height: '4px', borderRadius: '2px', background: 'var(--flash-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '15%', borderRadius: '2px', background: 'linear-gradient(90deg, var(--flash-cyan), var(--flash-blue))', boxShadow: '0 0 10px rgba(6,182,212,0.5)', animation: 'flash-speed-pulse 2s ease-in-out infinite' }} className='flash-speed-bar-fill'></div>
              </div>
            </div>

            {/* Card 3: Compatibility */}
            <div className='flash-card'>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--flash-cyan)', marginBottom: '12px' }}>{t('兼容性')}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--flash-text-primary)', marginBottom: '8px' }}>{t('一行代码切换')}</div>
              <div style={{ fontSize: '14px', color: 'var(--flash-text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>{t('OpenAI 直接替换。更改 base URL，其他代码不变。')}</div>
              <div className='mono' style={{ marginTop: '16px', fontSize: '13px', lineHeight: 1.8 }}>
                <div style={{ color: 'var(--flash-text-dim)' }}>base_url =</div>
                <div style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.5 }}>&nbsp;"api.openai.com"</div>
                <div style={{ color: '#22c55e' }}>&nbsp;"{serverAddress.replace('https://', '').replace('http://', '')}"</div>
              </div>
            </div>

            {/* Card 4: Endpoint */}
            <div className='flash-card'>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--flash-cyan)', marginBottom: '12px' }}>{t('接入点')}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--flash-text-primary)', marginBottom: '8px' }}>{t('你的 API 地址')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '12px 16px', background: 'var(--flash-bg-code)', border: '1px solid var(--flash-border)', borderRadius: '10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: 'var(--flash-cyan-light)', transition: 'all 0.3s', cursor: 'pointer' }} onClick={handleCopyEndpoint}>
                <span style={{ color: 'var(--flash-text-dim)' }}>https://</span>
                {serverAddress.replace('https://', '').replace('http://', '')}
                <span style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '6px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: 'var(--flash-cyan)', fontSize: '11px', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
                  {copiedEndpoint ? t('已复制') : 'COPY'}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--flash-text-muted)', lineHeight: 1.5, marginTop: '10px' }}>{t('兼容 OpenAI 的接入点，适用于任何 SDK。')}</div>
            </div>

            {/* Card 5: Pricing */}
            <div className='flash-card'>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--flash-cyan)', marginBottom: '12px' }}>{t('价格')}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--flash-text-primary)', marginBottom: '8px' }}>{t('按量付费')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                <span className='mono' style={{ fontSize: '36px', fontWeight: 800, color: 'var(--flash-cyan-light)' }}>$0</span>
                <span style={{ fontSize: '13px', color: 'var(--flash-text-muted)', lineHeight: 1.5 }}>{t('开始使用')}<br/>{t('按用量计费')}</span>
              </div>
              <a href='/pricing' style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px', color: 'var(--flash-cyan)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                {t('查看完整价格')} →
              </a>
            </div>

            {/* Card 6: Providers (span 3) */}
            <div className='flash-card span-3'>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--flash-cyan)', marginBottom: '12px' }}>{t('生态系统')}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--flash-text-primary)', marginBottom: '8px' }}>{t('40+ AI 供应商，一个 API')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                {[
                  { name: 'OpenAI', icon: OpenAI, color: '#10a37f' },
                  { name: 'Anthropic', icon: Claude, color: '#d97706' },
                  { name: 'Google Gemini', icon: Gemini, color: '#4285f4' },
                  { name: 'DeepSeek', icon: DeepSeek, color: '#0066ff' },
                  { name: 'Qwen', icon: Qwen, color: '#6366f1' },
                  { name: 'Azure', icon: AzureAI, color: '#0078d4' },
                  { name: 'Moonshot', icon: Moonshot, color: '#8b5cf6' },
                  { name: 'Zhipu', icon: Zhipu, color: '#3b82f6' },
                  { name: 'XAI', icon: XAI, color: '#000000' },
                ].map(({ name, icon: Icon, color }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(30,41,59,0.8)', fontSize: '12px', color: 'var(--flash-text-muted)', fontWeight: 500, transition: 'all 0.3s' }}>
                    <Icon size={16} />
                    {name}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(30,41,59,0.8)', fontSize: '12px', color: 'var(--flash-text-muted)', fontWeight: 500 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--flash-cyan)' }}></div>
                  +30 {t('更多')}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className='w-full h-screen border-none'
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
