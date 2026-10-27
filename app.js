const key = 'learning-tasks';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#tasks');
const empty = document.querySelector('#empty');
const message = document.querySelector('#message');
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

function render() {
  list.replaceChildren();
  empty.hidden = tasks.length > 0;
  tasks.forEach((task, index) => {
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
    label.append(checkbox, text);
    item.append(label, remove);
    list.append(item);
  });
}

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
