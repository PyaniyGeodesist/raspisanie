// Глобальные переменные для хранения данных и фильтров
let allScheduleData = [];
let currentFilteredData = [];
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
        
        // СОРТИРОВКА ПО ВРЕМЕНИ: сначала по дате, затем по времени начала
        allScheduleData.sort((a, b) => {
            // Сначала сравниваем даты
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            
            if (dateA !== dateB) {
                return dateA - dateB;
            }
            
            // Если даты одинаковые, сравниваем время начала
            const timeA = parseTime(a.time);
            const timeB = parseTime(b.time);
            
            return timeA - timeB;
        });
        
        currentFilteredData = [...allScheduleData];
        
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

// Функция для парсинга даты в формате DD.MM.YYYY
function parseDate(dateString) {
    if (!dateString) return 0;
    
    const parts = dateString.split('.');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // месяцы в JS с 0 до 11
        const year = parseInt(parts[2]);
        return new Date(year, month, day).getTime();
    }
    return 0;
}

// Функция для парсинга времени (берет первое время из строки)
function parseTime(timeString) {
    if (!timeString) return 9999; // Большое число для пустого времени
    
    // Извлекаем первое время из строки (до пробела или дефиса)
    let firstTime = timeString;
    
    // Если есть пробел, берем часть до пробела
    if (timeString.includes(' ')) {
        firstTime = timeString.split(' ')[0];
    }
    
    // Если есть дефис, берем часть до дефиса
    if (firstTime.includes('-')) {
        firstTime = firstTime.split('-')[0];
    }
    
    // Убираем возможные точки и пробелы
    firstTime = firstTime.replace('.', '').trim();
    
    // Преобразуем в минуты от начала дня
    if (firstTime.length >= 3) {
        let hours = 0;
        let minutes = 0;
        
        if (firstTime.length === 3) {
            // Формат типа "845"
            hours = parseInt(firstTime.substring(0, 1));
            minutes = parseInt(firstTime.substring(1, 3));
        } else if (firstTime.length === 4) {
            // Формат типа "0845" или "845"
            if (firstTime.startsWith('0')) {
                hours = parseInt(firstTime.substring(0, 2));
                minutes = parseInt(firstTime.substring(2, 4));
            } else {
                hours = parseInt(firstTime.substring(0, 2));
                minutes = parseInt(firstTime.substring(2, 4));
            }
        }
        
        return hours * 60 + minutes;
    }
    
    return 9999; // Если не удалось распарсить
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
    
    currentFilteredData = [...data];
    
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
        const dateA = parseDate(a);
        const dateB = parseDate(b);
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
    let filteredData = allScheduleData.filter(item => {
        if (currentFilters.group && item.group !== currentFilters.group) return false;
        if (currentFilters.teacher && item.teacher !== currentFilters.teacher) return false;
        if (currentFilters.date && item.date !== currentFilters.date) return false;
        return true;
    });
    
    // Применяем сортировку к отфильтрованным данным
    filteredData.sort((a, b) => {
        // Сначала сравниваем даты
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        
        if (dateA !== dateB) {
            return dateA - dateB;
        }
        
        // Если даты одинаковые, сравниваем время начала
        const timeA = parseTime(a.time);
        const timeB = parseTime(b.time);
        
        return timeA - timeB;
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

// Функция для сохранения в Excel (CSV)
function saveToExcel() {
    if (currentFilteredData.length === 0) {
        alert('Нет данных для сохранения!');
        return;
    }
    
    const excelButton = document.getElementById('save-excel');
    const originalText = excelButton.innerHTML;
    
    // Показываем индикатор загрузки
    excelButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подготовка Excel...';
    excelButton.disabled = true;
    excelButton.classList.add('loading');
    
    // Используем setTimeout чтобы дать интерфейсу обновиться
    setTimeout(() => {
        try {
            // Создаем CSV содержимое
            const headers = ['Группа', 'Преподаватель', 'Подгруппа', 'Дисциплина', 'Кабинет', 'Время', 'Дата'];
            let csvContent = headers.join(';') + '\n';
            
            // Добавляем данные
            currentFilteredData.forEach(item => {
                const row = [
                    item.group || '',
                    item.teacher || '',
                    item.subgroup || '',
                    item.discipline || '',
                    item.classroom || '',
                    item.time || '',
                    item.date || ''
                ];
                
                // Экранируем значения, которые содержат точку с запятой или кавычки
                const escapedRow = row.map(field => {
                    if (field.includes(';') || field.includes('"') || field.includes('\n')) {
                        return '"' + field.replace(/"/g, '""') + '"';
                    }
                    return field;
                });
                
                csvContent += escapedRow.join(';') + '\n';
            });
            
            // Создаем BOM для корректного отображения кириллицы в Excel
            const BOM = '\uFEFF';
            csvContent = BOM + csvContent;
            
            // Создаем blob и ссылку для скачивания
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            // Создаем имя файла с датой
            const today = new Date().toISOString().split('T')[0];
            const fileName = `Расписание_${today}.csv`;
            
            // Настраиваем ссылку для скачивания
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            
            // Добавляем ссылку в документ и кликаем по ней
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Освобождаем URL
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
        } catch (error) {
            console.error('Ошибка при создании Excel файла:', error);
            alert('Произошла ошибка при создании Excel файла');
        } finally {
            // Восстанавливаем кнопку
            excelButton.innerHTML = originalText;
            excelButton.disabled = false;
            excelButton.classList.remove('loading');
        }
    }, 100);
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
    
    // Обработчик для сохранения Excel
    document.getElementById('save-excel').addEventListener('click', saveToExcel);
});
