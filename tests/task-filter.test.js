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
assert.equal(elements.message.textContent, '请输入非空白任务。');
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
console.log('task filter checks passed');
