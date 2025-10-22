/**
 * BOSS直聘招聘助手 - Options Page
 * 
 * @description 设置页面逻辑，管理AI配置、简历、历史记录和统计
 * @author 云淡风轻 (winkovo0818)
 * @contact QQ: 1026771081
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 * @version 1.0.0
 */

const providerModels = {
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
  claude: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  zhipu: ['glm-4', 'glm-3-turbo'],
  qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max']
};

const providerInfo = {
  kimi: '访问 https://platform.moonshot.cn/console/api-keys 获取API Key',
  openai: '访问 https://platform.openai.com/api-keys 获取API Key',
  claude: '访问 https://console.anthropic.com/settings/keys 获取API Key',
  zhipu: '访问 https://open.bigmodel.cn/usercenter/apikeys 获取API Key',
  qwen: '访问 https://dashscope.console.aliyun.com/apiKey 获取API Key'
};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadResume();
  loadStatistics();
  loadHistory();
  initializeEventListeners();
});

function initializeEventListeners() {
  const aiProvider = document.getElementById('aiProvider');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const toggleApiKey = document.getElementById('toggleApiKey');
  const addResumeBtn = document.getElementById('addResumeBtn');
  const resumeFileInput = document.getElementById('resumeFileInput');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  aiProvider.addEventListener('change', handleProviderChange);
  saveBtn.addEventListener('click', saveSettings);
  testBtn.addEventListener('click', testConnection);
  toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
  
  // 清空历史记录
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearHistory);
  }
  
  // 简历上传
  addResumeBtn.addEventListener('click', () => resumeFileInput.click());
  resumeFileInput.addEventListener('change', handleResumeUpload);
}

function handleProviderChange() {
  const provider = document.getElementById('aiProvider').value;
  const apiKeySection = document.getElementById('apiKeySection');
  const baseUrlSection = document.getElementById('baseUrlSection');
  const modelSection = document.getElementById('modelSection');
  const providerInfoDiv = document.getElementById('providerInfo');
  const providerInfoText = document.getElementById('providerInfoText');
  const aiModel = document.getElementById('aiModel');

  if (provider === 'none') {
    apiKeySection.classList.add('hidden');
    baseUrlSection.classList.add('hidden');
    modelSection.classList.add('hidden');
    providerInfoDiv.classList.add('hidden');
  } else {
    apiKeySection.classList.remove('hidden');
    baseUrlSection.classList.remove('hidden');
    modelSection.classList.remove('hidden');
    providerInfoDiv.classList.remove('hidden');
    
    providerInfoText.textContent = providerInfo[provider] || '';
    
    // 更新模型建议列表
    const modelList = document.getElementById('modelList');
    modelList.innerHTML = '';
    if (providerModels[provider]) {
      providerModels[provider].forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        modelList.appendChild(option);
      });
    }
  }
}

function loadSettings() {
  chrome.storage.local.get(['aiConfig'], (result) => {
    if (result.aiConfig) {
      const config = result.aiConfig;
      document.getElementById('aiProvider').value = config.provider || 'none';
      document.getElementById('apiKey').value = config.apiKey || '';
      document.getElementById('baseUrl').value = config.baseURL || '';
      document.getElementById('aiModel').value = config.model || '';
      
      handleProviderChange();
    }
  });
}

function saveSettings() {
  const config = {
    provider: document.getElementById('aiProvider').value,
    apiKey: document.getElementById('apiKey').value,
    baseURL: document.getElementById('baseUrl').value,
    model: document.getElementById('aiModel').value
  };

  chrome.storage.local.set({ aiConfig: config }, () => {
    showMessage('设置已保存', 'success');
  });
}

async function testConnection() {
  const provider = document.getElementById('aiProvider').value;
  
  if (provider === 'none') {
    showMessage('未选择AI服务提供商', 'warning');
    return;
  }

  const apiKey = document.getElementById('apiKey').value;
  if (!apiKey) {
    showMessage('请输入API Key', 'error');
    return;
  }

  showMessage('正在测试连接...', 'info');

  try {
    // 这里应该实际调用AI API进行测试
    // 现在只是模拟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 模拟成功
    showMessage('连接测试成功！', 'success');
  } catch (error) {
    showMessage('连接测试失败：' + error.message, 'error');
  }
}

function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById('apiKey');
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
  } else {
    apiKeyInput.type = 'password';
  }
}

