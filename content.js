// 检测当前页面类型
function detectPageType() {
  const url = window.location.href;
  if (url.includes('/job_detail/')) {
    return 'detail';
  } else if (url.includes('/web/geek/jobs')) {
    return 'list';
  }
  return 'unknown';
}

/**
 * 从详情页提取职位描述（多层级备选方案）
 */
function extractJobDescriptionFromDetail() {
  const selectors = [
    // 方案1: XPath（原有方案）
    {
      name: 'XPath定位',
      extract: () => {
        const element = document.evaluate(
          '/html/body/div[1]/div[2]/div[3]/div/div[2]/div[1]/div[3]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        return element?.textContent?.trim() || '';
      }
    },
    // 方案2: CSS类名选择器
    {
      name: 'CSS类名',
      extract: () => {
        const selectors = [
          '.job-detail-section',
          '.job-sec-text',
          '.text-desc',
          '[class*="job-detail"]',
          '[class*="description"]'
        ];
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.length > 100) {
            return element.textContent.trim();
          }
        }
        return '';
      }
    },
    // 方案3: 语义化搜索
    {
      name: '语义化搜索',
      extract: () => {
        const keywords = ['岗位职责', '任职要求', '工作内容', '职位描述'];
        const allDivs = document.querySelectorAll('div, section');
        
        for (const div of allDivs) {
          const text = div.textContent || '';
          const hasKeywords = keywords.some(kw => text.includes(kw));
          
          // 判断是否包含关键词且内容足够长
          if (hasKeywords && text.length > 200 && text.length < 5000) {
            // 排除导航栏等非内容区域
            const isContent = !div.classList.contains('nav') && 
                            !div.classList.contains('header') &&
                            !div.classList.contains('footer');
            if (isContent) {
              return text.trim();
            }
          }
        }
        return '';
      }
    },
    // 方案4: 标签深度优先搜索
    {
      name: '标签深度搜索',
      extract: () => {
        // 查找最可能包含职位描述的元素
        const candidates = document.querySelectorAll('div');
        let bestMatch = null;
        let maxScore = 0;
        
        for (const candidate of candidates) {
          const text = candidate.textContent || '';
          const directText = Array.from(candidate.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('');
          
          // 评分标准
          let score = 0;
          if (text.length > 200 && text.length < 5000) score += 10;
          if (text.includes('岗位职责')) score += 15;
          if (text.includes('任职要求')) score += 15;
          if (text.includes('工作内容')) score += 10;
          if (directText.length > 50) score += 5; // 有直接文本内容
          
          if (score > maxScore) {
            maxScore = score;
            bestMatch = candidate;
          }
        }
        
        return bestMatch?.textContent?.trim() || '';
      }
    }
  ];
  
  // 依次尝试各个选择器
  for (const selector of selectors) {
    try {
      console.log(`尝试方案: ${selector.name}`);
      const result = selector.extract();
      
      if (result && result.length > 100) {
        console.log(`✅ ${selector.name} 成功，长度: ${result.length}`);
        return result;
      } else {
        console.log(`❌ ${selector.name} 失败或内容太短`);
      }
    } catch (e) {
      console.warn(`${selector.name} 出错:`, e.message);
    }
  }
  
  console.warn('所有提取方案都失败了');
  return '';
}

/**
 * 从列表页提取职位描述（多层级备选方案）
 */
