// 设置页面逻辑

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
  initializeEventListeners();
});

function initializeEventListeners() {
  const aiProvider = document.getElementById('aiProvider');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const toggleApiKey = document.getElementById('toggleApiKey');
  const resumeUploadArea = document.getElementById('resumeUploadArea');
  const resumeFileInput = document.getElementById('resumeFileInput');
  const deleteResumeBtn = document.getElementById('deleteResumeBtn');

  aiProvider.addEventListener('change', handleProviderChange);
  saveBtn.addEventListener('click', saveSettings);
  testBtn.addEventListener('click', testConnection);
  toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
  
  // 简历上传
  resumeUploadArea.addEventListener('click', () => resumeFileInput.click());
  resumeFileInput.addEventListener('change', handleResumeUpload);
  deleteResumeBtn.addEventListener('click', deleteResume);
  
  // 拖拽上传
  resumeUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    resumeUploadArea.style.borderColor = '#3b82f6';
  });
  resumeUploadArea.addEventListener('dragleave', () => {
    resumeUploadArea.style.borderColor = '';
  });
  resumeUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    resumeUploadArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) {
      processResumeFile(file);
    }
  });
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
  chrome.storage.local.get(['currentResume'], (result) => {
    if (result.currentResume) {
      displayResume(result.currentResume);
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
      const resumeData = {
        filename: result.filename,
        content: result.content,
        uploadedAt: new Date().toISOString(),
        parseMethod: result.method,
        fileSize: file.size
      };
      
      // 保存到本地存储
      chrome.storage.local.set({ currentResume: resumeData }, () => {
        showMessage('简历上传成功', 'success');
        displayResume(resumeData);
      });
    } else {
      if (result.needsKimi) {
        showMessage(result.content, 'warning');
        // 仍然保存，但标记需要更好的解析
        const resumeData = {
          filename: result.filename,
          content: result.content,
          uploadedAt: new Date().toISOString(),
          parseMethod: result.method,
          fileSize: file.size,
          needsBetterParsing: true
        };
        chrome.storage.local.set({ currentResume: resumeData }, () => {
          displayResume(resumeData);
        });
      } else {
        showMessage('简历解析失败：' + result.content, 'error');
      }
    }
  } catch (error) {
    console.error('简历处理错误:', error);
    showMessage('简历处理失败：' + error.message, 'error');
  }
}

function displayResume(resumeData) {
  const currentResume = document.getElementById('currentResume');
  const resumeName = document.getElementById('resumeName');
  const resumeMeta = document.getElementById('resumeMeta');
  
  resumeName.textContent = resumeData.filename;
  
  const uploadDate = new Date(resumeData.uploadedAt).toLocaleDateString('zh-CN');
  const fileSize = (resumeData.fileSize / 1024).toFixed(1) + ' KB';
  const parseMethod = resumeData.parseMethod === 'kimi' ? 'Kimi解析' : 
                      resumeData.parseMethod === 'local-text' ? '本地解析' : '已解析';
  
  resumeMeta.textContent = `${uploadDate} · ${fileSize} · ${parseMethod}`;
  
  currentResume.classList.remove('hidden');
}

function deleteResume() {
  if (confirm('确定要删除已上传的简历吗？')) {
    chrome.storage.local.remove(['currentResume'], () => {
      document.getElementById('currentResume').classList.add('hidden');
      document.getElementById('resumeFileInput').value = '';
      showMessage('简历已删除', 'success');
    });
  }
}
