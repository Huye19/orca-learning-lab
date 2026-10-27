const key = 'learning-tasks';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#tasks');
const filter = document.querySelector('#task-filter');
const empty = document.querySelector('#empty');
const message = document.querySelector('#message');
const statTotal = document.querySelector('#stat-total');
const statPending = document.querySelector('#stat-pending');
const statDone = document.querySelector('#stat-done');
let tasks = [];
let storageReadable = true;

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

function render() {
  renderStats();
  list.replaceChildren();
  let visible = 0;
  tasks.forEach((task, index) => {
    if (filter.value === 'pending' && task.done || filter.value === 'done' && !task.done) return;
    visible++;
    const item = document.createElement('li');
    item.classList.toggle('done', task.done);
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      if (!save(tasks.map((entry, i) => i === index ? { ...entry, done: checkbox.checked } : entry))) checkbox.checked = task.done;
    });
    const text = document.createElement('span');
    text.textContent = task.text;
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
      const cancelEdit = () => { message.textContent = ''; render(); };
      cancel.addEventListener('click', cancelEdit);
      editor.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); cancelEdit(); }
      });
      editor.addEventListener('submit', event => {
        event.preventDefault();
        const value = name.value.trim();
        if (!value) {
          message.textContent = '请输入非空白任务。';
          name.focus();
          return;
        }
        save(tasks.map((entry, i) => i === index ? { ...entry, text: value } : entry));
      });
      editor.append(name, submit, cancel);
      item.replaceChildren(editor);
      name.focus();
    });
    label.append(checkbox, text);
    item.append(label, remove, edit);
    list.append(item);
  });
  empty.hidden = visible > 0;
  empty.textContent = tasks.length ? '当前筛选条件下没有任务。' : '还没有任务，添加一个开始学习吧。';
}

filter.addEventListener('change', render);

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    message.textContent = '请输入非空白任务。';
    input.focus();
    return;
  }
  if (save([...tasks, { text, done: false }])) {
    input.value = '';
    input.focus();
  }
});
render();