function extractJobDescriptionFromList() {
  const selectors = [
    // 方案1: XPath（原有方案）
    {
      name: 'XPath定位',
      extract: () => {
        const element = document.evaluate(
          '/html/body/div[1]/div[2]/div[3]/div/div/div[2]/div[1]/div[2]/p',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        return element?.textContent?.trim() || '';
      }
    },
    // 方案2: CSS选择器
    {
      name: 'CSS选择器',
      extract: () => {
        const selectors = [
          '.job-card-body .job-info',
          '.job-detail-box p',
          '[class*="job-detail"] p',
          '.job-desc-text'
        ];
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.length > 50) {
            return element.textContent.trim();
          }
        }
        return '';
      }
    },
    // 方案3: 简短描述fallback
    {
      name: '卡片简短描述',
      extract: () => {
        const desc = document.querySelector('.job-card .job-desc, .info-desc');
        return desc?.textContent?.trim() || '';
      }
    }
  ];
  
  // 依次尝试
  for (const selector of selectors) {
    try {
      console.log(`尝试方案: ${selector.name}`);
      const result = selector.extract();
      
      if (result && result.length > 20) {
        console.log(`✅ ${selector.name} 成功，长度: ${result.length}`);
        return result;
      }
    } catch (e) {
      console.warn(`${selector.name} 出错:`, e.message);
    }
  }
  
  console.warn('列表页提取失败，建议进入详情页');
  return '';
}

// 从列表页面提取岗位信息
function extractJobFromListItem(listItem) {
  try {
    console.log('开始从列表项提取信息...', listItem);
    
    // 提取职位标题 - 多种选择器
    const jobTitle = 
      listItem.querySelector('.job-name')?.textContent?.trim() ||
      listItem.querySelector('.job-title')?.textContent?.trim() ||
      listItem.querySelector('[class*="job-name"]')?.textContent?.trim() ||
      listItem.querySelector('a[ka*="job"] span')?.textContent?.trim() ||
      listItem.querySelector('.info-primary .job-name')?.textContent?.trim() ||
      '未知职位';
    
    console.log('职位标题:', jobTitle);
    
    
    // 提取公司名称 - 多种选择器
    let company = 
      listItem.querySelector('.boss-name')?.textContent?.trim() ||
      listItem.querySelector('.company-name a')?.textContent?.trim() ||
      listItem.querySelector('.company-name')?.textContent?.trim() ||
      listItem.querySelector('.info-company a')?.textContent?.trim() ||
      listItem.querySelector('.company-text a')?.textContent?.trim() ||
      listItem.querySelector('[class*="company-name"]')?.textContent?.trim() ||
      '';
    
    // 如果还是没有找到，尝试查找所有a标签中可能是公司名的
    if (!company) {
      const links = listItem.querySelectorAll('a');
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.includes('/company/')) {
          company = link.textContent?.trim() || '';
          if (company) break;
        }
      }
    }
    
    company = company || '未知公司';
    
    console.log('公司名称:', company);
    
    // 提取标签（经验、学历等）
    const tags = [];
    const tagSelectors = [
      '.tag-list li',
      '.job-card-footer li',
      '.info-primary li',
      '.job-limit .text-desc'
    ];
    
    for (const selector of tagSelectors) {
      const elements = listItem.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(tag => {
          const text = tag.textContent?.trim();
          if (text && !tags.includes(text)) {
            tags.push(text);
          }
        });
        if (tags.length > 0) break;
      }
    }
    
    console.log('标签:', tags);
    
    // 提取职位描述 - 列表页点击后会弹出详情框
    let jobDescription = '';
    
    // 尝试使用列表页XPath提取弹出的详情框内容
    console.log('尝试提取列表页弹出详情...');
    try {
      const listElement = document.evaluate(
        '/html/body/div[1]/div[2]/div[3]/div/div/div[2]/div[1]/div[2]/p',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      
      if (listElement && listElement.textContent.length > 100) {
        jobDescription = listElement.textContent?.trim();
        console.log('列表页XPath提取成功，长度:', jobDescription.length);
      } else {
        console.log('列表页XPath未找到有效内容');
      }
    } catch (e) {
      console.log('列表页XPath提取失败:', e.message);
    }
    
    // 降级：从列表项卡片提取简短描述
    if (!jobDescription) {
      jobDescription = 
        listItem.querySelector('.job-desc')?.textContent?.trim() ||
        listItem.querySelector('.info-desc')?.textContent?.trim() ||
        listItem.querySelector('[class*="job-desc"]')?.textContent?.trim() ||
        '';
    }
    
    // 清理职位描述（如果有内容）
    if (jobDescription && jobDescription.length > 50) {
      const originalLength = jobDescription.length;
      jobDescription = cleanJobDescription(jobDescription);
      console.log(`清理列表页职位描述: ${originalLength} → ${jobDescription.length} 字符`);
    }
    
    // 提取职位链接
    const jobLink = 
      listItem.querySelector('a.job-card-left')?.href ||
      listItem.querySelector('a[href*="job_detail"]')?.href ||
      listItem.querySelector('a[ka*="job"]')?.href ||
      window.location.href;
    
    const jobData = {
      title: jobTitle,
      company: company,
      description: jobDescription,
      skills: tags,
      experience: tags.find(t => t.includes('年') || t.includes('经验')) || '',
      education: tags.find(t => t.includes('学历') || t.includes('本科') || t.includes('大专') || t.includes('硕士')) || '',
      url: jobLink,
      extractedAt: new Date().toISOString(),
      pageType: 'list'
    };
    
    console.log('列表项提取成功:', jobData);
    return jobData;
  } catch (error) {
    console.error('从列表项提取岗位信息失败:', error);
    return null;
  }
}

