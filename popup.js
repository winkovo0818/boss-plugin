/**
 * BOSS直聘招聘助手 - Popup Interface
 * 
 * @description 主弹窗界面逻辑，处理用户交互和结果展示
 * @author 云淡风轻 (winkovo0818)
 * @contact QQ: 1026771081
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 * @version 1.0.0
 */

let currentJob = null;
let currentResume = null;
let currentStyle = 'casual';
let matchResult = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadJobInfo();
  loadSavedResume();
  initializeEventListeners();
});

// 加载岗位信息
function loadJobInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    
    // 检查是否在BOSS直聘相关页面
    if (currentTab.url && currentTab.url.includes('zhipin.com')) {
      const isDetailPage = currentTab.url.includes('job_detail');
      
      // 优先从存储中获取岗位信息
      chrome.storage.local.get(['currentJob'], (result) => {
        if (result.currentJob) {
          // 检查：如果在详情页但存储的是列表页数据，强制重新提取
          if (isDetailPage && result.currentJob.pageType === 'list') {
            console.log('检测到详情页但数据是列表页的，重新提取...');
            chrome.tabs.sendMessage(currentTab.id, { action: 'extractJobDetails' }, (response) => {
              if (response && response.success) {
                currentJob = response.data;
                displayJobInfo(currentJob);
                // 保存详情页数据
                chrome.storage.local.set({ currentJob: response.data });
              } else {
                // 降级使用列表页数据
                currentJob = result.currentJob;
                displayJobInfo(currentJob);
                showMessage('列表页信息有限，建议刷新页面后重试', 'warning');
              }
            });
          } else {
            currentJob = result.currentJob;
            displayJobInfo(currentJob);
          }
        } else if (isDetailPage) {
          // 如果在详情页且存储中没有，尝试从页面提取
          chrome.tabs.sendMessage(currentTab.id, { action: 'extractJobDetails' }, (response) => {
            if (response && response.success) {
              currentJob = response.data;
              displayJobInfo(currentJob);
            } else {
              showMessage('未检测到岗位信息，请刷新页面或点击岗位卡片', 'warning');
            }
          });
        } else {
          // 在列表页或其他页面，提示用户
          showMessage('请点击岗位卡片或进入岗位详情页', 'warning');
        }
      });
    } else {
      showMessage('请在BOSS直聘网站使用本插件', 'warning');
    }
  });
}

// 显示岗位信息
function displayJobInfo(job) {
  const jobInfo = document.getElementById('jobInfo');
  const jobTitle = document.getElementById('jobTitle');
  const jobCompany = document.getElementById('jobCompany');

  jobTitle.textContent = job.title || '未知职位';
  jobCompany.textContent = job.company || '未知公司';

  jobInfo.classList.remove('hidden');
}

// 初始化事件监听
function initializeEventListeners() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const copyBtn = document.getElementById('copyBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const styleBtns = document.querySelectorAll('.style-btn');
  const settingsBtn = document.getElementById('settingsBtn');
  const goToSettingsBtn = document.getElementById('goToSettingsBtn');
  const resumeSelect = document.getElementById('resumeSelect');

  // 设置按钮
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // 前往设置按钮
  goToSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // 简历选择变化
  resumeSelect.addEventListener('change', (e) => {
    const resumeId = parseInt(e.target.value);
    chrome.storage.local.get(['resumes'], (result) => {
      const resumes = result.resumes || [];
      const selectedResume = resumes.find(r => r.id === resumeId);
      if (selectedResume) {
        currentResume = selectedResume;
      }
    });
  });

  // 开始分析按钮
  analyzeBtn.addEventListener('click', () => {
    analyzeMatch();
  });

  // 生成打招呼按钮
  const generateGreetingBtn = document.getElementById('generateGreetingBtn');
  if (generateGreetingBtn) {
    generateGreetingBtn.addEventListener('click', () => {
      generateAllGreetings();
    });
  }

  // 复制按钮
  copyBtn.addEventListener('click', () => {
    const greetingText = document.getElementById('greetingText').textContent;
    navigator.clipboard.writeText(greetingText).then(() => {
      showMessage('已复制到剪贴板', 'success');
    });
  });

  // 重新生成按钮
  regenerateBtn.addEventListener('click', () => {
    generateAllGreetings();
  });

  // 风格选择按钮
  styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchGreetingStyle(btn.dataset.style);
    });
  });
}

