const key = 'learning-tasks';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const priority = document.querySelector('#task-priority');
const list = document.querySelector('#tasks');
const filter = document.querySelector('#task-filter');
const sort = document.querySelector('#task-sort');
const empty = document.querySelector('#empty');
const message = document.querySelector('#message');
const statTotal = document.querySelector('#stat-total');
const statPending = document.querySelector('#stat-pending');
const statDone = document.querySelector('#stat-done');
let tasks = [];
let storageReadable = true;
const editors = new Map();

try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(saved) || !saved.every(task => task && typeof task.text === 'string' && typeof task.done === 'boolean')) throw new Error('invalid data');
  tasks = saved;
} catch {
  storageReadable = false;
  message.textContent = '无法读取已保存的任务，请检查浏览器存储设置。';
}

function save(next) {
  if (!storageReadable) return false;
  try {
    localStorage.setItem(key, JSON.stringify(next));
    tasks = next;
    message.textContent = '';
    render();
    return true;
  } catch {
    message.textContent = '保存失败，请检查浏览器存储设置或可用空间。';
    return false;
  }
}

function renderStats() {
  const done = tasks.filter(task => task.done).length;
  statTotal.textContent = tasks.length;
  statPending.textContent = tasks.length - done;
  statDone.textContent = done;
}

const priorityRanks = { 高: 3, 中: 2, 低: 1 };
const priorityRank = task => priorityRanks[task.priority ?? '中'] ?? priorityRanks['中'];

function visibleEntries() {
  const entries = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => !(filter.value === 'pending' && task.done || filter.value === 'done' && !task.done));
  if (sort.value === 'priority') entries.sort((a, b) => priorityRank(b.task) - priorityRank(a.task));
  return entries;
}

function render() {
  renderStats();
  list.replaceChildren();
  const entries = visibleEntries();
  entries.forEach(({ task, index }) => {
    const item = document.createElement('li');
    item.classList.toggle('done', task.done);
    if (editors.has(task)) {
      item.append(editors.get(task));
      list.append(item);
      return;
    }
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      if (!save(tasks.map((entry, i) => i === index ? { ...entry, done: checkbox.checked } : entry))) checkbox.checked = task.done;
    });
    const text = document.createElement('span');
    text.textContent = task.text;
    const priorityText = document.createElement('small');
    priorityText.textContent = `优先级：${task.priority ?? '中'}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '删除';
    remove.setAttribute('aria-label', `删除任务：${task.text}`);
    remove.addEventListener('click', () => save(tasks.filter((_, i) => i !== index)));
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = '编辑';
    edit.setAttribute('aria-label', `编辑任务：${task.text}`);
    edit.addEventListener('click', () => {
      const editor = document.createElement('form');
      const name = document.createElement('input');
      name.type = 'text';
      name.value = task.text;
      name.setAttribute('aria-label', '任务名称');
      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.textContent = '保存';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = '取消';
      const cancelEdit = () => {
        if (message.textContent === '任务名称不能为空。') message.textContent = '';
        editors.delete(task);
        render();
      };
      cancel.addEventListener('click', cancelEdit);
      editor.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); cancelEdit(); }
      });
      editor.addEventListener('submit', event => {
        event.preventDefault();
        const value = name.value.trim();
        if (!value) {
          message.textContent = '任务名称不能为空。';
          name.focus();
          return;
        }
        editors.delete(task);
        if (!save(tasks.map(entry => entry === task ? { ...entry, text: value } : entry))) editors.set(task, editor);
      });
      editor.append(name, submit, cancel);
      editors.set(task, editor);
      item.replaceChildren(editor);
      name.focus();
    });
    label.append(checkbox, text, priorityText);
    item.append(label, remove, edit);
    list.append(item);
  });
  empty.hidden = entries.length > 0;
  empty.textContent = tasks.length ? '当前筛选条件下没有任务。' : '还没有任务，添加一个开始学习吧。';
}

filter.addEventListener('change', render);
sort.addEventListener('change', render);

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    message.textContent = '请输入非空白任务。';
    input.focus();
    return;
  }
  if (save([...tasks, { text, done: false, priority: priority.value }])) {
    input.value = '';
    input.focus();
  }
});
render();
