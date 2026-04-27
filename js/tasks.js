// ═══════════════════════════════════════════
//  TASKS  (tasks.js)
// ═══════════════════════════════════════════
const PF_Tasks = (() => {
  const list   = () => document.getElementById('task-list');
  const empty  = () => document.getElementById('task-empty');
  const inputR = () => document.getElementById('task-input-row');
  const input  = () => document.getElementById('task-input');

  function updateEmpty() {
    const hasItems = list().children.length > 0;
    empty().style.display = hasItems ? 'none' : 'block';
  }

  function addTask(text) {
    if (!text.trim()) return;

    const item = document.createElement('div');
    item.className = 'task-item';

    const cb  = document.createElement('div');  cb.className = 'task-cb';
    const txt = document.createElement('span'); txt.className = 'task-text'; txt.textContent = text.slice(0, 40);
    const del = document.createElement('button'); del.className = 'task-del'; del.textContent = '×';

    del.addEventListener('click', e => { e.stopPropagation(); item.remove(); updateEmpty(); });
    item.addEventListener('click', () => { cb.classList.toggle('done'); txt.classList.toggle('done'); });

    item.appendChild(cb); item.appendChild(txt); item.appendChild(del);
    list().appendChild(item);

    input().value = '';
    inputR().classList.remove('open');
    updateEmpty();
  }

  function bindControls() {
    document.getElementById('task-add-btn').addEventListener('click', () => {
      const r = inputR();
      r.classList.toggle('open');
      if (r.classList.contains('open')) input().focus();
    });
    document.getElementById('task-ok').addEventListener('click', () => addTask(input().value));
    input().addEventListener('keydown', e => { if (e.key === 'Enter') addTask(e.target.value); });
  }

  updateEmpty();
  return { bindControls };
})();