// 分析匹配度
async function analyzeMatch() {
  if (!currentJob) {
    showMessage('未检测到岗位信息，请点击岗位卡片或进入岗位详情页', 'error');
    return;
  }

  if (!currentResume) {
    showMessage('请先上传简历', 'error');
    return;
  }
  
  // 检查是否有完整的职位描述
  if (!currentJob.description || currentJob.description.length < 100) {
    showMessage('提示：列表页信息有限，建议进入岗位详情页以获得更准确的匹配分析', 'warning');
  }

  // 显示加载状态
  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  const analyzeBtn = document.getElementById('analyzeBtn');
  
  loading.classList.remove('hidden');
  loadingText.textContent = '正在分析匹配度...';
  analyzeBtn.disabled = true;

  try {
    // 发送消息到background进行分析
    chrome.runtime.sendMessage({
      action: 'analyzeMatch',
      jobData: currentJob,
      resumeData: currentResume
    }, (response) => {
      loading.classList.add('hidden');
      analyzeBtn.disabled = false;

      if (response && response.success) {
        matchResult = response.data;
        
        // 检测PDF格式问题
        if (matchResult.matchScore === 0 && currentResume.content && 
            currentResume.content.includes('pdf') && currentResume.content.includes('endobj')) {
          showMessage('简历格式错误：检测到PDF原始格式，请重新上传TXT格式简历或配置Kimi API', 'error');
          return;
        }
        
        displayMatchResult(matchResult);
        showMessage('匹配分析完成', 'success');

        // 如果匹配度>=70，显示打招呼生成按钮
        if (matchResult.matchScore >= 70) {
          document.getElementById('greetingSection').classList.remove('hidden');
          // 不自动生成，等用户点击
        } else {
          document.getElementById('greetingSection').classList.add('hidden');
          showMessage('匹配度较低，建议寻找更合适的岗位', 'warning');
        }
      } else {
        const errorMsg = response?.error || '未知错误';
        
        // 使用ErrorHandler处理错误
        if (typeof ErrorHandler !== 'undefined') {
          const errorInfo = ErrorHandler.handle(errorMsg, '匹配分析');
          showMessage(`${errorInfo.title}: ${errorInfo.message}`, 'error');
        } else {
          showMessage(`分析失败：${errorMsg}。已自动重试3次，请检查网络或API配置`, 'error');
        }
        
        // 显示重新分析按钮
        analyzeBtn.textContent = '重新分析';
        analyzeBtn.classList.remove('hidden');
      }
    });
  } catch (error) {
    loading.classList.add('hidden');
    analyzeBtn.disabled = false;
    
    // 使用ErrorHandler处理错误
    if (typeof ErrorHandler !== 'undefined') {
      const errorInfo = ErrorHandler.handle(error, '匹配分析');
      showMessage(`${errorInfo.title}: ${errorInfo.message}`, 'error');
    } else {
      showMessage(`发生错误：${error.message}。请检查网络连接或API配置`, 'error');
    }
    
    // 显示重新分析按钮
    analyzeBtn.textContent = '重新分析';
  }
}

