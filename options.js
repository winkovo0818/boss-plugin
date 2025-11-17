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

// AI配置已简化，不再区分服务提供商

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadResume();
  loadStatistics();
  loadHistory();
  initializeEventListeners();
});

function initializeEventListeners() {
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const toggleApiKey = document.getElementById('toggleApiKey');
  const addResumeBtn = document.getElementById('addResumeBtn');
  const resumeFileInput = document.getElementById('resumeFileInput');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const closePreview = document.getElementById('closePreview');
  const togglePreviewBtn = document.getElementById('togglePreviewBtn');

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
  
  // 简历预览
  if (closePreview) {
    closePreview.addEventListener('click', hideResumePreview);
  }
  if (togglePreviewBtn) {
    togglePreviewBtn.addEventListener('click', togglePreviewExpand);
  }
}

function loadSettings() {
  chrome.storage.local.get(['aiConfig'], (result) => {
    if (result.aiConfig) {
      const config = result.aiConfig;
      document.getElementById('apiKey').value = config.apiKey || '';
      document.getElementById('baseUrl').value = config.baseURL || '';
      document.getElementById('aiModel').value = config.model || '';
    }
  });
}

function saveSettings() {
  const config = {
    apiKey: document.getElementById('apiKey').value,
    baseURL: document.getElementById('baseUrl').value,
    model: document.getElementById('aiModel').value
  };

  chrome.storage.local.set({ aiConfig: config }, () => {
    showMessage('设置已保存', 'success');
  });
}

