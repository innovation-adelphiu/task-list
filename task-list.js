const taskInputArea = document.getElementById('taskInputArea');
const taskAddButton = document.getElementById('taskAddButton');
const taskListArea = document.getElementById('taskListArea');

let dragSrc = null;
let dragAllowed = false; // only allow starting drag from the handle

const STORAGE_KEY = 'taskListDataStorage';

// store item data {done: boolean, text: string}
function saveTasks() 
{
    const itemArray = taskListArea.querySelectorAll('.taskContainer');
    const dataArray = [];

    for (let i = 0; i < itemArray.length; i++) 
    {
        const item = itemArray[i];

        // technically it is possible to have two text editors open at the same time
        //  so text needs to be retrieved from the correct element
        let text = '';
        const editText = item.querySelector('.editText');
        if (editText) 
        {
            const textArea = editText.querySelector('textarea');
            text = textArea.value;
        } 
        else 
        {
            const taskText = item.querySelector('.taskText');
            text = taskText.textContent;
        }

        const taskCheckbox = item.querySelector('.taskCheckbox');
        const done = taskCheckbox.checked;
        dataArray.push({ text: text, done: done });
    }

    const storageData = JSON.stringify(dataArray);
    localStorage.setItem(STORAGE_KEY, storageData);
}

function loadTasks() 
{
    const storageData = localStorage.getItem(STORAGE_KEY);
    if (!storageData) return;
    try 
    {
        const dataArray = JSON.parse(storageData);
        if (!Array.isArray(dataArray)) return;

        // clear the current task list (although probably empty)
        taskListArea.innerHTML = '';

        for (let i = 0; i < dataArray.length; i++)
        {
            const dataItem = dataArray[i];
            const taskContainer = createTaskContainer(dataItem.text);
            taskListArea.appendChild(taskContainer);
            if (dataItem.done) 
            {
                const taskCheckbox = taskContainer.querySelector('.taskCheckbox');
                if (taskCheckbox) 
                    taskCheckbox.checked = true;
                taskContainer.classList.add('taskCompleted');
            }
        }
    } 
    catch (e) 
    { 
        console.error(e); 
    }
}

loadTasks();

function createTaskContainer(text) 
{
    const item = document.createElement('div');
    item.className = 'taskContainer';
    item.setAttribute('draggable', 'true');

    // Handle (left)
    const handle = document.createElement('div');
    handle.className = 'taskHandle';
    handle.title = 'Drag to reorder';
    handle.textContent = '≡';
    handle.addEventListener('mousedown', () => { dragAllowed = true; });

    // Checkbox (left)
    const taskCheckbox = document.createElement('input');
    taskCheckbox.type = 'checkbox';
    taskCheckbox.className = 'taskCheckbox';
    taskCheckbox.title = 'Mark complete';
    taskCheckbox.addEventListener('change', () => {
        item.classList.toggle('taskCompleted', taskCheckbox.checked);
        saveTasks();
    });

    // Text (center)
    const taskText = document.createElement('div');
    taskText.className = 'taskText';
    taskText.textContent = text;

    // Buttons (right)
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'taskButtonsDiv';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.title = 'Edit';
    editButton.textContent = '✏️';
    editButton.addEventListener('click', () => toggleEditSave(item));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.title = 'Delete';
    deleteButton.textContent = '❌';
    deleteButton.addEventListener('click', () => { item.remove(); saveTasks(); });

    buttonDiv.append(editButton, deleteButton);

    item.append(handle, taskCheckbox, taskText, buttonDiv);

    // Drag events
    item.addEventListener('dragstart', (e) => {
        if (!dragAllowed) { e.preventDefault(); return; }
        dragAllowed = false; // consume it
        dragSrc = item;
        item.classList.add('taskDragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'taskDragging'); // required for Firefox
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('taskDragging');
        dragSrc = null;
        saveTasks();
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const target = item;
        if (!dragSrc || dragSrc === target) return;
        const rect = target.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint)
            taskListArea.insertBefore(dragSrc, target);
        else
            taskListArea.insertBefore(dragSrc, target.nextSibling);
    });

    // prevent accidental text selection during drag
    item.addEventListener('selectstart', (e) => {
        if (e.target.closest('.taskHandle')) e.preventDefault();
    });

    return item;
}

// click on pencil icon toggles edit mode
function toggleEditSave(item) 
{
    // edit mode adds this object
    const editText = item.querySelector('.editText');

    if (editText) // if edit exists -> editing now finished
    {
        const textArea = editText.querySelector('textarea');

        const newTaskText = document.createElement('div');
        newTaskText.className = 'taskText';
        newTaskText.textContent = textArea.value;

        editText.replaceWith(newTaskText);
        item.dataset.editing = false;
        saveTasks();
    }
    else // no edit text exists -> enter edit mode
    {
        if (item.dataset.editing == true) 
            return;
        
        const taskText = item.querySelector('.taskText');

        const newEditText = document.createElement('div');
        newEditText.className = 'editText';

        const newTextArea = document.createElement('textarea');
        newTextArea.value = taskText.textContent;

        newEditText.append(newTextArea);
        taskText.replaceWith(newEditText);
        item.dataset.editing = true;
        newTextArea.focus();
    }
}

function addItemFromInput() 
{
    const value = taskInputArea.value.trim();
    if (!value) return;
    taskListArea.appendChild(createTaskContainer(value));
    taskInputArea.value = '';
    taskInputArea.focus();
    saveTasks();
}

taskAddButton.addEventListener('click', addItemFromInput);

// optional controls

// pressing Enter in the add area adds a new task
taskInputArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // prevent newline
        addItemFromInput();
    }
});

// pressing Enter while editing finishes the edit
taskListArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName === 'TEXTAREA' && e.target.closest('.editText')) {
        e.preventDefault(); // prevent newline
        const taskContainer = e.target.closest('.taskContainer');
        toggleEditSave(taskContainer);
    }
});