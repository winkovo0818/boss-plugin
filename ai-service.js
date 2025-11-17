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
- 经验要求：${jobData.experience || '未注明'}
- 学历要求：${jobData.education || '未注明'}
- 核心技能：${jobData.skills.length > 0 ? jobData.skills.join('、') : '请查看职位描述'}
- 详细描述：${jobData.description.substring(0, 1000)}

## 候选人简历
${resumeData.content}

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

  const result = await callAIAPI(prompt);
  return JSON.parse(result);
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


  const greeting = await callAIAPI(prompt);
  return greeting.trim();
}

/**
 * 统一的AI API调用（OpenAI兼容格式）
 * 支持所有OpenAI兼容的API（OpenAI、Kimi、智谱、通义千问、Claude中转等）
 */
async function callAIAPI(prompt) {
  const config = await getAIConfig();
  
  if (!config.apiKey) {
    throw new Error('请先在设置中配置AI API Key');
  }
  
  if (!config.baseURL) {
    throw new Error('请在设置页面配置API的BaseURL');
  }
  
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API调用失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeWithAI,
    generateGreetingWithAI,
    saveAIConfig,
    getAIConfig
  };
}