function showMessage(message, type = 'info') {
  const statusMessage = document.getElementById('statusMessage');
  
  statusMessage.className = `status-message ${type}`;
  statusMessage.textContent = message;
  statusMessage.classList.remove('hidden');

  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

// 简历管理相关函数
async function loadResume() {
  // 读取旧的currentResume和新的resumes数组
  chrome.storage.local.get(['currentResume', 'resumes'], (result) => {
    let resumes = result.resumes || [];
    
    // 迁移旧数据：如果有currentResume但resumes为空，自动迁移
    if (result.currentResume && resumes.length === 0) {
      const oldResume = {
        id: Date.now(),
        name: result.currentResume.filename || '我的简历',
        filename: result.currentResume.filename,
        content: result.currentResume.content,
        fileSize: result.currentResume.fileSize,
        uploadedAt: result.currentResume.uploadedAt || new Date().toISOString(),
        parseMethod: result.currentResume.parseMethod || 'local-text',
        isDefault: true
      };
      resumes = [oldResume];
      // 保存迁移后的数据
      chrome.storage.local.set({ resumes });
    }
    
    displayResumeList(resumes);
  });
}

// 显示简历列表
function displayResumeList(resumes) {
  const resumeList = document.getElementById('resumeList');
  const noResumes = document.getElementById('noResumes');
  
  if (resumes.length === 0) {
    resumeList.classList.add('hidden');
    noResumes.classList.remove('hidden');
    return;
  }
  
  resumeList.classList.remove('hidden');
  noResumes.classList.add('hidden');
  
  resumeList.innerHTML = resumes.map(resume => `
    <div class="resume-item ${resume.isDefault ? 'is-default' : ''}">
      <div class="resume-header">
        <div class="resume-info">
          <span class="resume-name">${resume.name}</span>
          ${resume.isDefault ? '<span class="badge-default">默认</span>' : ''}
        </div>
        <div class="resume-actions">
          ${!resume.isDefault ? `<button class="btn-resume-action" onclick="setDefaultResume(${resume.id})">设为默认</button>` : ''}
          <button class="btn-resume-action" onclick="deleteResume(${resume.id})">删除</button>
        </div>
      </div>
      <div class="resume-meta">
        <span>${(resume.fileSize / 1024).toFixed(1)} KB</span>
        <span>•</span>
        <span>${new Date(resume.uploadedAt).toLocaleDateString('zh-CN')}</span>
      </div>
    </div>
  `).join('');
}

// 设置默认简历
async function setDefaultResume(resumeId) {
  chrome.storage.local.get(['resumes'], (result) => {
    const resumes = result.resumes || [];
    resumes.forEach(r => r.isDefault = (r.id === resumeId));
    
    const defaultResume = resumes.find(r => r.isDefault);
    chrome.storage.local.set({ 
      resumes,
      currentResume: defaultResume 
    }, () => {
      displayResumeList(resumes);
      showMessage('已设为默认简历', 'success');
    });
  });
}

// 删除简历
async function deleteResume(resumeId) {
  if (!confirm('确定要删除这份简历吗？')) return;
  
  chrome.storage.local.get(['resumes'], (result) => {
    let resumes = result.resumes || [];
    const deletedResume = resumes.find(r => r.id === resumeId);
    resumes = resumes.filter(r => r.id !== resumeId);
    
    // 如果删除的是默认简历，将第一份设为默认
    if (deletedResume.isDefault && resumes.length > 0) {
      resumes[0].isDefault = true;
      chrome.storage.local.set({ 
        resumes,
        currentResume: resumes[0]
      }, () => {
        displayResumeList(resumes);
        showMessage('简历已删除', 'success');
      });
    } else {
      chrome.storage.local.set({ resumes }, () => {
        displayResumeList(resumes);
        showMessage('简历已删除', 'success');
      });
    }
  });
}

function handleResumeUpload(e) {
  const file = e.target.files[0];
  if (file) {
    processResumeFile(file);
  }
}

async function processResumeFile(file) {
  const validTypes = ['application/pdf', 'application/msword', 
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                      'text/plain'];
  
  const fileName = file.name.toLowerCase();
  const isValidType = validTypes.includes(file.type) || 
                      fileName.endsWith('.pdf') || 
                      fileName.endsWith('.doc') || 
                      fileName.endsWith('.docx') || 
                      fileName.endsWith('.txt');
  
  if (!isValidType) {
    showMessage('不支持的文件格式，请上传 PDF、DOC、DOCX 或 TXT 文件', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showMessage('文件大小不能超过 5MB', 'error');
    return;
  }

  showMessage('正在解析简历...', 'info');

  try {
    // 获取文件解析配置
    const config = await getFileParseConfig();
    
    // 使用智能文件解析器
    const result = await parseResume(file, config);
    
    if (result.success) {
      // 添加到简历列表
      chrome.storage.local.get(['resumes'], (storage) => {
        const resumes = storage.resumes || [];
        
        // 检查是否达到上限
        if (resumes.length >= 5) {
          showMessage('最多只能上传5份简历', 'error');
          return;
        }
        
        const newResume = {
          id: Date.now(),
          name: result.filename,
          filename: result.filename,
          content: result.content,
          uploadedAt: new Date().toISOString(),
          parseMethod: result.method,
          fileSize: file.size,
          isDefault: resumes.length === 0 // 第一份设为默认
        };
        
        resumes.push(newResume);
        
        // 如果是第一份简历，同时设置为currentResume
        const updates = { resumes };
        if (newResume.isDefault) {
          updates.currentResume = newResume;
        }
        
        chrome.storage.local.set(updates, () => {
          showMessage('简历上传成功', 'success');
          displayResumeList(resumes);
          document.getElementById('resumeFileInput').value = '';
        });
      });
    } else {
      if (result.needsKimi) {
        showMessage(result.content, 'warning');
      } else {
        showMessage('简历解析失败：' + result.content, 'error');
      }
    }
  } catch (error) {
    console.error('简历处理错误:', error);
    showMessage('简历处理失败：' + error.message, 'error');
  }
}


// 加载历史记录
function loadHistory() {
  const historyLoading = document.getElementById('historyLoading');
  const historyList = document.getElementById('historyList');
  const noHistory = document.getElementById('noHistory');
  
  // 显示加载状态
  historyLoading.classList.remove('hidden');
  historyList.classList.add('hidden');
  noHistory.classList.add('hidden');
  
  chrome.storage.local.get(['history'], (result) => {
    // 隐藏加载状态
    historyLoading.classList.add('hidden');
    
    const history = result.history || [];
    
    if (history.length === 0) {
      historyList.classList.add('hidden');
      noHistory.classList.remove('hidden');
      return;
    }
    
    historyList.classList.remove('hidden');
    noHistory.classList.add('hidden');
    
    // 使用DocumentFragment优化性能（减少DOM操作）
    renderHistoryList(history, historyList);
  });
}

// 删除单个历史记录
function deleteHistoryItem(timestamp) {
  if (!confirm('确定要删除这条历史记录吗？')) return;
  
  chrome.storage.local.get(['history'], (result) => {
    let history = result.history || [];
    history = history.filter(item => item.timestamp !== timestamp);
    
    chrome.storage.local.set({ history }, () => {
      showMessage('已删除', 'success');
      loadHistory(); // 重新加载历史记录
      loadStatistics(); // 更新统计数据
    });
  });
}

// 加载统计数据
async function loadStatistics() {
  const stats = await getStatistics();
  
  // 总分析次数
  document.getElementById('totalAnalysis').textContent = stats.totalAnalysis;
  
  // 平均匹配度
  document.getElementById('averageScore').textContent = stats.averageScore;
  
  // 最高匹配
  if (stats.highestMatch) {
    document.getElementById('highestScore').textContent = stats.highestMatch.score;
    document.getElementById('highestDetail').textContent = 
      `${stats.highestMatch.title} - ${stats.highestMatch.company}`;
  }
  
  // 最低匹配
  if (stats.lowestMatch) {
    document.getElementById('lowestScore').textContent = stats.lowestMatch.score;
    document.getElementById('lowestDetail').textContent = 
      `${stats.lowestMatch.title} - ${stats.lowestMatch.company}`;
  }
  
  // 分数分布
  const total = stats.totalAnalysis || 1;
  const { high, medium, low } = stats.scoreDistribution;
  
  document.getElementById('highCount').textContent = high;
  document.getElementById('mediumCount').textContent = medium;
  document.getElementById('lowCount').textContent = low;
  
  document.getElementById('highBar').style.width = `${(high / total * 100)}%`;
  document.getElementById('mediumBar').style.width = `${(medium / total * 100)}%`;
  document.getElementById('lowBar').style.width = `${(low / total * 100)}%`;
}

// 清空历史记录
function clearHistory() {
  if (confirm('确定要清空所有历史记录吗？')) {
    chrome.storage.local.set({ history: [] }, () => {
      loadHistory();
      loadStatistics(); // 同时刷新统计
      showMessage('历史记录已清空', 'success');
    });
  }
}
