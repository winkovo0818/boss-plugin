/**
 * BOSS直聘招聘助手 - Background Service Worker
 * 
 * @description 后台服务，处理AI匹配分析、缓存管理、隐私保护
 * @author 云淡风轻 (winkovo0818)
 * @contact QQ: 1026771081
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 * @version 1.0.0
 * @since 2025-10-22
 */

// 导入缓存管理器和隐私过滤器
importScripts('cache-manager.js');
importScripts('privacy-filter.js');

chrome.runtime.onInstalled.addListener(() => {
  console.log('BOSS直聘招聘助手已安装');
  // 清理过期缓存
  cleanExpiredCache();
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

// AI匹配分析函数（带缓存和隐私保护）
async function analyzeJobMatch(jobData, resumeData) {
  // 1. 先尝试从缓存获取
  const cached = await getCachedAnalysis(jobData, resumeData);
  if (cached) {
    console.log('使用缓存结果，节省API调用');
    return cached;
  }
  
  // 2. 隐私保护：过滤敏感信息
  const secureResume = securizeResumeData(resumeData);
  
  // 3. 缓存未命中，调用AI分析
  console.log('缓存未命中，调用AI分析');
  const aiResult = await calculateMatchScoreWithAI(jobData, secureResume);
  
  const result = {
    matchScore: aiResult.score,
    analysis: generateAnalysis(jobData, resumeData, aiResult.score),
    recommendation: aiResult.score >= 70 ? 'recommend' : 'not_recommend',
    strengths: aiResult.strengths,
    gaps: aiResult.gaps
  };
  
  // 4. 保存到缓存
  await setCachedAnalysis(jobData, resumeData, result);
  
  return result;
}

// 使用AI计算匹配分数
async function calculateMatchScoreWithAI(jobData, resumeData) {
  console.log('=== 开始AI匹配分析 ===');
  console.log('岗位标题:', jobData.title);
  console.log('岗位描述长度:', jobData.description.length);
  console.log('简历长度:', resumeData.content.length);
  
  // 获取AI配置
  const aiConfig = await getAIConfig();
  
  if (!aiConfig || !aiConfig.apiKey || aiConfig.provider === 'none') {
    throw new Error('未配置AI服务，请先在设置页配置API Key');
  }
  
  // 使用AI分析
  console.log('使用AI进行匹配分析...');
  const aiResult = await analyzeMatchWithAI(jobData, resumeData, aiConfig);
  console.log('AI分析完成，匹配度:', aiResult.score);
  return aiResult;
}

// 提取关键词
function extractKeywords(text) {
  const commonWords = ['的', '了', '和', '是', '在', '有', '与', '等', '及', '为', '将', '以', '及', '一个', '这个', '那个'];
  
  // 福利/非技能词汇黑名单
  const benefitWords = [
    '双休', '单休', '五险', '一金', '社保', '公积金', 
    '包住', '包吃', '年假', '调休', '周末', '法定',
    '带薪', '补贴', '补助', '奖金', '提成', '绩效',
    '团建', '旅游', '下午茶', '零食', '聚餐', '体检',
    '节日', '生日', '婚假', '产假', '陪产', '年终',
    '弹性', '福利', '氛围', '环境', '文化', '关怀'
  ];
  
  const words = [];
  
  // 提取中文词 - 先提取2-4字的词
  const chineseWords2 = text.match(/[\u4e00-\u9fa5]{2}/g) || [];
  const chineseWords3 = text.match(/[\u4e00-\u9fa5]{3}/g) || [];
  const chineseWords4 = text.match(/[\u4e00-\u9fa5]{4}/g) || [];
  
  // 合并并去重
  words.push(...chineseWords2, ...chineseWords3, ...chineseWords4);
  
  // 对于长词组，进行细分 - 例如"北美电商数据分析师"
  const longWords = text.match(/[\u4e00-\u9fa5]{5,}/g) || [];
  longWords.forEach(word => {
    // 先检查是否包含福利词，如果包含则跳过整个词
    if (benefitWords.some(bw => word.includes(bw))) {
      return;
    }
    
    // 将长词分解为2-3字的组合
    for (let i = 0; i <= word.length - 2; i++) {
      words.push(word.substring(i, i + 2));
      if (i <= word.length - 3) {
        words.push(word.substring(i, i + 3));
      }
      if (i <= word.length - 4) {
        words.push(word.substring(i, i + 4));
      }
    }
  });
  
  // 提取英文词
  const englishWords = text.match(/[a-zA-Z]{2,}/gi) || [];
  words.push(...englishWords);
  
  // 去重、过滤常用词和福利词、限制数量
  return [...new Set(words)]
    .filter(w => 
      !commonWords.includes(w) && 
      !benefitWords.includes(w) &&
      !benefitWords.some(bw => w.includes(bw)) &&
      w.length >= 2
    )
    .slice(0, 30);
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

// 调用AI进行匹配分析
async function analyzeMatchWithAI(jobData, resumeData, aiConfig) {
  const prompt = `# 角色定位
你是一位经验丰富的HR招聘专家和职业规划顾问，擅长分析候选人简历与岗位需求的匹配度。

# 任务
请详细分析以下简历与岗位的匹配程度，从多个维度进行评估，并给出综合匹配度分数（0-100分）。

# 岗位信息
**职位名称**：${jobData.title}
**所属公司**：${jobData.company}

**完整职位描述**：
${jobData.description}

# 候选人简历
${resumeData.content}

# 评分维度（总分100分）
请从以下维度综合评估：

1. **技术技能匹配度（30分）**
   - 岗位要求的技术栈候选人掌握程度
   - 核心技能的熟练度
   
2. **工作经验匹配度（25分）**
   - 相关行业/领域的工作年限
   - 项目经验的相关性
   - 工作内容的契合度
   
3. **教育背景匹配度（15分）**
   - 学历要求符合度
   - 专业相关性
   
4. **岗位职责匹配度（20分）**
   - 候选人过往工作内容与岗位职责的吻合度
   - 是否有类似岗位经验
   
5. **综合能力匹配度（10分）**
   - 沟通能力、团队协作等软技能
   - 学习能力、成长潜力

# 评分标准
- **90-100分**：完美匹配，各项要求完全符合，可直接推荐面试
- **75-89分**：高度匹配，核心要求符合，少数次要要求有小差距
- **60-74分**：基本匹配，主要要求符合，有一定提升空间
- **45-59分**：部分匹配，存在明显差距，需要评估风险
- **30-44分**：匹配度较低，多项要求不符
- **0-29分**：不匹配，不建议投递

# 输出要求
请以JSON格式返回分析结果，包含以下字段：
- **score**: 0-100之间的整数分数
- **strengths**: 数组，列举3-5个候选人的匹配优势（简短精炼）
- **gaps**: 数组，列举2-4个候选人需要提升的方面（简短精炼）

**只输出JSON，不要任何其他文字、解释、代码块标记或markdown格式。**

示例格式：
{
  "score": 82,
  "strengths": ["5年相关工作经验", "熟练掌握Python和SQL", "有电商数据分析项目"],
  "gaps": ["缺少Tableau经验", "英语能力待提升"]
}

输出：`;

  console.log('发送匹配度分析请求到AI...');
  console.log('  API地址:', aiConfig.baseURL);
  console.log('  模型:', aiConfig.model);
  console.log('  Prompt长度:', prompt.length);

  // 使用重试机制包装AI调用
  return await retryAsync(async () => {
    const response = await fetch(`${aiConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000  // 确保JSON返回完整（分数+优势数组+不足数组）
      })
    });
    
    console.log('收到AI响应:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI返回错误:', errorText);
      throw new Error(`AI API调用失败 (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    console.log('AI返回内容:', content);
    
    // 解析JSON格式的返回
    let result;
    try {
      // 尝试直接解析JSON
      result = JSON.parse(content);
    } catch (e) {
      // 如果解析失败，尝试提取JSON（可能包含markdown代码块）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // 降级：尝试提取数字作为分数
        console.warn('无法解析JSON，尝试提取分数...');
        const scoreMatch = content.match(/\d+/);
        result = {
          score: scoreMatch ? parseInt(scoreMatch[0]) : 50,
          strengths: ['AI返回格式错误，无法解析优势'],
          gaps: ['AI返回格式错误，无法解析不足']
        };
      }
    }
    
    console.log('解析结果:', result);
    
    // 验证和规范化数据
    const finalScore = Math.min(Math.max(parseInt(result.score) || 50, 0), 100);
    const strengths = Array.isArray(result.strengths) ? result.strengths : [];
    const gaps = Array.isArray(result.gaps) ? result.gaps : [];
    
    console.log('最终匹配度:', finalScore);
    console.log('优势数量:', strengths.length);
    console.log('不足数量:', gaps.length);
    
    return {
      score: finalScore,
      strengths: strengths,
      gaps: gaps
    };
  }, 3, 1000); // 最多重试3次，初始延迟1秒
}

// 获取AI配置
async function getAIConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiConfig'], (result) => {
      resolve(result.aiConfig || null);
    });
  });
}