/**
 * BOSS直聘招聘助手 - Content Script
 * 
 * @description 内容脚本，自动提取BOSS直聘页面的岗位信息
 * @author 云淡风轻 (winkovo0818)
 * @contact QQ: 1026771081
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 * @version 1.0.0
 */
function extractJobDetails() {
  try {
    console.log('开始提取岗位信息...');
    
    // 提取职位标题 - 多种选择器fallback
    const jobTitle = 
      document.querySelector('.job-title')?.textContent?.trim() ||
      document.querySelector('.name.ellipsis')?.textContent?.trim() ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.querySelector('[class*="job-name"]')?.textContent?.trim() ||
      document.querySelector('[class*="job-title"]')?.textContent?.trim() ||
      '未知职位';
    
    console.log('职位标题:', jobTitle);


    // 提取公司名称
    const company = 
      document.querySelector('.company-name')?.textContent?.trim() ||
      document.querySelector('[class*="company"] a')?.textContent?.trim() ||
      document.querySelector('.name')?.textContent?.trim() ||
      '未知公司';
    
    console.log('公司:', company);

    // 提取职位描述 - 使用多层级备选方案
    let jobDescription = '';
    const currentUrl = window.location.href;
    
    // 判断页面类型
    if (currentUrl.includes('job_detail')) {
      // 详情页：使用多备选方案
      console.log('📄 详情页模式，尝试多种提取方式');
      jobDescription = extractJobDescriptionFromDetail();
    } else if (currentUrl.includes('/web/geek/jobs')) {
      // 列表页：使用多备选方案
      console.log('📋 列表页模式，尝试多种提取方式');
      jobDescription = extractJobDescriptionFromList();
    }
    
    
    // 清理职位描述内容
    if (jobDescription) {
      const originalLength = jobDescription.length;
      jobDescription = cleanJobDescription(jobDescription);
      console.log(`清理职位描述: ${originalLength} → ${jobDescription.length} 字符`);
    }
    
    // 验证职位描述是否有效（不是登录提示或空内容）
    const invalidDescriptions = ['点击登录', '立即与BOSS沟通', '登录后查看', '请先登录'];
    const isInvalidDescription = invalidDescriptions.some(invalid => 
      jobDescription.includes(invalid)
    );
    
    if (isInvalidDescription || jobDescription.length < 50) {
      console.warn('职位描述可能不完整，建议确保已登录BOSS直聘');
      // 尝试从整个页面提取更多信息
      const pageText = document.body.innerText;
      if (pageText.length > 200) {
        jobDescription = pageText.substring(0, 2000); // 限制长度
      }
    }
    
    console.log('职位描述长度:', jobDescription.length);
    console.log('职位描述预览:', jobDescription.substring(0, 100) + '...');

    // 提取技能要求 - 多种可能的标签位置
  const skills = [];
  
  // 福利关键词黑名单（用于过滤）
  const benefitKeywords = [
    '福利', '聚餐', '下午茶', '旅游', '年假', '带薪', '补助', '补贴',
    '奖金', '提成', '五险', '一金', '社保', '公积金', '体检', '餐补',
    '交通', '通讯', '节日', '生日', '团建', '年终', '绩效', '加班费',
    '住房', '宿舍', '班车', '零食', '水果', '咖啡', '健身', '弹性'
  ];
  
  // 判断是否是福利标签
  const isBenefitTag = (text) => {
    return benefitKeywords.some(keyword => text.includes(keyword));
  };
  
  // 尝试多种选择器
  const skillSelectors = [
    // 优先尝试更具体的技能标签
    '.job-tags .tag',
    '.job-detail .tag',
    '.tag-list .tag',
    '.tags .tag',
    '[class*="tag-list"] [class*="tag"]',
    '.skill-tag'
  ];
  
  for (const selector of skillSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      let validSkillFound = false;
      elements.forEach(el => {
        const text = el.textContent.trim();
        // 过滤：不为空 && 不重复 && 不是福利标签
        if (text && !skills.includes(text) && !isBenefitTag(text)) {
          skills.push(text);
          validSkillFound = true;
        }
      });
      
      // 如果找到了有效的技能标签，就不再尝试其他选择器
      if (validSkillFound && skills.length > 0) {
        break;
      }
    }
  }
  
  console.log('技能要求:', skills);
  console.log('技能数量:', skills.length);

    // 提取工作经验要求
    const experience = 
      document.querySelector('.job-primary .experience')?.textContent?.trim() ||
      document.querySelector('[class*="experience"]')?.textContent?.trim() ||
      '';

    // 提取学历要求
    const education = 
      document.querySelector('.job-primary .education')?.textContent?.trim() ||
      document.querySelector('[class*="education"]')?.textContent?.trim() ||
      '';

    const jobData = {
      title: jobTitle,
      company: company,
      description: jobDescription,
      skills: skills,
      experience: experience,
      education: education,
      url: window.location.href,
      extractedAt: new Date().toISOString(),
      pageType: 'detail'
    };

    console.log('成功提取岗位信息:', jobData);
    
    // 验证关键信息
    if (!jobData.title || jobData.title === '未知职位') {
      console.warn('职位标题提取失败，可能不在岗位详情页');
    }
    
    // 验证职位描述
    if (jobData.description.length < 50 || jobData.description.includes('点击登录')) {
      console.warn('职位描述不完整，请确保：');
      console.warn('   1. 已登录BOSS直聘账号');
      console.warn('   2. 页面已完全加载');
      console.warn('   3. 可以尝试刷新页面');
    }
    
    // 验证技能提取
    if (jobData.skills.length === 0) {
      console.warn('未提取到技能标签，将从职位描述中分析');
    }
    
    return jobData;
  } catch (error) {
    console.error('提取岗位信息失败:', error);
    return null;
  }
}

