// Глобальные переменные для хранения данных и фильтров
let allScheduleData = [];
let currentFilters = {
    group: '',
    teacher: '',
    date: ''
};

// Основная функция загрузки данных
async function loadSchedule() {
    try {
        // Показываем индикатор загрузки
        showLoadingIndicator();
        
        const response = await fetch('data.csv');
        if (!response.ok) throw new Error('Файл не найден');
        
        const csvData = await response.text();
        
        // Парсим CSV и сохраняем все данные
        allScheduleData = parseCSV(csvData);
        
        // Заполняем таблицу
        populateTable(allScheduleData);
        
        // Заполняем фильтры (очищаем старые данные)
        populateFilters(allScheduleData);
        
        // Обновляем статистику
        updateStats(allScheduleData.length);
        
        // Скрываем индикатор загрузки
        hideLoadingIndicator();
        
        // Загружаем сохраненную тему
        loadTheme();
        
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        showError('Ошибка загрузки файла с расписанием. Проверьте наличие файла data.csv');
        hideLoadingIndicator();
    }
}

// Функция парсинга CSV с учетом структуры вашего файла
function parseCSV(csvData) {
    const rows = csvData.split('\n').filter(row => row.trim() !== '');
    const data = [];
    
    // Пропускаем заголовок и обрабатываем данные
    for (let i = 1; i < rows.length; i++) {
        const cells = parseCSVRow(rows[i]);
        
        if (cells.length >= 7) {
            data.push({
                group: cells[0] || '',
                teacher: cells[1] || '',
                subgroup: cells[2] || '',
                discipline: cells[3] || '',
                classroom: cells[4] || '',
                time: cells[5] || '',
                date: formatDate(cells[6]) || ''
            });
        }
    }
    
    return data;
}

// Функция для форматирования даты
function formatDate(dateString) {
    if (!dateString) return '';
    
    // Если дата в формате MM/DD/YYYY, преобразуем в DD.MM.YYYY
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
            return `${parts[1]}.${parts[0]}.${parts[2]}`;
        }
    }
    
    return dateString;
}

// Функция для корректного парсинга CSV строк
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Заполнение таблицы данными
function populateTable(data) {
    const tableBody = document.querySelector('#schedule-table tbody');
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.className = 'no-data';
        cell.innerHTML = `
            <i class="fas fa-inbox"></i>
            <div>Нет данных, соответствующих выбранным фильтрам</div>
        `;
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        
        // Создаем ячейки для каждой колонки
        const cells = [
            { value: item.group, class: 'group-cell' },
            { value: item.teacher, class: 'teacher-cell' },
            { value: item.subgroup, class: 'subgroup-cell' },
            { value: item.discipline, class: 'discipline-cell' },
            { value: item.classroom, class: 'classroom-cell' },
            { value: item.time, class: 'time-cell' },
            { value: item.date, class: 'date-cell' }
        ];
        
        cells.forEach(cellInfo => {
            const cell = document.createElement('td');
            cell.textContent = cellInfo.value;
            if (cellInfo.class) {
                cell.className = cellInfo.class;
            }
            row.appendChild(cell);
        });
        
        tableBody.appendChild(row);
    });
    
    // Обновляем статистику
    updateStats(data.length);
}

// Заполнение фильтров уникальными значениями
function populateFilters(data) {
    const groups = new Set();
    const teachers = new Set();
    const dates = new Set();
    
    // Собираем уникальные значения
    data.forEach(item => {
        if (item.group) groups.add(item.group);
        if (item.teacher) teachers.add(item.teacher);
        if (item.date) dates.add(item.date);
    });
    
    // Получаем элементы фильтров
    const groupFilter = document.getElementById('group-filter');
    const teacherFilter = document.getElementById('teacher-filter');
    const dateFilter = document.getElementById('date-filter');
    
    // Сохраняем текущие выбранные значения
    const currentGroup = groupFilter.value;
    const currentTeacher = teacherFilter.value;
    const currentDate = dateFilter.value;
    
    // Очищаем фильтры (оставляем только первый option "Все...")
    groupFilter.innerHTML = '<option value="">Все группы</option>';
    teacherFilter.innerHTML = '<option value="">Все преподаватели</option>';
    dateFilter.innerHTML = '<option value="">Все даты</option>';
    
    // Заполняем фильтр групп
    Array.from(groups).sort().forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        groupFilter.appendChild(option);
    });
    
    // Заполняем фильтр преподавателей
    Array.from(teachers).sort().forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher;
        option.textContent = teacher;
        teacherFilter.appendChild(option);
    });
    
    // Заполняем фильтр дат (сортируем по дате)
    const sortedDates = Array.from(dates).sort((a, b) => {
        const dateA = new Date(a.split('.').reverse().join('-'));
        const dateB = new Date(b.split('.').reverse().join('-'));
        return dateA - dateB;
    });
    
    sortedDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = date;
        dateFilter.appendChild(option);
    });
    
    // Восстанавливаем выбранные значения
    if (currentGroup && Array.from(groups).includes(currentGroup)) {
        groupFilter.value = currentGroup;
        currentFilters.group = currentGroup;
    }
    
    if (currentTeacher && Array.from(teachers).includes(currentTeacher)) {
        teacherFilter.value = currentTeacher;
        currentFilters.teacher = currentTeacher;
    }
    
    if (currentDate && Array.from(dates).includes(currentDate)) {
        dateFilter.value = currentDate;
        currentFilters.date = currentDate;
    }
}

// Функция применения фильтров
function applyFilters() {
    const filteredData = allScheduleData.filter(item => {
        if (currentFilters.group && item.group !== currentFilters.group) return false;
        if (currentFilters.teacher && item.teacher !== currentFilters.teacher) return false;
        if (currentFilters.date && item.date !== currentFilters.date) return false;
        return true;
    });
    
    populateTable(filteredData);
}

// Функция сброса фильтров
function resetFilters() {
    currentFilters = {
        group: '',
        teacher: '',
        date: ''
    };
    
    document.getElementById('group-filter').value = '';
    document.getElementById('teacher-filter').value = '';
    document.getElementById('date-filter').value = '';
    
    populateTable(allScheduleData);
}

// Обновление статистики
function updateStats(count) {
    const statsElement = document.getElementById('total-count');
    if (statsElement) {
        statsElement.textContent = count;
    }
}

// Функции переключения темы
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    const button = document.getElementById('theme-toggle');
    const icon = button.querySelector('i');
    
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
}

// Показать индикатор загрузки
function showLoadingIndicator() {
    const tableBody = document.querySelector('#schedule-table tbody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="no-data">
                <i class="fas fa-spinner fa-spin"></i>
                <div>Загрузка данных...</div>
            </td>
        </tr>
    `;
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    // Автоматически скрывается при заполнении данных
}

// Показать ошибку
function showError(message) {
    const tableBody = document.querySelector('#schedule-table tbody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="no-data">
                <i class="fas fa-exclamation-triangle"></i>
                <div>${message}</div>
            </td>
        </tr>
    `;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadSchedule();
    
    // Назначаем обработчики событий для фильтров
    document.getElementById('group-filter').addEventListener('change', function(e) {
        currentFilters.group = e.target.value;
        applyFilters();
    });
    
    document.getElementById('teacher-filter').addEventListener('change', function(e) {
        currentFilters.teacher = e.target.value;
        applyFilters();
    });
    
    document.getElementById('date-filter').addEventListener('change', function(e) {
        currentFilters.date = e.target.value;
        applyFilters();
    });
    
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Обработчик для переключения темы
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
});

// Убрано автоматическое обновление каждые 5 минут