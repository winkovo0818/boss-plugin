// AI服务模块 - 用于集成各种AI API

/**
 * AI服务配置
 * 支持多种AI提供商：OpenAI, Claude, 智谱AI, 通义千问等
 */
const AI_CONFIG = {
  provider: 'openai', // 可选: openai, claude, zhipu, qwen
  apiKey: '', // 需要用户在设置中配置
  baseURL: '',
  model: 'gpt-3.5-turbo'
};

/**
 * 使用AI分析简历与岗位匹配度
 */
async function analyzeWithAI(jobData, resumeData) {
  const prompt = `你是一位专业的HR招聘顾问，擅长分析候选人简历与岗位的匹配度。请仔细阅读以下岗位要求和候选人简历，给出专业的匹配分析。

## 岗位信息
- 职位名称：${jobData.title}
- 公司：${jobData.company}
- 薪资范围：${jobData.salary}
- 经验要求：${jobData.experience || '未注明'}
- 学历要求：${jobData.education || '未注明'}
- 核心技能：${jobData.skills.length > 0 ? jobData.skills.join('、') : '请查看职位描述'}
- 详细描述：${jobData.description.substring(0, 1000)}

## 候选人简历
${resumeData.content.substring(0, 3000)}

## 分析要求
请从以下维度进行专业分析：

1. **匹配分数** (0-100)
   - 综合考虑技能匹配、经验匹配、学历匹配、项目经验等
   - 90-100：非常匹配
   - 75-89：高度匹配
   - 60-74：较好匹配
   - 低于60：匹配度不足

2. **候选人优势** (3-5条)
   - 列出候选人的核心优势，特别是与岗位直接相关的能力和经验
   - 每条优势简洁明确，20字以内

3. **可提升点** (2-4条)
   - 指出候选人相对于岗位要求的不足之处或可以改进的地方
   - 如果匹配度很高，可以少列一些

4. **投递建议**
   - "highly_recommend"：强烈推荐（分数>=85）
   - "recommend"：推荐投递（分数>=70）
   - "consider"：可以考虑（分数>=60）
   - "not_recommend"：不建议投递（分数<60）

5. **总体评价**
   - 用一句话（30-60字）总结匹配情况和核心理由

## 输出格式
请以下面的JSON格式返回，确保是标准的JSON格式：
{
  "matchScore": 85,
  "strengths": ["技能匹配度高，精通岗位要求的核心技术", "项目经验丰富，有相关领域实践", "学历背景符合要求"],
  "gaps": ["某项技能经验可再加强", "建议补充XX项目经验"],
  "recommendation": "recommend",
  "analysis": "候选人技能与经验与岗位高度匹配，有相关项目经验，建议投递。"
}

注意：请只返回JSON数据，不要添加任何其他说明文字。`;

  try {
    const result = await callAIAPI(prompt);
    return JSON.parse(result);
  } catch (error) {
    console.error('AI分析失败:', error);
    // 降级到本地算法
    return fallbackAnalysis(jobData, resumeData);
  }
}

/**
 * 使用AI生成打招呼语句
 */
async function generateGreetingWithAI(jobData, resumeData, style, matchResult) {
  const styleGuides = {
    casual: {
      tone: '轻松、友好、亲切',
      example: '你好！看到贵公司的XX职位...',
      tips: '可以用"你好"、"Hi"开头，语气自然亲切'
    },
    formal: {
      tone: '正式、礼貌、尊重',
      example: '尊敬的HR，您好！我对贵公司的XX职位...',
      tips: '用"您好"、"尊敬的"等礼貌用语，体现专业素养'
    },
    professional: {
      tone: '专业、简洁、高效',
      example: '您好！注意到贵公司XX职位，我的技术栈...',
      tips: '直接切入重点，突出技术和项目匹配度'
    }
  };

  const guide = styleGuides[style];
  
  const prompt = `你是一位资深的职业咨询师，擅长帮助求职者撰写专业的求职打招呼语句。请根据以下信息，生成一条${guide.tone}的BOSS直聘打招呼消息。

## 岗位信息
- 职位：${jobData.title}
- 公司：${jobData.company}
- 薪资：${jobData.salary}
- 核心要求：${jobData.skills.slice(0, 3).join('、')}

## 候选人匹配分析
- 匹配度：${matchResult.matchScore}/100
- 核心优势：
${matchResult.strengths.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

## 风格要求
- 语气：${guide.tone}
- 参考：${guide.example}
- 注意：${guide.tips}

## 撰写要求
1. **字数**：80-120字（BOSS直聘打招呼字数限制）
2. **结构**：
   - 开头：礼貌称呼 + 表达兴趣
   - 中间：简明突出1-2个核心优势（结合岗位要求）
   - 结尾：表达沟通意愿
3. **内容**：
   - 突出与岗位最匹配的优势
   - 避免空洞的客套话
   - 不要重复简历内容，点到为止
   - 体现对岗位的了解
4. **禁忌**：
   - 不要过度谦虚或过度自信
   - 不要提及薪资
   - 不要问"是否还在招聘"
   - 不要使用生僻词或网络用语

## 输出格式
请直接输出打招呼内容，不要添加任何说明文字、引号或其他格式。`;


  try {
    const greeting = await callAIAPI(prompt);
    return greeting.trim();
  } catch (error) {
    console.error('AI生成失败:', error);
    // 降级到模板生成
    return fallbackGreeting(jobData, style);
  }
}