// 显示匹配结果
function displayMatchResult(result) {
  const matchResultDiv = document.getElementById('matchResult');
  const matchScore = document.getElementById('matchScore');
  const matchBar = document.getElementById('matchBar');
  const matchAnalysis = document.getElementById('matchAnalysis');
  const strengthsSection = document.getElementById('strengthsSection');
  const strengthsList = document.getElementById('strengthsList');
  const gapsSection = document.getElementById('gapsSection');
  const gapsList = document.getElementById('gapsList');

  matchScore.textContent = result.matchScore + '%';
  matchBar.style.width = result.matchScore + '%';
  
  // 根据分数设置颜色
  if (result.matchScore >= 80) {
    matchBar.className = 'match-bar high';
  } else if (result.matchScore >= 70) {
    matchBar.className = 'match-bar medium';
  } else if (result.matchScore >= 50) {
    matchBar.className = 'match-bar low';
  } else {
    matchBar.className = 'match-bar very-low';
  }

  matchAnalysis.textContent = result.analysis;

  // 显示优势
  if (result.strengths && result.strengths.length > 0) {
    strengthsList.innerHTML = result.strengths.map(s => 
      `<div class="list-item strength">
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        <span>${s}</span>
      </div>`
    ).join('');
    strengthsSection.classList.remove('hidden');
  }

  // 显示差距
  if (result.gaps && result.gaps.length > 0) {
    gapsList.innerHTML = result.gaps.map(g => 
      `<div class="list-item gap">
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <span>${g}</span>
      </div>`
    ).join('');
    gapsSection.classList.remove('hidden');
  }

  matchResultDiv.classList.remove('hidden');
  
  // 如果匹配度>=70，自动显示打招呼区域并生成
  if (result.matchScore >= 70) {
    document.getElementById('greetingSection').classList.remove('hidden');
    // 默认生成专业风格
    generateGreeting('professional');
  } else {
    // 匹配度低，不建议投递，隐藏打招呼区域
    document.getElementById('greetingSection').classList.add('hidden');
    showMessage('匹配度较低（<70分），不建议投递该岗位', 'warning');
  }
}

// 一次性生成三种风格的打招呼话术
async function generateThreeStyleGreetings(jobData, resumeData, matchResult) {
  console.log('=== 开始生成三种风格的打招呼话术 ===');
  console.log('匹配度:', matchResult.matchScore);
  
  // 获取AI配置
  const aiConfig = await new Promise((resolve) => {
    chrome.storage.local.get(['aiConfig'], (result) => {
      resolve(result.aiConfig);
    });
  });
  
  console.log('AI配置:', aiConfig ? '已配置' : '未配置');
  
  if (!aiConfig || !aiConfig.apiKey) {
    console.log('未配置AI，抛出异常');
    throw new Error('未配置AI');
  }
  
  console.log('开始调用AI生成三种风格...');
  
  // 构建匹配优势文本
  const strengthsText = matchResult.strengths && matchResult.strengths.length > 0
    ? matchResult.strengths.slice(0, 3).join('\n- ')
    : '相关工作经验';
  
  // 构建可提升点文本
  const gapsText = matchResult.gaps && matchResult.gaps.length > 0
    ? matchResult.gaps.map((g, i) => `  ${i + 1}. ${g}`).join('\n')
    : '无';
  
  const prompt = `你现在是一名真实求职者，正在 BOSS 直聘上给 HR 发第一条消息。请根据下面的信息生成真实可信的开场话术。

【岗位信息】
职位：${jobData.title}
公司：${jobData.company}
JD内容：${jobData.description}

【候选人优势】
${strengthsText}

【候选人可提升点】
${gapsText}

【候选人简历原文】
${resumeData.content}

---

【写作目标】
- 输出一段小于 120 字的 BOSS 直聘首条消息，语气口语自然但保持专业。
- 生成三种风格（casual / formal / creative），内容事实一致，只调整语气与节奏。

---

【硬性规则】
1. **固定开头**：第一句必须是“您好，看到${jobData.title}岗位，我X年XXX经验比较匹配。”（X、XXX 必须从简历提取）。
2. **绝对真实**：
   - 只能使用简历里明确写到的技术、模型、平台和数字。
   - 如果简历没有提到具体算法（如 XGBoost / LightGBM），只能写“预测模型”“机器学习模型”。
   - 没有百分比就不要编造，可用“百万级数据”“翻倍”这类原文描述。
3. **项目因果链**：每家公司/项目必须写成“在XX做XX，用XX方法/工具做YY → 指标提了/降了XX%”。
4. **指标动词**：
   - 成本/问题：降了、省了、减少了。
   - 效率/周转：提了、提升了。
   - 增长：增长了、提升了。
5. **JD 匹配**：从 JD 中挑 1-2 个技能/场景/工具，自然嵌入项目句子，禁止机械堆砌。
6. **可提升点**：
   - 缺平台经验 → “之前主要在XX场景，但底层逻辑相通，对YY这块挺感兴趣。”
   - 缺技能 → “之前主要用XX，YY可以很快上手/正在补课。”
7. **语气**：口语但专业，不说“贵司”“本人”“高度契合”，不用 AI 味道（擅长、深耕、赋能、驱动、模型构建等）。
8. **结构**：每个公司/项目单独一句，句号分隔，最后一句必须以“对XX这块挺感兴趣，可以聊聊。”收尾。
9. **示例提醒**：
   - 有具体算法时：在XX公司做销售分析，处理500万条数据，用机器学习模型优化库存 → 积压率降10%、周转率提20%。
   - 只有通用技术时：在XX项目做数据分析，搭预测模型支持补货 → 准确率提15%。
   - 示例不可直接复用，需替换为简历真实信息。
10. **输出要求**：纯文本 JSON，不要引号包裹整段，也不要 markdown 代码块。

---

【输出格式】
{
  "casual": "轻松口语版",
  "formal": "稍正式但不官话版",
  "creative": "更直接、紧凑的创意版"
}
`;

  // 调用AI API
  console.log('发送请求到AI API...');
  const response = await callAIAPI(prompt, aiConfig);
  console.log('AI返回成功，长度:', response.length);
  
  // 解析JSON响应
  try {
    // 尝试提取JSON（有些AI会在前后加markdown代码块）
    let jsonText = response.trim();
    
    // 移除可能的markdown代码块标记
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    const greetings = JSON.parse(jsonText);
    
    // 验证返回的数据格式
    if (!greetings.casual || !greetings.formal || !greetings.creative) {
      throw new Error('AI返回的数据格式不正确');
    }
    
    console.log('三种风格生成成功');
    return {
      casual: greetings.casual.trim(),
      formal: greetings.formal.trim(),
      creative: greetings.creative.trim()
    };
  } catch (parseError) {
    console.error('JSON解析失败:', parseError);
    console.log('原始响应:', response);
    throw new Error('AI返回格式错误，请重试');
  }
}

