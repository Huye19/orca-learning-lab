const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

class Element {
  constructor() { this.value = ''; this.children = []; this.listeners = {}; this.classList = { toggle() {} }; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  focus() {}
  trigger(type, event = {}) { this.listeners[type]({ preventDefault() {}, ...event }); }
}
const elements = Object.fromEntries(['task-form', 'task-input', 'task-priority', 'tasks', 'task-filter', 'task-search', 'task-sort', 'empty', 'message', 'stat-total', 'stat-pending', 'stat-done'].map(id => [id, new Element()]));
elements['task-filter'].value = 'all';
elements['task-priority'].value = '中';
elements['task-sort'].value = 'default';
let stored = JSON.stringify([{ text: '先完成', done: true }, { text: '待学习', done: false }]);
const localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), {
  document: { querySelector: selector => elements[selector.slice(1)], createElement: () => new Element() }, localStorage
});
const list = elements.tasks;
const filter = elements['task-filter'];
const select = value => { filter.value = value; filter.trigger('change'); };
const texts = () => list.children.map(item => item.children[0].children[1].textContent);
const saved = () => JSON.parse(stored);
assert.deepEqual(texts(), ['先完成', '待学习']);
assert.equal(list.children[0].children[0].children[2].textContent, '优先级：中');
assert.equal(saved()[0].priority, undefined);
list.children[0].children[2].trigger('click');
let editor = list.children[0].children[0];
editor.children[0].value = '   ';
editor.trigger('submit');
assert.equal(saved()[0].text, '先完成');
assert.equal(elements.message.textContent, '任务名称不能为空。');
editor.children[0].value = '取消修改';
editor.trigger('keydown', { key: 'Escape' });
assert.equal(texts()[0], '先完成');
list.children[0].children[2].trigger('click');
editor = list.children[0].children[0];
editor.children[0].value = '取消按钮';
editor.children[2].trigger('click');
assert.equal(texts()[0], '先完成');
list.children[0].children[2].trigger('click');
editor = list.children[0].children[0];
editor.children[0].value = ' 已完成 ';
editor.trigger('submit');
assert.equal(saved()[0].text, '已完成');
assert.equal(texts()[0], '已完成');
assert.equal(elements['stat-total'].textContent, 2);
assert.equal(elements['stat-done'].textContent, 1);
assert.equal(elements['stat-pending'].textContent, 1);
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), {
  document: { querySelector: selector => elements[selector.slice(1)], createElement: () => new Element() }, localStorage
});
assert.equal(texts()[0], '已完成');
select('pending');
assert.deepEqual(texts(), ['待学习']);
assert.equal(saved().length, 2);
elements['task-input'].value = '新任务';
elements['task-priority'].value = '高';
elements['task-form'].trigger('submit');
assert.deepEqual(texts(), ['待学习', '新任务']);
assert.equal(saved()[2].priority, '高');
assert.equal(list.children[1].children[0].children[2].textContent, '优先级：高');
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), {
  document: { querySelector: selector => elements[selector.slice(1)], createElement: () => new Element() }, localStorage
});
assert.equal(list.children[1].children[0].children[2].textContent, '优先级：高');
const checkbox = list.children[0].children[0].children[0];
checkbox.checked = true;
checkbox.trigger('change');
assert.deepEqual(texts(), ['新任务']);
assert.equal(saved()[1].done, true);
select('done');
assert.deepEqual(texts(), ['已完成', '待学习']);
list.children[1].children[1].trigger('click');
assert.deepEqual(texts(), ['已完成']);
assert.deepEqual(saved().map(task => task.text), ['已完成', '新任务']);
select('all');
assert.deepEqual(texts(), ['已完成', '新任务']);
select('pending');
list.children[0].children[1].trigger('click');
assert.equal(elements.empty.hidden, false);
assert.equal(elements.empty.textContent, '当前筛选条件下没有任务。');

// 编辑草稿在筛选和删除其他任务导致的重绘中保留。
const other = Object.fromEntries(Object.keys(elements).map(id => [id, new Element()]));
other['task-filter'].value = 'all';
let data = JSON.stringify([{ text: '第一条', done: true }, { text: '第二条', done: false }]);
let failSave = false;
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), {
  document: { querySelector: selector => other[selector.slice(1)], createElement: () => new Element() },
  localStorage: { getItem: () => data, setItem: (_, value) => { if (failSave) throw new Error('storage'); data = value; } }
});
const otherList = other.tasks;
otherList.children[1].children[2].trigger('click');
const draft = otherList.children[1].children[0];
draft.children[0].value = '保留草稿';
other['task-filter'].value = 'done';
other['task-filter'].trigger('change');
other['task-filter'].value = 'all';
other['task-filter'].trigger('change');
assert.equal(otherList.children[1].children[0].children[0].value, '保留草稿');
otherList.children[0].children[1].trigger('click');
assert.equal(otherList.children[0].children[0].children[0].value, '保留草稿');
draft.trigger('submit');
assert.equal(JSON.parse(data)[0].text, '保留草稿');

// 存储失败后仍保留草稿，取消编辑不清除存储错误。
otherList.children[0].children[2].trigger('click');
const failed = otherList.children[0].children[0];
failed.children[0].value = '写入失败';
failSave = true;
failed.trigger('submit');
assert.equal(failed.children[0].value, '写入失败');
failed.children[2].trigger('click');
assert.equal(other.message.textContent, '保存失败，请检查浏览器存储设置或可用空间。');

