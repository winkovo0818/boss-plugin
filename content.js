// 提取BOSS直聘岗位JD信息
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

    // 提取薪资
    const salary = 
      document.querySelector('.salary')?.textContent?.trim() ||
      document.querySelector('[class*="salary"]')?.textContent?.trim() ||
      document.querySelector('.red')?.textContent?.trim() ||
      '面议';
    
    console.log('薪资:', salary);

    // 提取公司名称
    const company = 
      document.querySelector('.company-name')?.textContent?.trim() ||
      document.querySelector('[class*="company"] a')?.textContent?.trim() ||
      document.querySelector('.name')?.textContent?.trim() ||
      '未知公司';
    
    console.log('公司:', company);

    // 提取职位描述 - 使用精确的XPath
    let jobDescription = '';
    
    // 首先尝试使用精确的XPath
    try {
      const jobDescElement = document.evaluate(
        '/html/body/div[1]/div[2]/div[3]/div/div/div[2]/div[2]/div[2]/p',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      
      if (jobDescElement) {
        jobDescription = jobDescElement.textContent?.trim() || '';
        console.log('✓ 使用XPath提取职位描述');
      }
    } catch (e) {
      console.log('XPath提取失败，尝试CSS选择器');
    }
    
    // 如果XPath失败，尝试CSS选择器
    if (!jobDescription) {
      jobDescription = 
        document.querySelector('.job-sec .text')?.textContent?.trim() ||
        document.querySelector('.job-detail-section .text')?.textContent?.trim() ||
        document.querySelector('[class*="job-sec"] .text')?.textContent?.trim() ||
        document.querySelector('.detail-content')?.textContent?.trim() ||
        document.querySelector('.job-description')?.textContent?.trim() ||
        '';
    }
    
    // 验证职位描述是否有效（不是登录提示或空内容）
    const invalidDescriptions = ['点击登录', '立即与BOSS沟通', '登录后查看', '请先登录'];
    const isInvalidDescription = invalidDescriptions.some(invalid => 
      jobDescription.includes(invalid)
    );
    
    if (isInvalidDescription || jobDescription.length < 50) {
      console.warn('⚠️ 职位描述可能不完整，建议确保已登录BOSS直聘');
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
      salary: salary,
      company: company,
      description: jobDescription,
      skills: skills,
      experience: experience,
      education: education,
      url: window.location.href,
      extractedAt: new Date().toISOString()
    };

    console.log('✅ 成功提取岗位信息:', jobData);
    
    // 验证关键信息
    if (!jobData.title || jobData.title === '未知职位') {
      console.warn('⚠️ 职位标题提取失败，可能不在岗位详情页');
    }
    
    // 验证职位描述
    if (jobData.description.length < 50 || jobData.description.includes('点击登录')) {
      console.warn('⚠️ 职位描述不完整，请确保：');
      console.warn('   1. 已登录BOSS直聘账号');
      console.warn('   2. 页面已完全加载');
      console.warn('   3. 可以尝试刷新页面');
    }
    
    // 验证技能提取
    if (jobData.skills.length === 0) {
      console.warn('⚠️ 未提取到技能标签，将从职位描述中分析');
    }
    
    return jobData;
  } catch (error) {
    console.error('❌ 提取岗位信息失败:', error);
    return null;
  }
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
  setTimeout(() => {
    const jobData = extractJobDetails();
    if (jobData && jobData.title && jobData.title !== '未知职位') {
      chrome.storage.local.set({ currentJob: jobData }, () => {
        console.log('✅ 岗位信息已保存到本地存储');
      });
    } else {
      console.warn('⚠️ 未能提取有效的岗位信息');
    }
  }, 3000); // 增加延迟到3秒，确保页面完全加载（包括动态内容）
});

// 监听DOM变化，如果是单页应用可能需要这个
// 使用防抖避免频繁执行
let observerTimer = null;
const observer = new MutationObserver(() => {
  if (observerTimer) return;
  
  observerTimer = setTimeout(() => {
    observerTimer = null;
    
    // 如果之前没有提取成功，再次尝试
    chrome.storage.local.get(['currentJob'], (result) => {
      if (!result.currentJob || result.currentJob.title === '未知职位') {
        const jobData = extractJobDetails();
        if (jobData && jobData.title && jobData.title !== '未知职位') {
          chrome.storage.local.set({ currentJob: jobData });
          console.log('✅ DOM变化后重新提取成功');
        }
      }
    });
  }, 500); // 500ms防抖
});

// 开始观察
try {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} catch (e) {
  console.warn('⚠️ 无法启动DOM观察器:', e);
}