// 通用重试函数
async function retryAsync(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`尝试第 ${i + 1} 次...`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`第 ${i + 1} 次尝试失败:`, error.message);
      
      if (i < maxRetries - 1) {
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // 指数退避
      }
    }
  }
  
  throw new Error(`重试 ${maxRetries} 次后仍然失败: ${lastError.message}`);
}

// 调用AI API（统一接口）
async function callAIAPI(prompt, aiConfig) {
  return await retryAsync(async () => {
    const url = `${aiConfig.baseURL}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 5000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API调用失败 (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }, 3, 1000); // 最多重试3次，初始延迟1秒
}

// 存储三种风格的打招呼语句
let greetingCache = {};

// 一次性生成所有风格的打招呼语句
async function generateAllGreetings() {
  const generateBtn = document.getElementById('generateGreetingBtn');
  const greetingContent = document.getElementById('greetingContent');
  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  const greetingText = document.getElementById('greetingText');
  
  // 隐藏生成按钮
  generateBtn.classList.add('hidden');
  
  // 显示loading
  loading.classList.remove('hidden');
  loadingText.textContent = '正在生成三种风格的打招呼语句...';
  
  try {
    // 一次性生成三种风格（只调用1次AI）
    greetingCache = await generateThreeStyleGreetings(currentJob, currentResume, matchResult);
    
    // 隐藏loading，显示内容区
    loading.classList.add('hidden');
    greetingContent.classList.remove('hidden');
    
    // 默认显示轻松风格
    greetingText.textContent = greetingCache.casual;
    currentStyle = 'casual';
    
    // 激活第一个按钮
    document.querySelector('[data-style="casual"]').classList.add('active');
    
    showMessage('打招呼语句生成成功（3种风格）', 'success');
    
    // 保存到历史记录
    saveToHistory(
      currentJob,
      matchResult.matchScore,
      matchResult.strengths,
      matchResult.gaps,
      greetingCache.casual
    );
  } catch (error) {
    console.error('生成失败:', error);
    loading.classList.add('hidden');
    greetingContent.classList.remove('hidden');
    
    // 使用ErrorHandler处理错误
    if (typeof ErrorHandler !== 'undefined') {
      const errorInfo = ErrorHandler.handle(error, '打招呼生成');
      greetingText.textContent = `生成失败：${errorInfo.message}`;
      showMessage(`${errorInfo.title}: ${errorInfo.solution}`, 'error');
      
      // 如果错误可重试，显示重试按钮
      if (ErrorHandler.isRetryable(error)) {
        generateBtn.classList.remove('hidden');
        generateBtn.textContent = '重新生成';
      }
    } else {
      greetingText.textContent = `生成失败：${error.message}`;
      showMessage('打招呼语句生成失败，请检查API配置', 'error');
    }
  }
}

// 切换打招呼风格（从缓存读取）
function switchGreetingStyle(style) {
  const greetingText = document.getElementById('greetingText');
  
  // 从缓存读取
  if (greetingCache[style]) {
    greetingText.textContent = greetingCache[style];
    currentStyle = style;
    
    // 高亮选中的风格按钮
    document.querySelectorAll('.style-btn').forEach(btn => {
      if (btn.dataset.style === style) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

// 加载已保存的简历
function loadSavedResume() {
  chrome.storage.local.get(['resumes', 'currentResume'], (result) => {
    const resumeSelector = document.getElementById('resumeSelector');
    const noResumeHint = document.getElementById('noResumeHint');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resumeSelect = document.getElementById('resumeSelect');
    
    let resumes = result.resumes || [];
    
    // 迁移旧数据
    if (result.currentResume && resumes.length === 0) {
      resumes = [{
        id: Date.now(),
        name: result.currentResume.filename || '我的简历',
        filename: result.currentResume.filename,
        content: result.currentResume.content,
        fileSize: result.currentResume.fileSize,
        uploadedAt: result.currentResume.uploadedAt || new Date().toISOString(),
        parseMethod: result.currentResume.parseMethod || 'local-text',
        isDefault: true
      }];
      chrome.storage.local.set({ resumes });
    }
    
    if (resumes.length > 0) {
      // 填充下拉框
      resumeSelect.innerHTML = resumes.map(resume => `
        <option value="${resume.id}" ${resume.isDefault ? 'selected' : ''}>
          ${resume.name} ${resume.isDefault ? '(默认)' : ''}
        </option>
      `).join('');
      
      // 设置当前简历
      const defaultResume = resumes.find(r => r.isDefault) || resumes[0];
      currentResume = defaultResume;
      
      // 显示选择器，隐藏提示
      resumeSelector.classList.remove('hidden');
      noResumeHint.classList.add('hidden');
      analyzeBtn.classList.remove('hidden');
    } else {
      // 显示提示，隐藏选择器
      resumeSelector.classList.add('hidden');
      noResumeHint.classList.remove('hidden');
      analyzeBtn.classList.add('hidden');
    }
  });
}

// 显示消息提示
function showMessage(message, type = 'info') {
  // 创建提示元素
  const alert = document.createElement('div');
  alert.className = `message ${type}`;
  alert.textContent = message;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 3000);
}


// 保存历史记录
function saveToHistory(jobData, matchScore, strengths, gaps, greeting) {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    
    const record = {
      id: Date.now(),
      company: jobData.company,
      title: jobData.title,
      score: matchScore,
      strengths: strengths,
      gaps: gaps,
      greeting: greeting,
      timestamp: new Date().toISOString()
    };
    
    // 添加到历史记录开头，最多保留20条
    history.unshift(record);
    if (history.length > 20) {
      history.pop();
    }
    
    chrome.storage.local.set({ history }, () => {
      console.log('历史记录已保存');
    });
  });
}
