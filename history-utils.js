/**
 * BOSS直聘招聘助手 - History Utils
 * 
 * @description 历史记录工具函数，提供公共渲染方法
 * @author 云淡风轻 (winkovo0818)
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 */

/**
 * 渲染单个历史记录项
 * @param {Object} record - 历史记录对象
 * @returns {HTMLElement} - DOM元素
 */
function renderHistoryItem(record) {
  const date = new Date(record.timestamp);
  const timeStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  
  let scoreClass = 'medium';
  if (record.score >= 75) scoreClass = 'high';
  else if (record.score < 60) scoreClass = 'low';
  
  // 创建历史记录项容器
  const item = document.createElement('div');
  item.className = 'history-item';
  
  // 创建头部（岗位信息和分数）
  const header = document.createElement('div');
  header.className = 'history-header';
  
  const jobInfo = document.createElement('div');
  jobInfo.className = 'history-job';
  
  const title = document.createElement('div');
  title.className = 'history-title';
  title.textContent = record.title;
  
  const company = document.createElement('div');
  company.className = 'history-company';
  company.textContent = record.company;
  
  jobInfo.appendChild(title);
  jobInfo.appendChild(company);
  
  const score = document.createElement('div');
  score.className = `history-score ${scoreClass}`;
  score.textContent = record.score;
  
  header.appendChild(jobInfo);
  header.appendChild(score);
  item.appendChild(header);
  
  // 匹配优势
  if (record.strengths && record.strengths.length > 0) {
    const strengthsDiv = document.createElement('div');
    strengthsDiv.className = 'history-strengths';
    
    const strengthsTitle = document.createElement('h4');
    strengthsTitle.textContent = '匹配优势';
    strengthsDiv.appendChild(strengthsTitle);
    
    const strengthsTags = document.createElement('div');
    strengthsTags.className = 'history-tags';
    record.strengths.forEach(s => {
      const tag = document.createElement('span');
      tag.className = 'history-tag strength';
      tag.textContent = s;
      strengthsTags.appendChild(tag);
    });
    strengthsDiv.appendChild(strengthsTags);
    item.appendChild(strengthsDiv);
  }
  
  // 可提升点
  if (record.gaps && record.gaps.length > 0) {
    const gapsDiv = document.createElement('div');
    gapsDiv.className = 'history-gaps';
    
    const gapsTitle = document.createElement('h4');
    gapsTitle.textContent = '可提升点';
    gapsDiv.appendChild(gapsTitle);
    
    const gapsTags = document.createElement('div');
    gapsTags.className = 'history-tags';
    record.gaps.forEach(g => {
      const tag = document.createElement('span');
      tag.className = 'history-tag gap';
      tag.textContent = g;
      gapsTags.appendChild(tag);
    });
    gapsDiv.appendChild(gapsTags);
    item.appendChild(gapsDiv);
  }
  
  // 打招呼内容
  if (record.greeting) {
    const greetingDiv = document.createElement('div');
    greetingDiv.className = 'history-greeting';
    greetingDiv.textContent = record.greeting;
    item.appendChild(greetingDiv);
  }
  
  // 底部元信息和操作
  const meta = document.createElement('div');
  meta.className = 'history-meta';
  
  const time = document.createElement('span');
  time.textContent = timeStr;
  
  const actions = document.createElement('div');
  actions.className = 'history-actions';
  
  const copyBtn = document.createElement('button');
  copyBtn.className = 'history-action-btn';
  copyBtn.textContent = '复制打招呼';
  copyBtn.dataset.greeting = record.greeting || '';
  copyBtn.addEventListener('click', () => {
    if (record.greeting) {
      navigator.clipboard.writeText(record.greeting).then(() => {
        showMessage('打招呼已复制到剪贴板', 'success');
      });
    }
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'history-action-btn delete';
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', () => {
    deleteHistoryItem(record.timestamp);
  });
  
  actions.appendChild(copyBtn);
  actions.appendChild(deleteBtn);
  meta.appendChild(time);
  meta.appendChild(actions);
  item.appendChild(meta);
  
  return item;
}

/**
 * 使用DocumentFragment批量渲染历史记录（性能优化）
 * @param {Array} historyRecords - 历史记录数组
 * @param {HTMLElement} container - 容器元素
 */
function renderHistoryList(historyRecords, container) {
  // 使用DocumentFragment减少DOM操作
  const fragment = document.createDocumentFragment();
  
  historyRecords.forEach(record => {
    const item = renderHistoryItem(record);
    fragment.appendChild(item);
  });
  
  // 一次性插入所有元素
  container.innerHTML = '';
  container.appendChild(fragment);
}