// 清理职位描述内容
function cleanJobDescription(description) {
  if (!description) return '';
  
  let cleaned = description
    // 移除CSS样式块
    .replace(/\.[a-zA-Z0-9_-]+\{[^}]*\}/g, '')
    // 移除干扰文字
    .replace(/BOSS直聘/g, '')
    .replace(/来自BOSS直聘/g, '')
    .replace(/直聘/g, '')
    .replace(/kanzhun/g, '')
    .replace(/看准网/g, '')
    // 移除多余空白
    .replace(/\s+/g, ' ')
    .trim();
  
  // 移除公司福利部分（只保留岗位职责和任职要求）
  const benefitKeywords = ['公司福利', '福利待遇', '我们提供', '员工福利', '薪资福利'];
  for (const keyword of benefitKeywords) {
    const index = cleaned.indexOf(keyword);
    if (index > 0) {
      cleaned = cleaned.substring(0, index).trim();
      console.log(`📌 移除"${keyword}"之后的内容`);
      break;
    }
  }
  
  return cleaned;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobDetails') {
    const jobData = extractJobDetails();
    sendResponse({ success: !!jobData, data: jobData });
  }
  return true;
});

// 页面加载完成后自动提取并存储JD信息
window.addEventListener('load', () => {
  console.log('页面加载完成，准备提取岗位信息');
  
  const pageType = detectPageType();
  console.log('检测到页面类型:', pageType);
  
  if (pageType === 'detail') {
    // 详情页：自动提取岗位信息
    setTimeout(() => {
      const jobData = extractJobDetails();
      if (jobData && jobData.title && jobData.title !== '未知职位') {
        chrome.storage.local.set({ currentJob: jobData }, () => {
          console.log('岗位信息已保存到本地存储');
        });
      } else {
        console.warn('未能提取有效的岗位信息');
      }
    }, 3000);
  } else if (pageType === 'list') {
    // 列表页：监听岗位项点击
    console.log('列表页面已就绪，可以点击岗位查看详情或使用插件提取');
    setupListPageHandlers();
  }
});

