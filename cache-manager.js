/**
 * BOSS直聘招聘助手 - Cache Manager
 * 
 * @description 智能缓存管理，减少重复AI调用，节省成本
 * @author 云淡风轻 (winkovo0818)
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 */

const CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存

/**
 * 生成缓存键
 */
function generateCacheKey(jobData, resumeData) {
  // 使用岗位标题+公司+简历内容哈希作为缓存键
  const jobKey = `${jobData.title}-${jobData.company}-${jobData.description.substring(0, 100)}`;
  const resumeKey = resumeData.content.substring(0, 100);
  const combined = jobKey + resumeKey;
  
  // 使用简单哈希函数，支持中文
  return simpleHash(combined);
}

/**
 * 简单哈希函数（支持中文）
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 16);
}

/**
 * 获取缓存的分析结果
 */
async function getCachedAnalysis(jobData, resumeData) {
  const cacheKey = generateCacheKey(jobData, resumeData);
  
  return new Promise((resolve) => {
    chrome.storage.local.get([`cache_${cacheKey}`], (result) => {
      const cached = result[`cache_${cacheKey}`];
      
      if (!cached) {
        console.log('缓存未命中');
        resolve(null);
        return;
      }
      
      // 检查是否过期
      const now = Date.now();
      if (now - cached.timestamp > CACHE_DURATION) {
        console.log('缓存已过期');
        // 删除过期缓存
        chrome.storage.local.remove([`cache_${cacheKey}`]);
        resolve(null);
        return;
      }
      
      console.log('缓存命中');
      resolve(cached.data);
    });
  });
}

/**
 * 保存分析结果到缓存
 */
async function setCachedAnalysis(jobData, resumeData, analysisResult) {
  const cacheKey = generateCacheKey(jobData, resumeData);
  
  const cacheData = {
    timestamp: Date.now(),
    data: analysisResult
  };
  
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [`cache_${cacheKey}`]: cacheData
    }, () => {
      console.log('分析结果已缓存');
      resolve();
    });
  });
}

/**
 * 清理所有过期缓存
 */
async function cleanExpiredCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const now = Date.now();
      const keysToRemove = [];
      
      for (const key in items) {
        if (key.startsWith('cache_')) {
          const cached = items[key];
          if (cached.timestamp && now - cached.timestamp > CACHE_DURATION) {
            keysToRemove.push(key);
          }
        }
      }
      
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          console.log(`清理了${keysToRemove.length}个过期缓存`);
          resolve(keysToRemove.length);
        });
      } else {
        resolve(0);
      }
    });
  });
}

/**
 * 清空所有缓存
 */
async function clearAllCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const cacheKeys = Object.keys(items).filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length > 0) {
        chrome.storage.local.remove(cacheKeys, () => {
          console.log(`清空了${cacheKeys.length}个缓存`);
          resolve(cacheKeys.length);
        });
      } else {
        resolve(0);
      }
    });
  });
}

// 启动时清理过期缓存
cleanExpiredCache();
