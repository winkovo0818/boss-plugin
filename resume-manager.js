/**
 * BOSS直聘招聘助手 - Resume Manager
 * 
 * @description 多简历管理模块，支持最多5份简历
 * @author 云淡风轻 (winkovo0818)
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 */

const MAX_RESUMES = 5; // 最多支持5份简历

/**
 * 获取所有简历
 */
async function getAllResumes() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['resumes'], (result) => {
      resolve(result.resumes || []);
    });
  });
}

/**
 * 添加简历
 */
async function addResume(resumeData) {
  const resumes = await getAllResumes();
  
  if (resumes.length >= MAX_RESUMES) {
    throw new Error(`最多只能上传${MAX_RESUMES}份简历`);
  }
  
  const newResume = {
    id: Date.now(),
    name: resumeData.filename || '未命名简历',
    filename: resumeData.filename,
    content: resumeData.content,
    fileSize: resumeData.fileSize,
    uploadedAt: new Date().toISOString(),
    parseMethod: resumeData.parseMethod || 'local-text',
    isDefault: resumes.length === 0 // 第一份简历设为默认
  };
  
  resumes.push(newResume);
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ resumes }, () => {
      // 如果是第一份简历，同时设置为currentResume
      if (newResume.isDefault) {
        chrome.storage.local.set({ currentResume: newResume });
      }
      resolve(newResume);
    });
  });
}

/**
 * 删除简历
 */
async function deleteResume(resumeId) {
  const resumes = await getAllResumes();
  const index = resumes.findIndex(r => r.id === resumeId);
  
  if (index === -1) {
    throw new Error('简历不存在');
  }
  
  const deletedResume = resumes[index];
  resumes.splice(index, 1);
  
  // 如果删除的是默认简历，将第一份设为默认
  if (deletedResume.isDefault && resumes.length > 0) {
    resumes[0].isDefault = true;
    chrome.storage.local.set({ currentResume: resumes[0] });
  }
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ resumes }, resolve);
  });
}

/**
 * 设置默认简历
 */
async function setDefaultResume(resumeId) {
  const resumes = await getAllResumes();
  
  resumes.forEach(r => {
    r.isDefault = (r.id === resumeId);
  });
  
  const defaultResume = resumes.find(r => r.isDefault);
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ 
      resumes,
      currentResume: defaultResume
    }, resolve);
  });
}

/**
 * 更新简历名称
 */
async function updateResumeName(resumeId, newName) {
  const resumes = await getAllResumes();
  const resume = resumes.find(r => r.id === resumeId);
  
  if (!resume) {
    throw new Error('简历不存在');
  }
  
  resume.name = newName;
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ resumes }, resolve);
  });
}

/**
 * 获取默认简历
 */
async function getDefaultResume() {
  const resumes = await getAllResumes();
  return resumes.find(r => r.isDefault) || resumes[0] || null;
}