// 设置列表页面的事件处理
function setupListPageHandlers() {
  console.log('设置列表页面事件监听...');
  
  // 给所有岗位项添加点击监听
  document.addEventListener('click', (e) => {
    // 尝试多种方式定位岗位卡片
    const listItem = 
      e.target.closest('.job-card-wrapper') ||
      e.target.closest('.job-card-box') ||
      e.target.closest('.job-card-left') ||
      e.target.closest('li.job-card-wrapper') ||
      e.target.closest('[class*="job-card"]');
    
    if (listItem) {
      console.log('检测到岗位项点击:', listItem);
      
      // 稍微延迟以确保DOM已更新
      setTimeout(() => {
        const jobData = extractJobFromListItem(listItem);
        if (jobData && jobData.title && jobData.title !== '未知职位') {
          chrome.storage.local.set({ currentJob: jobData }, () => {
            console.log('列表页岗位信息已保存:', jobData.title);
            
            // 在页面上显示一个简短的提示
            showPageNotification('已捕获岗位信息，可以打开插件使用');
          });
        } else {
          console.warn('未能提取到有效的岗位信息');
        }
      }, 100);
    }
  });
  
  console.log('列表页面事件监听已设置');
}

// 在页面上显示通知
function showPageNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #00a870;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,168,112,0.3);
    z-index: 10000;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// 智能DOM观察器 - 优化性能
let observerTimer = null;
let observerRetryCount = 0;
const MAX_OBSERVER_RETRIES = 3; // 最多重试3次
let observer = null;

function setupObserver() {
  if (observer) return; // 避免重复创建
  
  observer = new MutationObserver((mutations) => {
    // 防抖：避免频繁触发
    if (observerTimer) return;
    
    // 限制重试次数
    if (observerRetryCount >= MAX_OBSERVER_RETRIES) {
      console.log('Observer已达到最大重试次数，停止观察');
      stopObserver();
      return;
    }
    
    observerTimer = setTimeout(() => {
      observerTimer = null;
      observerRetryCount++;
      
      // 只在未成功提取时重试
      chrome.storage.local.get(['currentJob'], (result) => {
        if (!result.currentJob || result.currentJob.title === '未知职位') {
          const jobData = extractJobDetails();
          if (jobData && jobData.title && jobData.title !== '未知职位') {
            chrome.storage.local.set({ currentJob: jobData });
            console.log('DOM变化后重新提取成功');
            // 成功后停止观察，释放资源
            stopObserver();
          }
        } else {
          // 已有有效数据，停止观察
          stopObserver();
        }
      });
    }, 1000); // 增加到1秒防抖，减少触发频率
  });
  
  try {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      // 优化：只观察DOM结构变化，不观察属性和文本
      attributes: false,
      characterData: false
    });
    console.log('DOM观察器已启动');
  } catch (e) {
    console.warn('无法启动DOM观察器:', e);
  }
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
    console.log('DOM观察器已停止');
  }
  if (observerTimer) {
    clearTimeout(observerTimer);
    observerTimer = null;
  }
}

// 启动观察器
setupObserver();
