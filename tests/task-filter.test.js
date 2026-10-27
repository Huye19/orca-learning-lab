const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

class Element {
  constructor() { this.children = []; this.listeners = {}; this.classList = { toggle() {} }; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  focus() {}
  trigger(type, event = {}) { this.listeners[type]({ preventDefault() {}, ...event }); }
}
const elements = Object.fromEntries(['task-form', 'task-input', 'tasks', 'task-filter', 'empty', 'message', 'stat-total', 'stat-pending', 'stat-done'].map(id => [id, new Element()]));
elements['task-filter'].value = 'all';
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
elements['task-form'].trigger('submit');
assert.deepEqual(texts(), ['待学习', '新任务']);
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
console.log('task filter checks passed');
