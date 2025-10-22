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
        showMessage(`分析失败：${errorMsg}。已自动重试3次，请检查网络或API配置`, 'error');
        
        // 显示重新分析按钮
        analyzeBtn.textContent = '重新分析';
        analyzeBtn.classList.remove('hidden');
      }
    });
  } catch (error) {
    loading.classList.add('hidden');
    analyzeBtn.disabled = false;
    showMessage(`发生错误：${error.message}。请检查网络连接或API配置`, 'error');
    
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
  
  if (!aiConfig || !aiConfig.apiKey || aiConfig.provider === 'none') {
    console.log('未配置AI，抛出异常');
    throw new Error('未配置AI');
  }
  
  console.log('开始调用AI生成三种风格...');
  
  // 构建匹配优势文本
  const strengthsText = matchResult.strengths && matchResult.strengths.length > 0
    ? matchResult.strengths.slice(0, 3).join('\n- ')
    : '相关工作经验';
  
  const prompt = `你是一名真实的求职者（数据分析师/产品经理），正在BOSS直聘上给HR发第一条消息。

【核心原则：像真人聊天，不要像AI写作文】
- 用"我"，不用"本人"、"候选人"
- 用口语："做过"、"降了"、"挺感兴趣"、"可以聊聊"
- 不用书面语："贵司"、"高度契合"、"期待深入交流"、"于XX主导"
- 说人话，不要打官腔

【目标岗位】
职位：${jobData.title}
公司：${jobData.company}
JD核心要求：
${jobData.description}

【JD关键匹配点】（重要：必须从JD中提取并在打招呼中体现）
- 技能要求：__从JD中提取核心技能__
- 业务场景：__从JD中提取业务场景__
- 工具/平台：__从JD中提取工具要求__

【候选人核心优势】
- ${strengthsText}

【完整简历】
${resumeData.content}

【优秀案例参考 - 口语化版本】
"您好，看到贵公司的数据分析岗，我2年Python+SQL经验比较匹配。在美的做过销售数据分析，处理500万条数据，搭了XGBoost预测模型，库存积压和周转率都优化了10-20%。在某电商项目做过爬虫和BI报表，支持补货决策，运输成本省了30%。对用户增长和AB测试这块挺感兴趣，可以聊聊。"

【写作规则 - 严格执行】

**语气与风格（像朋友聊天）：**
- 开门见山："看到XX岗位，我X年经验比较匹配"
- 用口语动词：做过、搭了、处理、降了、省了
- 不用形容词：不说"丰富经验"、"深入理解"、"高度契合"
- 结尾随意点："挺感兴趣"、"可以聊聊"，不说"期待深入交流"

**核心结构（自然分段）：**
开头：看到XX岗位，我X年XX经验比较匹配。
项目1：在XX公司做过XX，用XX技术，XX指标降了/提了XX%。
项目2：在XX项目做过XX，搭了XX系统，成本省了/效率提了XX%。
结尾：对XX这块挺感兴趣，可以聊聊。

**必须做到：**
1. 用"我X年经验"，不说"本人"、"贵司"
2. 动词口语化：做过、搭了、降了、省了（不用：主导、构建、降低、节省）
3. 每个项目独立一句话，用句号分开
4. 每个项目必须有：公司名+做了什么+用什么技术+数据结果
5. 数字直接说：降了10%、省了30%（不说：降低10%、节省30%）
6. 结尾自然："对XX挺感兴趣，可以聊聊"（不说：期待深入交流、希望有机会）

**三种风格差异：**
1. **轻松风格**："您好，看到XX岗位...挺感兴趣，可以聊聊"
2. **正式风格**："您好，贵公司XX岗位...希望有机会进一步交流"
3. **创意风格**：开门见山，直接切入项目成果，少说废话

**严格禁止（会被识破）：**
- 书面语：贵司、本人、高度契合、于XX主导、期待深入交流
- AI词汇：擅长、精通、深耕、赋能、助力、驱动
- 文言文动词：于、主导、构建、赋能（要用：在、做、搭、降）
- 逗号流水账："做了A，实现了B，完成了C" → 要分句
- 项目混淆："在A公司做XX，并在B项目做YY" → 必须分开
- 没数据：每个项目必须有百分比或规模数字
- 太正式：不说"尊敬的HR"，就说"您好"
- 超过120字

**输出格式：**
严格JSON格式，不要markdown代码块：
{
  "casual": "轻松风格内容",
  "formal": "正式风格内容",
  "creative": "创意风格内容"
}`;

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
    greetingText.textContent = `生成失败：${error.message}`;
    showMessage('打招呼语句生成失败，请检查API配置', 'error');
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