// 新任务的默认和各优先级均可保存，重新加载后仍显示。
const priorityElements = Object.fromEntries(Object.keys(elements).map(id => [id, new Element()]));
priorityElements['task-filter'].value = 'all';
priorityElements['task-priority'].value = '中';
assert.match(fs.readFileSync('index.html', 'utf8'), /<option value="中" selected>/);
let priorityData = '[]';
const priorityContext = {
  document: { querySelector: selector => priorityElements[selector.slice(1)], createElement: () => new Element() },
  localStorage: { getItem: () => priorityData, setItem: (_, value) => { priorityData = value; } }
};
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), { ...priorityContext });
for (const value of ['中', '高', '低']) {
  priorityElements['task-priority'].value = value;
  priorityElements['task-input'].value = value + '任务';
  priorityElements['task-form'].trigger('submit');
}
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), { ...priorityContext });
assert.deepEqual(JSON.parse(priorityData).map(task => task.priority), ['中', '高', '低']);
assert.deepEqual(priorityElements.tasks.children.map(item => item.children[0].children[2].textContent), ['优先级：中', '优先级：高', '优先级：低']);
// 搜索实时忽略大小写，并与完成状态筛选共同生效。
const searchElements = Object.fromEntries(Object.keys(elements).map(id => [id, new Element()]));
searchElements['task-filter'].value = 'all';
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), {
  document: { querySelector: selector => searchElements[selector.slice(1)], createElement: () => new Element() },
  localStorage: { getItem: () => JSON.stringify([{ text: 'Learn JavaScript', done: false }, { text: 'LEARN CSS', done: true }, { text: 'Other', done: false }]) }
});
const searchTexts = () => searchElements.tasks.children.map(item => item.children[0].children[1].textContent);
searchElements['task-search'].value = 'lEaRn';
searchElements['task-search'].trigger('input');
assert.deepEqual(searchTexts(), ['Learn JavaScript', 'LEARN CSS']);
searchElements['task-filter'].value = 'pending';
searchElements['task-filter'].trigger('change');
assert.deepEqual(searchTexts(), ['Learn JavaScript']);
searchElements['task-search'].value = 'css';
searchElements['task-search'].trigger('input');
assert.deepEqual(searchTexts(), []);
assert.equal(searchElements.empty.hidden, false);
searchElements['task-filter'].value = 'done';
searchElements['task-filter'].trigger('change');
assert.deepEqual(searchTexts(), ['LEARN CSS']);
searchElements['task-search'].value = '';
searchElements['task-search'].trigger('input');
assert.deepEqual(searchTexts(), ['LEARN CSS']);
searchElements['task-filter'].value = 'pending';
searchElements['task-filter'].trigger('change');
assert.deepEqual(searchTexts(), ['Learn JavaScript', 'Other']);

// 排序只改变显示顺序，不改变存储顺序，并与筛选共同生效。
const sortElements = Object.fromEntries(Object.keys(elements).map(id => [id, new Element()]));
sortElements['task-filter'].value = 'all';
sortElements['task-sort'].value = 'default';
let sortData = JSON.stringify([
  { text: '低', done: false, priority: '低' },
  { text: '中', done: false, priority: '中' },
  { text: '高', done: true, priority: '高' },
  { text: '无优先级', done: false }
]);
const sortContext = {
  document: { querySelector: selector => sortElements[selector.slice(1)], createElement: () => new Element() },
  localStorage: { getItem: () => sortData, setItem: (_, value) => { sortData = value; } }
};
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), sortContext);
const sortList = sortElements.tasks;
const sortTexts = () => sortList.children.map(item => item.children[0].children[1].textContent);
const change = (id, value) => { sortElements[id].value = value; sortElements[id].trigger('change'); };
assert.deepEqual(sortTexts(), ['低', '中', '高', '无优先级']);
change('task-sort', 'priority');
assert.deepEqual(sortTexts(), ['高', '中', '无优先级', '低']);
assert.deepEqual(JSON.parse(sortData).map(task => task.text), ['低', '中', '高', '无优先级']);
change('task-filter', 'pending');
assert.deepEqual(sortTexts(), ['中', '无优先级', '低']);
sortElements['task-search'].value = '优先级';
sortElements['task-search'].trigger('input');
assert.deepEqual(sortTexts(), ['无优先级']);
sortElements['task-search'].value = '';
sortElements['task-search'].trigger('input');
assert.deepEqual(sortTexts(), ['中', '无优先级', '低']);
change('task-filter', 'done');
assert.deepEqual(sortTexts(), ['高']);
change('task-filter', 'all');
const sortedCheckbox = sortList.children[0].children[0].children[0];
sortedCheckbox.checked = false;
sortedCheckbox.trigger('change');
assert.equal(JSON.parse(sortData)[2].text, '高');
assert.equal(JSON.parse(sortData)[2].done, false);
assert.deepEqual(sortTexts(), ['高', '中', '无优先级', '低']);
vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), { ...sortContext });
assert.equal(sortElements['task-sort'].value, 'priority');
assert.deepEqual(sortTexts(), ['高', '中', '无优先级', '低']);
change('task-sort', 'default');
assert.deepEqual(sortTexts(), ['低', '中', '高', '无优先级']);
console.log('task filter checks passed');
