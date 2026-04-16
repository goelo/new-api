import React, { useContext, useEffect, useState } from 'react';
import { API, showError, copy, showSuccess } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import './style.css';

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const navigate = useNavigate();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
  const docsLink = statusState?.status?.docs_link || '';
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
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

  const handleCopyEndpoint = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      setCopiedEndpoint(true);
      showSuccess(t('已复制到剪切板'));
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

  const hostDisplay = serverAddress
    .replace('https://', '')
    .replace('http://', '');

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='custom-home'>
          {/* Hero Section */}
          <section className='custom-home-hero'>
            <div className='custom-home-badge'>
              <span className='custom-home-badge-dot'></span>
              {t('统一 AI 网关 — 支持 40+ 供应商')}
            </div>
            <h1
              className='custom-home-hero-title'
              style={{ fontSize: isMobile ? '36px' : '52px' }}
            >
              {t('一个 API')}
              <br />
              {t('所有模型')}
            </h1>
            <p
              className='custom-home-hero-subtitle'
              style={{ fontSize: isMobile ? '15px' : '18px' }}
            >
              {t(
                '通过一个闪电般快速的端点，访问 OpenAI、Claude、Gemini、DeepSeek 等 40+ AI 供应商。兼容 OpenAI 接口，零迁移成本。'
              )}
            </p>
            <div className='custom-home-hero-buttons'>
              <button
                className='custom-home-btn custom-home-btn-primary'
                onClick={() => navigate('/console')}
              >
                {t('获取密钥')} →
              </button>
              <button
                className='custom-home-btn custom-home-btn-secondary'
                onClick={() => window.open(docsLink || '/docs')}
              >
                {t('查看文档')}
              </button>
            </div>
          </section>

          {/* Features Grid */}
          <section className='custom-home-features'>
            {/* Terminal Card */}
            <div className='custom-home-card'>
              <div className='custom-home-label'>{t('实时演示')}</div>
              <h3 className='custom-home-card-title'>{t('即刻体验')}</h3>
              <div className='custom-home-terminal'>
                <div className='custom-home-terminal-header'>
                  <span className='custom-home-dot custom-home-dot-red'></span>
                  <span className='custom-home-dot custom-home-dot-yellow'></span>
                  <span className='custom-home-dot custom-home-dot-green'></span>
                </div>
                <div
                  className='custom-home-terminal-body'
                  style={{ fontSize: isMobile ? '11px' : '12px' }}
                >
                  <div>
                    <span className='custom-home-prompt'>$</span>{' '}
                    <span className='custom-home-cmd'>curl -X POST</span>{' '}
                    <span className='custom-home-url'>
                      {serverAddress}/v1/chat/completions
                    </span>{' '}
                    \
                  </div>
                  <div>
                    &nbsp;&nbsp;<span className='custom-home-cmd'>-H</span>{' '}
                    <span className='custom-home-string'>
                      "Authorization: Bearer sk-..."
                    </span>{' '}
                    \
                  </div>
                  <div>
                    &nbsp;&nbsp;<span className='custom-home-cmd'>-d</span>{' '}
                    <span className='custom-home-json'>
                      {'\'{"model": "gpt-4o", "messages": [...]}\''}
                    </span>
                  </div>
                  <div className='custom-home-success'>
                    ✓ 200 OK · 47ms · streamed 1,204 tokens
                  </div>
                </div>
              </div>
            </div>

            {/* Speed Card */}
            <div className='custom-home-card'>
              <div className='custom-home-label'>{t('性能')}</div>
              <h3 className='custom-home-card-title'>{t('闪电般快速')}</h3>
              <div className='custom-home-metric'>
                <span className='custom-home-metric-value'>&lt;50</span>
                <span className='custom-home-metric-unit'>ms</span>
              </div>
              <p className='custom-home-desc'>{t('附加网关延迟')}</p>
            </div>

            {/* Compatibility Card */}
            <div className='custom-home-card'>
              <div className='custom-home-label'>{t('兼容性')}</div>
              <h3 className='custom-home-card-title'>{t('一行代码切换')}</h3>
              <p className='custom-home-desc'>
                {t('OpenAI 直接替换。更改 base URL，其他代码不变。')}
              </p>
              <div className='custom-home-code'>
                <div className='custom-home-code-old'>
                  base_url = "api.openai.com"
                </div>
                <div className='custom-home-code-new'>
                  base_url = "{hostDisplay}"
                </div>
              </div>
            </div>

            {/* Endpoint Card */}
            <div className='custom-home-card'>
              <div className='custom-home-label'>{t('接入点')}</div>
              <h3 className='custom-home-card-title'>{t('你的 API 地址')}</h3>
              <div
                className='custom-home-endpoint'
                onClick={handleCopyEndpoint}
              >
                <span className='custom-home-endpoint-prefix'>https://</span>
                {hostDisplay}
                <span className='custom-home-endpoint-copy'>
                  {copiedEndpoint ? t('已复制') : 'COPY'}
                </span>
              </div>
              <p className='custom-home-desc'>
                {t('兼容 OpenAI 的接入点，适用于任何 SDK。')}
              </p>
            </div>

            {/* Price Card */}
            <div className='custom-home-card'>
              <div className='custom-home-label'>{t('价格')}</div>
              <h3 className='custom-home-card-title'>{t('按量付费')}</h3>
              <div className='custom-home-price'>
                <span className='custom-home-price-value'>$0</span>
                <span className='custom-home-price-desc'>
                  {t('开始使用')}
                  <br />
                  {t('按用量计费')}
                </span>
              </div>
              <Link to='/pricing' className='custom-home-link'>
                {t('查看完整价格')} →
              </Link>
            </div>
          </section>

          {/* Providers */}
          <section className='custom-home-providers'>
            <div className='custom-home-label'>{t('生态系统')}</div>
            <h3 className='custom-home-card-title'>
              {t('40+ AI 供应商，一个 API')}
            </h3>
            <div className='custom-home-provider-list'>
              {[
                'OpenAI',
                'Anthropic',
                'Google Gemini',
                'DeepSeek',
                'Qwen',
                'Azure',
                'Moonshot',
                'Zhipu',
                'XAI',
              ].map((name) => (
                <span key={name} className='custom-home-provider-tag'>
                  {name}
                </span>
              ))}
              <span className='custom-home-provider-tag custom-home-provider-more'>
                +30 {t('更多')}
              </span>
            </div>
          </section>

          {/* Footer */}
          <footer className='custom-home-footer'>
            <p>© 2026 New API. All rights reserved</p>
          </footer>
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
