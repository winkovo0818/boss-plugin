// 后台服务worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('BOSS直聘招聘助手已安装');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeMatch') {
    // 这里可以调用AI API进行匹配分析
    analyzeJobMatch(request.jobData, request.resumeData)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// AI匹配分析函数
async function analyzeJobMatch(jobData, resumeData) {
  // 这里需要集成AI API (如OpenAI, Claude等)
  // 示例返回格式
  
  // 简单的关键词匹配算法（实际应该调用AI API）
  const matchScore = calculateMatchScore(jobData, resumeData);
  
  return {
    matchScore: matchScore,
    analysis: generateAnalysis(jobData, resumeData, matchScore),
    recommendation: matchScore >= 70 ? 'recommend' : 'not_recommend',
    strengths: extractStrengths(jobData, resumeData),
    gaps: extractGaps(jobData, resumeData)
  };
}

// 计算匹配分数
function calculateMatchScore(jobData, resumeData) {
  let score = 0;
  const jobDesc = (jobData.description + ' ' + jobData.skills.join(' ')).toLowerCase();
  const resumeText = resumeData.content.toLowerCase();
  
  // 技能匹配
  const skillMatches = jobData.skills.filter(skill => 
    resumeText.includes(skill.toLowerCase())
  );
  score += (skillMatches.length / Math.max(jobData.skills.length, 1)) * 50;
  
  // 关键词匹配
  const keywords = extractKeywords(jobDesc);
  const keywordMatches = keywords.filter(keyword => 
    resumeText.includes(keyword)
  );
  score += (keywordMatches.length / Math.max(keywords.length, 1)) * 30;
  
  // 工作经验匹配（简化版）
  if (jobDesc.includes('经验') && resumeText.includes('年')) {
    score += 20;
  }
  
  return Math.min(Math.round(score), 100);
}

// 提取关键词
function extractKeywords(text) {
  const commonWords = ['的', '了', '和', '是', '在', '有', '与', '等', '及'];
  const words = text.match(/[\u4e00-\u9fa5a-zA-Z]{2,}/g) || [];
  return [...new Set(words)].filter(w => !commonWords.includes(w)).slice(0, 20);
}

// 生成分析报告
function generateAnalysis(jobData, resumeData, matchScore) {
  if (matchScore >= 80) {
    return '您的简历与该岗位高度匹配，强烈建议投递！';
  } else if (matchScore >= 70) {
    return '您的简历与该岗位较为匹配，建议投递。';
  } else if (matchScore >= 50) {
    return '您的简历与该岗位部分匹配，可以尝试投递。';
  } else {
    return '您的简历与该岗位匹配度较低，建议寻找更合适的岗位。';
  }
}

// 提取优势
function extractStrengths(jobData, resumeData) {
  const strengths = [];
  const jobDesc = (jobData.description + ' ' + jobData.skills.join(' ')).toLowerCase();
  const resumeText = resumeData.content.toLowerCase();
  
  jobData.skills.forEach(skill => {
    if (resumeText.includes(skill.toLowerCase())) {
      strengths.push(`具备${skill}技能`);
    }
  });
  
  return strengths.slice(0, 5);
}

// 提取差距
function extractGaps(jobData, resumeData) {
  const gaps = [];
  const resumeText = resumeData.content.toLowerCase();
  
  jobData.skills.forEach(skill => {
    if (!resumeText.includes(skill.toLowerCase())) {
      gaps.push(`缺少${skill}相关经验`);
    }
  });
  
  return gaps.slice(0, 5);
}
