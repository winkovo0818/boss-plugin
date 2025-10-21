// 全局变量
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
    
    if (currentTab.url && currentTab.url.includes('zhipin.com/job_detail')) {
      // 从存储中获取岗位信息
      chrome.storage.local.get(['currentJob'], (result) => {
        if (result.currentJob) {
          currentJob = result.currentJob;
          displayJobInfo(currentJob);
        } else {
          // 尝试从页面提取
          chrome.tabs.sendMessage(currentTab.id, { action: 'extractJobDetails' }, (response) => {
            if (response && response.success) {
              currentJob = response.data;
              displayJobInfo(currentJob);
            }
          });
        }
      });
    } else {
      showMessage('请在BOSS直聘岗位详情页使用本插件', 'warning');
    }
  });
}

// 显示岗位信息
function displayJobInfo(job) {
  const jobInfo = document.getElementById('jobInfo');
  const jobTitle = document.getElementById('jobTitle');
  const jobCompany = document.getElementById('jobCompany');
  const jobSalary = document.getElementById('jobSalary');

  jobTitle.textContent = job.title || '未知职位';
  jobCompany.textContent = job.company || '未知公司';
  jobSalary.textContent = job.salary || '面议';

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

  // 设置按钮
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // 前往设置按钮
  goToSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 开始分析按钮
  analyzeBtn.addEventListener('click', () => {
    analyzeMatch();
  });

  // 复制按钮
  copyBtn.addEventListener('click', () => {
    const greetingText = document.getElementById('greetingText').textContent;
    navigator.clipboard.writeText(greetingText).then(() => {
      showMessage('已复制到剪贴板', 'success');
    });
  });

  // 重新生成按钮
  regenerateBtn.addEventListener('click', () => {
    generateGreeting(currentStyle);
  });

  // 风格选择按钮
  styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      styleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStyle = btn.dataset.style;
      generateGreeting(currentStyle);
    });
  });
}

// 分析匹配度
async function analyzeMatch() {
  if (!currentJob) {
    showMessage('未检测到岗位信息，请在BOSS直聘岗位详情页使用', 'error');
    return;
  }

  if (!currentResume) {
    showMessage('请先上传简历', 'error');
    return;
  }

  // 显示加载状态
  const loading = document.getElementById('loading');
  const analyzeBtn = document.getElementById('analyzeBtn');
  
  loading.classList.remove('hidden');
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
        displayMatchResult(matchResult);

        // 如果匹配度>=70，显示打招呼生成区域
        if (matchResult.matchScore >= 70) {
          document.getElementById('greetingSection').classList.remove('hidden');
          generateGreeting('casual');
        } else {
          document.getElementById('greetingSection').classList.add('hidden');
          showMessage('匹配度较低，建议寻找更合适的岗位', 'warning');
        }
      } else {
        showMessage('分析失败，请重试', 'error');
      }
    });
  } catch (error) {
    loading.classList.add('hidden');
    analyzeBtn.disabled = false;
    showMessage('分析出错：' + error.message, 'error');
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

// 生成打招呼语句
async function generateGreeting(style) {
  const greetingText = document.getElementById('greetingText');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const copyBtn = document.getElementById('copyBtn');
  
  // 显示加载状态
  greetingText.textContent = '正在生成打招呼语句...';
  regenerateBtn.disabled = true;
  copyBtn.disabled = true;
  
  try {
    // 先尝试使用AI生成
    const greeting = await generateGreetingWithAI(currentJob, currentResume, style, matchResult);
    greetingText.textContent = greeting;
    showMessage('打招呼语句生成成功', 'success');
  } catch (error) {
    console.error('AI生成失败，使用模板:', error);
    
    // 降级到模板生成
    const greetings = {
      casual: [
        `你好！看到贵公司${currentJob.title}的招聘，我很感兴趣。我在相关领域有丰富经验，特别是${currentJob.skills.slice(0, 2).join('、')}方面，相信能为团队带来价值。期待进一步交流！`,
        `Hi！对${currentJob.title}这个岗位很有兴趣，我的背景和岗位要求挺匹配的。方便聊聊吗？`
      ],
      formal: [
        `尊敬的HR，您好！我对贵公司发布的${currentJob.title}职位非常感兴趣。经过仔细研读岗位要求，我认为我的专业背景和工作经验与该职位高度匹配。期待有机会进一步沟通，谢谢！`,
        `您好！我对贵公司的${currentJob.title}职位很感兴趣。我具备相关工作经验，熟练掌握${currentJob.skills.slice(0, 3).join('、')}等技能。诚挚希望能有机会加入团队。`
      ],
      professional: [
        `您好！我注意到贵公司${currentJob.title}的岗位需求，我在${currentJob.skills.slice(0, 2).join('、')}方面有项目经验，相信能快速为团队创造价值。期待详谈。`,
        `您好！看到${currentJob.title}职位后，我发现自己的技术栈与岗位要求高度匹配。我擅长${currentJob.skills.slice(0, 2).join('、')}，期待有机会分享项目经验。`
      ]
    };
    
    const styleGreetings = greetings[style] || greetings.professional;
    const randomGreeting = styleGreetings[Math.floor(Math.random() * styleGreetings.length)];
    greetingText.textContent = randomGreeting;
    showMessage('AI不可用，使用模板生成', 'warning');
  } finally {
    regenerateBtn.disabled = false;
    copyBtn.disabled = false;
  }

  // 高亮选中的风格按钮
  document.querySelectorAll('.style-btn').forEach(btn => {
    if (btn.dataset.style === style) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // 保存当前风格
  currentStyle = style;
}

// 加载已保存的简历
function loadSavedResume() {
  chrome.storage.local.get(['currentResume'], (result) => {
    const resumeStatus = document.getElementById('resumeStatus');
    const noResumeHint = document.getElementById('noResumeHint');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    if (result.currentResume) {
      currentResume = result.currentResume;
      const resumeInfo = document.getElementById('resumeInfo');
      resumeInfo.textContent = `✓ ${currentResume.filename}`;
      
      // 显示简历状态，隐藏提示
      resumeStatus.classList.remove('hidden');
      noResumeHint.classList.add('hidden');
      analyzeBtn.classList.remove('hidden');
    } else {
      // 显示提示，隐藏状态
      resumeStatus.classList.add('hidden');
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