/**
 * 调用AI API
 */
async function callAIAPI(prompt) {
  // 从storage获取API配置
  const config = await getAIConfig();
  
  if (!config.apiKey) {
    throw new Error('请先在设置中配置AI API Key');
  }

  switch (config.provider) {
    case 'kimi':
      return await callKimi(prompt, config);
    case 'openai':
      return await callOpenAI(prompt, config);
    case 'claude':
      return await callClaude(prompt, config);
    case 'zhipu':
      return await callZhipu(prompt, config);
    case 'qwen':
      return await callQwen(prompt, config);
    default:
      throw new Error('不支持的AI提供商');
  }
}

/**
 * 调用Kimi API (Moonshot AI)
 */
async function callKimi(prompt, config) {
  const response = await fetch(config.baseURL || 'https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'moonshot-v1-8k',
      messages: [
        { role: 'system', content: '你是 Kimi，由 Moonshot AI 提供的人工智能助手。你是一个专业的招聘顾问，擅长分析简历与岗位匹配度，以及撰写求职打招呼语句。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kimi API调用失败: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用OpenAI API
 */
async function callOpenAI(prompt, config) {
  const response = await fetch(config.baseURL || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一个专业的招聘顾问助手。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API调用失败: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用Claude API
 */
async function callClaude(prompt, config) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API调用失败: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * 调用智谱AI API
 */
async function callZhipu(prompt, config) {
  // 智谱AI API实现
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'glm-4',
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`智谱AI API调用失败: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用通义千问API
 */
async function callQwen(prompt, config) {
  // 通义千问API实现
  throw new Error('通义千问API集成待实现');
}

/**
 * 获取AI配置
 */
async function getAIConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiConfig'], (result) => {
      resolve(result.aiConfig || AI_CONFIG);
    });
  });
}

/**
 * 保存AI配置
 */
async function saveAIConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ aiConfig: config }, resolve);
  });
}

/**
 * 降级方案：本地分析算法
 */
function fallbackAnalysis(jobData, resumeData) {
  // 使用background.js中的本地算法
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
  
  // 工作经验匹配
  if (jobDesc.includes('经验') && resumeText.includes('年')) {
    score += 20;
  }
  
  const matchScore = Math.min(Math.round(score), 100);
  
  return {
    matchScore: matchScore,
    strengths: skillMatches.slice(0, 5).map(s => `具备${s}技能`),
    gaps: jobData.skills.filter(s => !resumeText.includes(s.toLowerCase())).slice(0, 5).map(s => `缺少${s}相关经验`),
    recommendation: matchScore >= 70 ? 'recommend' : 'not_recommend',
    analysis: matchScore >= 70 ? '您的简历与该岗位较为匹配，建议投递。' : '您的简历与该岗位匹配度较低，建议寻找更合适的岗位。'
  };
}

/**
 * 降级方案：模板生成打招呼语句
 */
function fallbackGreeting(jobData, style) {
  const templates = {
    casual: `你好！看到贵公司${jobData.title}的招聘，我很感兴趣。我在相关领域有丰富经验，期待进一步交流！`,
    formal: `尊敬的HR，您好！我对贵公司发布的${jobData.title}职位非常感兴趣。期待有机会进一步沟通，谢谢！`,
    professional: `您好！我注意到贵公司${jobData.title}的岗位需求，我相信我的技术能力和项目经验能够快速为团队创造价值，期待详谈。`
  };
  
  return templates[style] || templates.casual;
}

/**
 * 提取关键词
 */
function extractKeywords(text) {
  const commonWords = ['的', '了', '和', '是', '在', '有', '与', '等', '及'];
  const words = text.match(/[\u4e00-\u9fa5a-zA-Z]{2,}/g) || [];
  return [...new Set(words)].filter(w => !commonWords.includes(w)).slice(0, 20);
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeWithAI,
    generateGreetingWithAI,
    saveAIConfig,
    getAIConfig
  };
}
