/**
 * BOSS直聘招聘助手 - Privacy Filter
 * 
 * @description 隐私信息过滤器，保护用户敏感数据
 * @author 云淡风轻 (winkovo0818)
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 */

/**
 * 过滤简历中的敏感信息
 * @param {string} content - 简历内容
 * @returns {string} - 过滤后的内容
 */
function filterSensitiveInfo(content) {
  if (!content) return content;
  
  let filtered = content;
  
  // 1. 过滤手机号（中国手机号：1开头的11位数字）
  filtered = filtered.replace(/1[3-9]\d{9}/g, '[手机号已隐藏]');
  
  // 2. 过滤邮箱
  filtered = filtered.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[邮箱已隐藏]');
  
  // 3. 过滤身份证号（18位或15位）
  filtered = filtered.replace(/\d{17}[\dXx]|\d{15}/g, '[身份证号已隐藏]');
  
  // 4. 过滤详细地址（包含省市区街道门牌号的模式）
  // 匹配模式：XX省XX市XX区XX街道XX号
  filtered = filtered.replace(/[^，。,.\s]{2,4}省[^，。,.\s]{2,4}市[^，。,.\s]{2,6}区[^，。,.]{3,20}[路街道巷弄里村镇][^，。,.]{0,20}号[^，。,.]{0,10}/g, '[详细地址已隐藏]');
  
  // 5. 过滤银行卡号（13-19位数字）
  filtered = filtered.replace(/\d{13,19}/g, (match) => {
    // 排除可能是年份、电话等的数字
    if (match.length >= 16) {
      return '[银行卡号已隐藏]';
    }
    return match;
  });
  
  // 6. 过滤护照号（示例：E12345678）
  filtered = filtered.replace(/[EeGgPpSs]\d{8}/g, '[护照号已隐藏]');
  
  return filtered;
}

/**
 * 检测简历中是否包含敏感信息
 * @param {string} content - 简历内容
 * @returns {Object} - 检测结果
 */
function detectSensitiveInfo(content) {
  if (!content) return { hasSensitive: false, types: [] };
  
  const types = [];
  
  // 检测各类敏感信息
  if (/1[3-9]\d{9}/.test(content)) {
    types.push('手机号');
  }
  
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content)) {
    types.push('邮箱');
  }
  
  if (/\d{17}[\dXx]|\d{15}/.test(content)) {
    types.push('身份证号');
  }
  
  if (/[^，。,.\s]{2,4}省[^，。,.\s]{2,4}市/.test(content)) {
    types.push('详细地址');
  }
  
  return {
    hasSensitive: types.length > 0,
    types: types,
    message: types.length > 0 ? `检测到敏感信息：${types.join('、')}` : '未检测到敏感信息'
  };
}

/**
 * 安全处理简历内容（在发送给AI前调用）
 * @param {Object} resumeData - 简历数据
 * @param {boolean} enableFilter - 是否启用过滤（默认true）
 * @returns {Object} - 处理后的简历数据
 */
function securizeResumeData(resumeData, enableFilter = true) {
  if (!enableFilter) {
    return resumeData;
  }
  
  // 检测敏感信息
  const detection = detectSensitiveInfo(resumeData.content);
  
  // 创建副本，避免修改原始数据
  const secureResume = {
    ...resumeData,
    content: filterSensitiveInfo(resumeData.content),
    _filtered: detection.hasSensitive,
    _filteredTypes: detection.types
  };
  
  if (detection.hasSensitive) {
    console.log(`🔒 隐私保护：已过滤 ${detection.types.join('、')}`);
  }
  
  return secureResume;
}

/**
 * 获取隐私保护设置
 */
async function getPrivacySettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['privacySettings'], (result) => {
      resolve(result.privacySettings || {
        enableFilter: true,
        filterPhone: true,
        filterEmail: true,
        filterIdCard: true,
        filterAddress: true
      });
    });
  });
}

/**
 * 保存隐私保护设置
 */
async function savePrivacySettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ privacySettings: settings }, resolve);
  });
}