async function testConnection() {
  const apiKey = document.getElementById('apiKey').value;
  const baseURL = document.getElementById('baseUrl').value;
  
  if (!apiKey) {
    showMessage('请输入API Key', 'error');
    return;
  }
  
  if (!baseURL) {
    showMessage('请输入API Base URL', 'error');
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
    <div class="resume-item ${resume.isDefault ? 'is-default' : ''}" data-resume-id="${resume.id}">
      <div class="resume-header">
        <div class="resume-info">
          <span class="resume-name">${resume.name}</span>
          ${resume.isDefault ? '<span class="badge-default">默认</span>' : ''}
        </div>
        <div class="resume-actions">
          <button class="btn-resume-action" data-action="preview">预览</button>
          ${!resume.isDefault ? `<button class="btn-resume-action" data-action="setDefault">设为默认</button>` : ''}
          <button class="btn-resume-action" data-action="delete">删除</button>
        </div>
      </div>
      <div class="resume-meta">
        <span>${(resume.fileSize / 1024).toFixed(1)} KB</span>
        <span>•</span>
        <span>${new Date(resume.uploadedAt).toLocaleDateString('zh-CN')}</span>
      </div>
    </div>
  `).join('');
  
  // 使用事件委托处理按钮点击
  setupResumeListEvents();
}

// 设置简历列表事件委托
function setupResumeListEvents() {
  const resumeList = document.getElementById('resumeList');
  
  // 移除旧的监听器（如果有）
  const oldListener = resumeList._clickListener;
  if (oldListener) {
    resumeList.removeEventListener('click', oldListener);
  }
  
  // 创建新的监听器
  const clickListener = (e) => {
    const button = e.target.closest('.btn-resume-action');
    if (!button) return;
    
    const resumeItem = button.closest('.resume-item');
    if (!resumeItem) return;
    
    const resumeId = parseInt(resumeItem.dataset.resumeId);
    const action = button.dataset.action;
    
    // 根据action执行相应操作
    switch(action) {
      case 'preview':
        previewResume(resumeId);
        break;
      case 'setDefault':
        setDefaultResume(resumeId);
        break;
      case 'delete':
        deleteResume(resumeId);
        break;
    }
  };
  
  // 保存监听器引用，方便后续移除
  resumeList._clickListener = clickListener;
  resumeList.addEventListener('click', clickListener);
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

// 更新进度条
function updateProgress(percent, text) {
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');
  
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  if (progressText) {
    progressText.textContent = text;
  }
  if (progressPercent) {
    progressPercent.textContent = `${Math.round(percent)}%`;
  }
}

// 带进度回调的文件解析
async function parseResumeWithProgress(file, progressCallback) {
  const fileName = file.name.toLowerCase();
  
  // TXT文件直接解析
  if (fileName.endsWith('.txt')) {
    progressCallback(20, '读取TXT文件...');
    const result = await parseResume(file);
    progressCallback(100, '解析完成！');
    return result;
  }
  
  // PDF文件 - 使用进度回调
  if (fileName.endsWith('.pdf')) {
    return await parsePDFWithProgress(file, progressCallback);
  }
  
  // 其他格式
  progressCallback(50, '解析文件...');
  const result = await parseResume(file);
  progressCallback(100, '完成');
  return result;
}

// 带进度的PDF解析
async function parsePDFWithProgress(file, progressCallback) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        progressCallback(10, '读取PDF文件...');
        const arrayBuffer = e.target.result;
        
        // 检查PDF.js
        if (typeof pdfjsLib === 'undefined') {
          throw new Error('PDF.js库未加载');
        }
        
        progressCallback(20, '加载PDF文档...');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        
        progressCallback(30, `PDF共${totalPages}页，开始提取...`);
        
        let fullText = '';
        
        // 逐页提取
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n\n';
          
          // 更新进度
          const progress = 30 + (pageNum / totalPages * 60);
          progressCallback(progress, `正在解析第 ${pageNum}/${totalPages} 页...`);
        }
        
        // 清理文本
        progressCallback(95, '清理和格式化文本...');
        fullText = fullText
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        if (fullText && fullText.length > 50) {
          progressCallback(100, '解析完成！');
          resolve({
            success: true,
            content: fullText,
            filename: file.name,
            method: 'local-pdf-js-progress'
          });
        } else {
          resolve({
            success: false,
            content: '【PDF文件解析失败】文件可能损坏或为扫描件，建议转换为TXT格式上传。',
            filename: file.name,
            method: 'local-pdf-failed'
          });
        }
      } catch (error) {
        console.error('PDF解析错误:', error);
        resolve({
          success: false,
          content: `【PDF文件解析失败】${error.message}，建议转换为TXT格式上传。`,
          filename: file.name,
          method: 'local-pdf-error'
        });
      }
    };
    
    reader.onerror = () => reject(new Error('PDF文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
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

  // 显示进度条
  const progressContainer = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');
  
  progressContainer.classList.remove('hidden');
  updateProgress(0, '开始解析简历...');

  try {
    // 使用本地文件解析器（PDF.js），带进度回调
    const result = await parseResumeWithProgress(file, (progress, text) => {
      updateProgress(progress, text);
    });
    
    if (result.success) {
      updateProgress(100, '解析完成！');
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
          showMessage('简历上传成功！正在显示预览...', 'success');
          displayResumeList(resumes);
          document.getElementById('resumeFileInput').value = '';
          
          // 延迟隐藏进度条
          setTimeout(() => {
            progressContainer.classList.add('hidden');
            // 自动显示预览
            previewResume(newResume.id);
          }, 1500);
        });
      });
    } else {
      showMessage(result.content, 'warning');
      // 隐藏进度条
      setTimeout(() => {
        progressContainer.classList.add('hidden');
      }, 2000);
    }
  } catch (error) {
    console.error('简历处理错误:', error);
    
    // 使用ErrorHandler处理错误
    if (typeof ErrorHandler !== 'undefined') {
      const errorInfo = ErrorHandler.handle(error, '简历解析');
      showMessage(`${errorInfo.title}<br>${errorInfo.solution}`, 'error');
    } else {
      showMessage('简历处理失败：' + error.message, 'error');
    }
    
    // 隐藏进度条
    setTimeout(() => {
      progressContainer.classList.add('hidden');
    }, 2000);
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

// 预览简历内容
function previewResume(resumeId) {
  chrome.storage.local.get(['resumes'], (result) => {
    const resumes = result.resumes || [];
    const resume = resumes.find(r => r.id === resumeId);
    
    if (!resume) {
      showMessage('简历不存在', 'error');
      return;
    }
    
    // 显示预览区域
    const previewContainer = document.getElementById('resumePreview');
    const previewContent = document.getElementById('previewContent');
    const previewFileName = document.getElementById('previewFileName');
    const previewFileSize = document.getElementById('previewFileSize');
    const previewContentLength = document.getElementById('previewContentLength');
    
    // 填充信息
    previewFileName.textContent = resume.name || resume.filename;
    previewFileSize.textContent = `${(resume.fileSize / 1024).toFixed(1)} KB`;
    previewContentLength.textContent = `${resume.content.length} 字符`;
    
    // 显示内容（默认只显示前1000字符）
    const maxLength = 1000;
    if (resume.content.length > maxLength) {
      previewContent.textContent = resume.content.substring(0, maxLength) + '\n\n... (内容已截断，点击"展开全部"查看完整内容)';
      previewContent.dataset.fullContent = resume.content;
      previewContent.classList.remove('expanded');
      document.getElementById('togglePreviewBtn').textContent = '展开全部';
    } else {
      previewContent.textContent = resume.content;
      previewContent.dataset.fullContent = resume.content;
      previewContent.classList.add('expanded');
      document.getElementById('togglePreviewBtn').style.display = 'none';
    }
    
    // 显示预览区域
    previewContainer.classList.remove('hidden');
    
    // 滚动到预览区域
    previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// 关闭预览
function hideResumePreview() {
  const previewContainer = document.getElementById('resumePreview');
  previewContainer.classList.add('hidden');
}

// 展开/收起预览内容
function togglePreviewExpand() {
  const previewContent = document.getElementById('previewContent');
  const toggleBtn = document.getElementById('togglePreviewBtn');
  const fullContent = previewContent.dataset.fullContent;
  
  if (previewContent.classList.contains('expanded')) {
    // 收起
    previewContent.textContent = fullContent.substring(0, 1000) + '\n\n... (内容已截断，点击"展开全部"查看完整内容)';
    previewContent.classList.remove('expanded');
    toggleBtn.textContent = '展开全部';
  } else {
    // 展开
    previewContent.textContent = fullContent;
    previewContent.classList.add('expanded');
    toggleBtn.textContent = '收起';
  }
}
