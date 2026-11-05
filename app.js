// App State
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let monthlyIncome = parseFloat(localStorage.getItem('monthlyIncome')) || 0;
let dailyLimit = parseFloat(localStorage.getItem('dailyLimit')) || 0;
let weeklyLimit = parseFloat(localStorage.getItem('weeklyLimit')) || 0;
let savingsGoals = JSON.parse(localStorage.getItem('savingsGoals')) || [];
let recurringExpenses = JSON.parse(localStorage.getItem('recurringExpenses')) || [];
let categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
let currency = localStorage.getItem('currency') || 'USD';
let pendingExpense = null;
let editingExpenseId = null;
let lastDeletedExpense = null;

const currencySymbols = {
    'NGN': '₦', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
    'CAD': 'C$', 'AUD': 'A$', 'INR': '₹'
};

const categoryEmojis = {
    food: '🍔', transport: '🚌', entertainment: '🎮',
    shopping: '🛍️', bills: '📄', other: '📦'
};

let categoryChart, trendChart, incomeExpenseChart, budgetChart;

/* ================= Dark Mode ================= */
function initDarkMode() {
    const saved = localStorage.getItem('darkMode');
    if (saved === '1') {
        document.body.classList.add('dark');
        document.getElementById('darkToggle').textContent = '☀️';
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark ? '1' : '0');
    document.getElementById('darkToggle').textContent = isDark ? '☀️' : '🌙';
    updateCharts();
}

/* ================= Toast Notifications ================= */
function showToast(message, type, action) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    const msg = document.createElement('span');
    msg.textContent = message;
    toast.appendChild(msg);

    if (action) {
        const btn = document.createElement('button');
        btn.textContent = action.label;
        btn.className = 'toast-action';
        btn.onclick = function() { action.onClick(); toast.remove(); };
        toast.appendChild(btn);
    }

    const close = document.createElement('button');
    close.textContent = '✕';
    close.className = 'toast-close';
    close.onclick = function() { toast.remove(); };
    toast.appendChild(close);

    container.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('toast-show'); });

    if (!action) {
        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }
}

function showAlert(message, type) {
    type = type || 'info';
    if (type === 'success' || type === 'info' || type === 'error') {
        showToast(message, type);
        return;
    }
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    const colors = { warning: '#ff9f43', error: '#ff4757' };
    alertBox.style.background = colors[type] || colors.error;
}

/* ================= Currency ================= */
function formatMoney(amount) {
    const symbol = currencySymbols[currency] || '$';
    return symbol + amount.toFixed(2);
}

function changeCurrency() {
    currency = document.getElementById('currencySelect').value;
    localStorage.setItem('currency', currency);
    updateUI();
}

/* ================= Init on Load ================= */
document.addEventListener('DOMContentLoaded', function() {
    if (!initAuth()) return;

    const userInfo = getUserInfo();
    if (userInfo) {
        document.getElementById('welcomeMessage').textContent = 'Welcome, ' + userInfo.name.split(' ')[0] + '!';
        if (userInfo.picture) {
            const avatar = document.getElementById('userAvatar');
            avatar.src = userInfo.picture;
            avatar.style.display = 'block';
        }
    }

    initDarkMode();
    loadInitialData();
    updateUI();
    checkAlerts();
    processRecurringExpenses();
    resetDailyWeeklyIfNeeded();

    /* Enter submits the contribution amount */
    document.getElementById('contributeAmount').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmContribution();
        }
    });

    setInterval(resetDailyWeeklyIfNeeded, 60000);
    setInterval(processRecurringExpenses, 3600000);
});

/* Escape closes any open modal */
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('contributeModal').style.display !== 'none') closeContributeModal();
    if (document.getElementById('editModal').style.display !== 'none') closeEditModal();
    if (document.getElementById('confirmModal').style.display !== 'none') closeConfirmModal();
    if (document.getElementById('reportModal').style.display !== 'none') closeReportModal();
    if (document.getElementById('warningModal').style.display !== 'none') cancelExpense();
});

function loadInitialData() {
    document.getElementById('currencySelect').value = currency;
    if (monthlyIncome) {
        document.getElementById('monthlyIncome').value = monthlyIncome;
        showIncomeDisplay();
    }
    if (dailyLimit || weeklyLimit) {
        document.getElementById('dailyLimit').value = dailyLimit;
        document.getElementById('weeklyLimit').value = weeklyLimit;
        showLimitsDisplay();
    }
}

/* ================= Toggle Sections ================= */
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';
}

/* ================= Reset All Data ================= */
function resetAllData() {
    showConfirmModal(
        '⚠️ Reset All Data?',
        'This will permanently delete your income, limits, expenses, savings goals, recurring expenses, and category budgets. This cannot be undone.',
        'Reset Everything',
        function() {
            localStorage.removeItem('expenses');
            localStorage.removeItem('monthlyIncome');
            localStorage.removeItem('dailyLimit');
            localStorage.removeItem('weeklyLimit');
            localStorage.removeItem('savingsGoals');
            localStorage.removeItem('recurringExpenses');
            localStorage.removeItem('categoryBudgets');

            expenses = [];
            monthlyIncome = 0;
            dailyLimit = 0;
            weeklyLimit = 0;
            savingsGoals = [];
            recurringExpenses = [];
            categoryBudgets = {};
            currency = 'USD';

            document.getElementById('monthlyIncome').value = '';
            document.getElementById('dailyLimit').value = '';
            document.getElementById('weeklyLimit').value = '';
            document.getElementById('expenseCategory').value = 'food';
            document.getElementById('expenseAmount').value = '';
            document.getElementById('expenseDate').value = '';
            document.getElementById('expenseNote').value = '';
            document.getElementById('goalName').value = '';
            document.getElementById('goalAmount').value = '';
            document.getElementById('goalDeadline').value = '';
            document.getElementById('recurringAmount').value = '';
            document.getElementById('budgetAmount').value = '';
            document.getElementById('searchInput').value = '';
            document.getElementById('filterCategory').value = '';
            document.getElementById('filterFrom').value = '';
            document.getElementById('filterTo').value = '';

            document.getElementById('incomeSection').style.display = 'block';
            document.getElementById('incomeDisplay').style.display = 'none';
            document.getElementById('limitsSection').style.display = 'block';
            document.getElementById('limitsDisplay').style.display = 'none';
            document.getElementById('currencySelect').value = 'USD';

            updateUI();
            showToast('All data has been reset!', 'success');
        }
    );
}

/* ================= Income ================= */
function showIncomeDisplay() {
    document.getElementById('incomeSection').style.display = 'none';
    document.getElementById('incomeDisplay').style.display = 'flex';
    document.getElementById('displayIncome').textContent = formatMoney(monthlyIncome);
}

function setIncome() {
    const income = document.getElementById('monthlyIncome').value;
    if (income && income > 0) {
        monthlyIncome = parseFloat(income);
        localStorage.setItem('monthlyIncome', monthlyIncome);
        showIncomeDisplay();
        updateUI();
        showAlert('Income set successfully!', 'success');
    } else {
        showAlert('Please enter a valid income amount', 'error');
    }
}

/* ================= Limits ================= */
function showLimitsDisplay() {
    document.getElementById('limitsSection').style.display = 'none';
    document.getElementById('limitsDisplay').style.display = 'flex';
    document.getElementById('displayDaily').textContent = formatMoney(dailyLimit);
    document.getElementById('displayWeekly').textContent = formatMoney(weeklyLimit);
}

function setLimits() {
    dailyLimit = parseFloat(document.getElementById('dailyLimit').value) || 0;
    weeklyLimit = parseFloat(document.getElementById('weeklyLimit').value) || 0;
    localStorage.setItem('dailyLimit', dailyLimit);
    localStorage.setItem('weeklyLimit', weeklyLimit);
    showLimitsDisplay();
    showAlert('Budget limits set successfully!', 'success');
    checkAlerts();
}

/* ================= Savings Goals ================= */
function addSavingsGoal() {
    const name = document.getElementById('goalName').value;
    const amount = parseFloat(document.getElementById('goalAmount').value);
    const deadline = document.getElementById('goalDeadline').value;
    if (!name || !amount) {
        showAlert('Please fill in goal name and target amount', 'error');
        return;
    }

    savingsGoals.push({
        id: Date.now(),
        name,
        targetAmount: amount,
        currentAmount: 0,
        deadline,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
    updateSavingsDisplay();
    showAlert('Savings goal added!', 'success');

    document.getElementById('goalName').value = '';
    document.getElementById('goalAmount').value = '';
    document.getElementById('goalDeadline').value = '';
}

function deleteSavingsGoal(id) {
    savingsGoals = savingsGoals.filter(g => g.id !== id);
    localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
    updateSavingsDisplay();
}

/* ================= Category Budgets ================= */
function setCategoryBudget() {
    const category = document.getElementById('budgetCategory').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    if (!amount || amount <= 0) {
        showAlert('Please enter a valid budget amount', 'error');
        return;
    }
    categoryBudgets[category] = amount;
    localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
    updateCategoryBudgetsDisplay();
    showAlert('Budget set for ' + category + '!', 'success');
    document.getElementById('budgetAmount').value = '';
    checkAlerts();
}

function deleteCategoryBudget(category) {
    delete categoryBudgets[category];
    localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
    updateCategoryBudgetsDisplay();
    checkAlerts();
}

/* ================= Recurring Expenses ================= */
function addRecurringExpense() {
    const category = document.getElementById('recurringCategory').value;
    const amount = parseFloat(document.getElementById('recurringAmount').value);
    const frequency = document.getElementById('recurringFrequency').value;
    const startDate = document.getElementById('recurringStartDate').value || new Date().toISOString().split('T')[0];

    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }

    recurringExpenses.push({
        id: Date.now(),
        category,
        amount,
        frequency,
        startDate,
        lastProcessed: null,
        active: true
    });
    localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    updateRecurringDisplay();
    showAlert('Recurring expense added!', 'success');

    document.getElementById('recurringAmount').value = '';
}

function processRecurringExpenses() {
    const today = new Date().toISOString().split('T')[0];
    const newExpenses = [];

    recurringExpenses.forEach(recurring => {
        if (!recurring.active) return;

        if (shouldProcessRecurring(recurring, today)) {
            newExpenses.push({
                id: Date.now() + Math.random(),
                category: recurring.category,
                amount: recurring.amount,
                date: today,
                note: recurring.note || '',
                timestamp: new Date().toISOString(),
                recurring: true,
                recurringId: recurring.id
            });
            recurring.lastProcessed = today;
        }
    });

    if (newExpenses.length > 0) {
        expenses = expenses.concat(newExpenses);
        saveExpenses();
        localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
        updateUI();
        showToast(newExpenses.length + ' recurring expense(s) added', 'info');
    }
}

function shouldProcessRecurring(recurring, today) {
    if (!recurring.lastProcessed) return true;

    const lastDate = new Date(recurring.lastProcessed);
    const currentDate = new Date(today);
    const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

    switch (recurring.frequency) {
        case 'daily': return daysDiff >= 1;
        case 'weekly': return daysDiff >= 7;
        case 'monthly': return daysDiff >= 30;
        default: return false;
    }
}

function deleteRecurring(id) {
    recurringExpenses = recurringExpenses.filter(rec => rec.id !== id);
    localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    updateRecurringDisplay();
}

/* ================= Auto-suggest Category from Note ================= */
function suggestCategory() {
    const note = document.getElementById('expenseNote').value.trim().toLowerCase();
    if (!note) return;
    for (let i = expenses.length - 1; i >= 0; i--) {
        if (expenses[i].note && expenses[i].note.toLowerCase() === note) {
            document.getElementById('expenseCategory').value = expenses[i].category;
            return;
        }
    }
}

/* ================= Confirm Modal ================= */
let confirmCallback = null;

function showConfirmModal(title, message, okLabel, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = okLabel || 'Confirm';
    confirmCallback = callback;
    document.getElementById('confirmModal').style.display = 'flex';
}

function confirmAction() {
    const cb = confirmCallback;
    confirmCallback = null;
    document.getElementById('confirmModal').style.display = 'none';
    if (cb) cb();
}

function closeConfirmModal() {
    confirmCallback = null;
    document.getElementById('confirmModal').style.display = 'none';
}

/* ================= Contribute to Goal Modal ================= */
let contributeGoalId = null;

function contributeToGoal(goalId) {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    contributeGoalId = goalId;
    document.getElementById('contributeGoalInfo').textContent =
        goal.name + ' — ' + formatMoney(goal.currentAmount) + ' of ' + formatMoney(goal.targetAmount);
    document.getElementById('contributeAmount').value = '';
    document.getElementById('contributeModal').style.display = 'flex';
    document.getElementById('contributeAmount').focus();
}

function confirmContribution() {
    const amount = parseFloat(document.getElementById('contributeAmount').value);
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    const goal = savingsGoals.find(g => g.id === contributeGoalId);
    if (goal) {
        goal.currentAmount += amount;
        localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
        updateSavingsDisplay();
        const reached = goal.currentAmount >= goal.targetAmount ? ' 🎉 Goal reached!' : '';
        showToast(formatMoney(amount) + ' added to ' + goal.name + reached, 'success');
    }
    closeContributeModal();
}

function closeContributeModal() {
    contributeGoalId = null;
    document.getElementById('contributeModal').style.display = 'none';
}

/* ================= Expense CRUD ================= */
function addExpense() {
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value || new Date().toISOString().split('T')[0];
    const note = document.getElementById('expenseNote').value.trim();

    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }

    const wouldExceed = checkIfWouldExceedLimits(amount, date, category);

    if (wouldExceed.exceeds) {
        pendingExpense = { category, amount, date, note };
        showWarningModal(wouldExceed.message);
    } else {
        addExpenseToDB({ category, amount, date, note });
    }
}

function checkIfWouldExceedLimits(amount, date, category) {
    const result = { exceeds: false, message: '' };

    if (dailyLimit > 0) {
        const dayTotal = expenses
            .filter(exp => exp.date === date && exp.id !== editingExpenseId)
            .reduce((sum, exp) => sum + exp.amount, 0);

        if (dayTotal + amount > dailyLimit) {
            result.exceeds = true;
            result.message += 'Daily limit of ' + formatMoney(dailyLimit) + ' would be exceeded. ';
        }
    }

    if (weeklyLimit > 0) {
        const weekTotal = getWeekExpensesForDate(date);
        if (weekTotal + amount > weeklyLimit) {
            result.exceeds = true;
            result.message += 'Weekly limit of ' + formatMoney(weeklyLimit) + ' would be exceeded. ';
        }
    }

    if (monthlyIncome > 0) {
        const monthTotal = getMonthExpensesForDate(date);
        if (monthTotal + amount > monthlyIncome) {
            result.exceeds = true;
            result.message += 'This would exceed your monthly income of ' + formatMoney(monthlyIncome) + '. ';
        }
    }

    if (category && categoryBudgets[category] > 0) {
        const catMonthTotal = getMonthExpensesForDate(date, category);
        if (catMonthTotal + amount > categoryBudgets[category]) {
            result.exceeds = true;
            result.message += 'Category budget of ' + formatMoney(categoryBudgets[category]) +
                ' for ' + category + ' would be exceeded. ';
        }
    }

    return result;
}

function showWarningModal(message) {
    document.getElementById('warningMessage').textContent = message;
    document.getElementById('warningModal').style.display = 'flex';
}

function forceAddExpense() {
    if (!pendingExpense) return;
    document.getElementById('warningModal').style.display = 'none';

    if (pendingExpense.edit) {
        applyEdit(pendingExpense);
    } else {
        addExpenseToDB(pendingExpense);
    }
    pendingExpense = null;
    showAlert('Expense added despite limit exceedance!', 'success');
}

function cancelExpense() {
    pendingExpense = null;
    document.getElementById('warningModal').style.display = 'none';
    document.getElementById('expenseAmount').value = '';
}

function addExpenseToDB(expenseData) {
    const expense = {
        id: Date.now(),
        ...expenseData,
        timestamp: new Date().toISOString()
    };

    expenses.push(expense);
    saveExpenses();
    updateUI();
    checkAlerts();

    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNote').value = '';
    showAlert('Expense added successfully!', 'success');
}

/* ================= Edit Expense ================= */
function editExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    editingExpenseId = id;
    document.getElementById('editCategory').value = exp.category || 'food';
    document.getElementById('editAmount').value = exp.amount;
    document.getElementById('editDate').value = exp.date;
    document.getElementById('editNote').value = exp.note || '';
    document.getElementById('editModal').style.display = 'flex';
}

function saveEditedExpense() {
    const category = document.getElementById('editCategory').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const date = document.getElementById('editDate').value;
    const note = document.getElementById('editNote').value.trim();

    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }

    const wouldExceed = checkIfWouldExceedLimits(amount, date, category);
    if (wouldExceed.exceeds) {
        pendingExpense = { id: editingExpenseId, category, amount, date, note, edit: true };
        showWarningModal(wouldExceed.message);
        return;
    }

    applyEdit({ id: editingExpenseId, category, amount, date, note });
}

function applyEdit(data) {
    const idx = expenses.findIndex(e => e.id === data.id);
    if (idx === -1) return;
    expenses[idx].category = data.category;
    expenses[idx].amount = data.amount;
    expenses[idx].date = data.date;
    expenses[idx].note = data.note;
    saveExpenses();
    closeEditModal();
    updateUI();
    checkAlerts();
    showToast('Expense updated!', 'success');
}

function forceAddExpenseEdit() {
    if (pendingExpense && pendingExpense.edit) {
        applyEdit(pendingExpense);
        pendingExpense = null;
        document.getElementById('warningModal').style.display = 'none';
    }
}

function closeEditModal() {
    editingExpenseId = null;
    document.getElementById('editModal').style.display = 'none';
}

/* ================= Delete Expense (with Undo) ================= */
function deleteExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    expenses = expenses.filter(e => e.id !== id);
    saveExpenses();
    lastDeletedExpense = exp;
    updateUI();

    showToast('Expense deleted', 'info', {
        label: 'Undo',
        onClick: function() {
            if (lastDeletedExpense && lastDeletedExpense.id === exp.id) {
                expenses.push(lastDeletedExpense);
                saveExpenses();
                updateUI();
                lastDeletedExpense = null;
            }
        }
    });
}

/* ================= Export / Import ================= */
function exportData() {
    const data = {
        app: 'StudentBudgetTracker',
        version: 1,
        exportedAt: new Date().toISOString(),
        currency: currency,
        monthlyIncome: monthlyIncome,
        dailyLimit: dailyLimit,
        weeklyLimit: weeklyLimit,
        expenses: expenses,
        savingsGoals: savingsGoals,
        recurringExpenses: recurringExpenses,
        categoryBudgets: categoryBudgets
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget-tracker-backup-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup exported!', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data || typeof data !== 'object' || !Array.isArray(data.expenses)) {
                throw new Error('Invalid backup file');
            }

            showConfirmModal(
                '⬆️ Import Backup?',
                'Importing will overwrite your current income, limits, expenses, goals, recurring expenses, and category budgets. Continue?',
                'Import Data',
                function() {
                    applyImport(data);
                }
            );
        } catch (err) {
            showAlert('Import failed: invalid backup file', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function applyImport(data) {
    expenses = data.expenses || [];
    monthlyIncome = parseFloat(data.monthlyIncome) || 0;
    dailyLimit = parseFloat(data.dailyLimit) || 0;
    weeklyLimit = parseFloat(data.weeklyLimit) || 0;
    savingsGoals = data.savingsGoals || [];
    recurringExpenses = data.recurringExpenses || [];
    categoryBudgets = data.categoryBudgets || {};
    currency = data.currency || 'USD';

    saveExpenses();
    localStorage.setItem('monthlyIncome', monthlyIncome);
    localStorage.setItem('dailyLimit', dailyLimit);
    localStorage.setItem('weeklyLimit', weeklyLimit);
    localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
    localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
    localStorage.setItem('currency', currency);

    document.getElementById('currencySelect').value = currency;

    if (monthlyIncome) showIncomeDisplay();
    if (dailyLimit || weeklyLimit) showLimitsDisplay();

    updateUI();
    checkAlerts();
    showAlert('Data imported successfully!', 'success');
}

function forceAddExpenseEdit() {
    if (pendingExpense && pendingExpense.edit) {
        applyEdit(pendingExpense);
        pendingExpense = null;
        document.getElementById('warningModal').style.display = 'none';
    }
}

/* ================= Reset Helpers ================= */
function resetDailyWeeklyIfNeeded() {
    const lastReset = localStorage.getItem('lastResetDate');
    const today = new Date().toISOString().split('T')[0];

    if (lastReset !== today) {
        localStorage.setItem('lastResetDate', today);
        updateUI();
    }
}

function getWeekExpensesForDate(date) {
    const inputDate = new Date(date);
    const firstDay = new Date(inputDate);
    firstDay.setDate(inputDate.getDate() - inputDate.getDay());
    firstDay.setHours(0, 0, 0, 0);

    return expenses
        .filter(exp => new Date(exp.date) >= firstDay)
        .reduce((sum, exp) => sum + exp.amount, 0);
}

function getWeekExpenses() {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay());
    firstDay.setHours(0, 0, 0, 0);

    return expenses
        .filter(exp => new Date(exp.date) >= firstDay)
        .reduce((sum, exp) => sum + exp.amount, 0);
}

function getMonthExpensesForDate(date, category) {
    const inputDate = new Date(date);
    return expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === inputDate.getMonth() &&
                   expDate.getFullYear() === inputDate.getFullYear() &&
                   (!category || exp.category === category);
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
}

function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

/* ================= Alerts ================= */
function checkAlerts() {
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses
        .filter(exp => exp.date === today)
        .reduce((sum, exp) => sum + exp.amount, 0);

    const weekExpenses = getWeekExpenses();

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let alertMessage = '';

    if (dailyLimit > 0 && todayExpenses > dailyLimit) {
        alertMessage += '⚠️ Daily limit exceeded! Spent ' + formatMoney(todayExpenses) +
            ' today (Limit: ' + formatMoney(dailyLimit) + ')\n';
    }

    if (weeklyLimit > 0 && weekExpenses > weeklyLimit) {
        alertMessage += '⚠️ Weekly limit exceeded! Spent ' + formatMoney(weekExpenses) +
            ' this week (Limit: ' + formatMoney(weeklyLimit) + ')';
    }

    if (monthlyIncome > 0) {
        const monthTotal = expenses
            .filter(exp => {
                const d = new Date(exp.date);
                return d.getMonth() === month && d.getFullYear() === year;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);
        if (monthTotal > monthlyIncome) {
            alertMessage += '\n⚠️ Monthly spending exceeded income! Spent ' +
                formatMoney(monthTotal) + ' (Income: ' + formatMoney(monthlyIncome) + ')';
        }
    }

    Object.keys(categoryBudgets).forEach(cat => {
        const spent = expenses
            .filter(exp => {
                const d = new Date(exp.date);
                return d.getMonth() === month && d.getFullYear() === year && exp.category === cat;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);
        if (spent > categoryBudgets[cat]) {
            alertMessage += '\n⚠️ ' + cat.charAt(0).toUpperCase() + cat.slice(1) +
                ' budget exceeded! Spent ' + formatMoney(spent) +
                ' (Budget: ' + formatMoney(categoryBudgets[cat]) + ')';
        }
    });

    if (alertMessage) {
        const alertBox = document.getElementById('alertBox');
        alertBox.textContent = alertMessage;
        alertBox.style.display = 'block';
        alertBox.style.background = '#ff4757';
    } else {
        document.getElementById('alertBox').style.display = 'none';
    }
}

/* ================= Charts ================= */
function chartTextColor() {
    return document.body.classList.contains('dark') ? '#c4c4da' : '#555';
}

function chartGridColor() {
    return document.body.classList.contains('dark') ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
}

function updateCharts() {
    updateCategoryChart();
    updateTrendChart();
    updateIncomeExpenseChart();
    updateBudgetChart();
}

function updateCategoryChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    const categories = {};
    expenses.forEach(exp => {
        categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    });

    let labels, values;
    if (Object.keys(categories).length === 0) {
        labels = ['No Expenses'];
        values = [1];
    } else {
        labels = Object.keys(categories).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));
        values = Object.values(categories);
    }

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40', '#ff6384']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Expenses by Category', color: chartTextColor() },
                legend: { position: 'bottom', labels: { color: chartTextColor() } }
            }
        }
    });
}

function updateTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');

    const last7Days = [];
    const dailyTotals = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        last7Days.push(dateStr);

        const total = expenses
            .filter(exp => exp.date === dateStr)
            .reduce((sum, exp) => sum + exp.amount, 0);

        dailyTotals.push(total);
    }

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Daily Expenses',
                data: dailyTotals,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Spending Trend (Last 7 Days)', color: chartTextColor() },
                legend: { labels: { color: chartTextColor() } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: chartGridColor() },
                    ticks: {
                        color: chartTextColor(),
                        callback: function(value) { return formatMoney(value); }
                    }
                },
                x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } }
            }
        }
    });
}

function updateIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart').getContext('2d');

    const labels = [];
    const incomeData = [];
    const expenseData = [];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('en', { month: 'short' });
        const yearLabel = (i > 0) ? monthName : monthName + ' ' + d.getFullYear();
        labels.push(yearLabel);

        const monthTotal = expenses
            .filter(exp => {
                const ed = new Date(exp.date);
                return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
            })
            .reduce((sum, exp) => sum + exp.amount, 0);

        expenseData.push(parseFloat(monthTotal.toFixed(2)));
        incomeData.push(i === 0 ? monthlyIncome : 0);
    }

    if (incomeExpenseChart) incomeExpenseChart.destroy();

    incomeExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#00d25b',
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#ff6384',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Income vs Expenses (Last 6 Months)', color: chartTextColor() },
                legend: { position: 'bottom', labels: { color: chartTextColor() } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: chartGridColor() },
                    ticks: {
                        color: chartTextColor(),
                        callback: function(value) { return formatMoney(value); }
                    }
                },
                x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } }
            }
        }
    });
}

function updateBudgetChart() {
    const ctx = document.getElementById('budgetChart').getContext('2d');

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const categories = [...new Set(expenses.map(exp => exp.category))];
    Object.keys(categoryBudgets).forEach(cat => {
        if (categories.indexOf(cat) === -1) categories.push(cat);
    });

    const labels = categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));
    const budgetData = categories.map(cat => categoryBudgets[cat] || 0);
    const spentData = categories.map(cat => {
        return expenses
            .filter(exp => {
                const ed = new Date(exp.date);
                return ed.getMonth() === month && ed.getFullYear() === year && exp.category === cat;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);
    });

    if (budgetChart) budgetChart.destroy();

    /* If there's nothing to show, render an empty-ish chart */
    budgetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [
                {
                    label: 'Budget',
                    data: budgetData.length ? budgetData : [0],
                    backgroundColor: '#667eea',
                    borderRadius: 4
                },
                {
                    label: 'Spent',
                    data: spentData.length ? spentData : [0],
                    backgroundColor: '#ff6384',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Category Budget vs Actual (This Month)', color: chartTextColor() },
                legend: { position: 'bottom', labels: { color: chartTextColor() } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: chartGridColor() },
                    ticks: {
                        color: chartTextColor(),
                        callback: function(value) { return formatMoney(value); }
                    }
                },
                x: {
                    ticks: { color: chartTextColor() },
                    grid: { color: chartGridColor() }
                }
            }
        }
    });
}

/* ================= Summary ================= */
function updateSummary() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const todayTotal = expenses
        .filter(exp => exp.date === today)
        .reduce((sum, exp) => sum + exp.amount, 0);

    const weekTotal = getWeekExpenses();

    const monthTotal = expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

    const remaining = monthlyIncome - monthTotal;

    document.getElementById('todayTotal').textContent = formatMoney(todayTotal);
    document.getElementById('weekTotal').textContent = formatMoney(weekTotal);
    document.getElementById('monthTotal').textContent = formatMoney(monthTotal);
    document.getElementById('remainingBudget').textContent = formatMoney(remaining);
    document.getElementById('remainingBudget').style.color = remaining < 0 ? '#ff4757' : '';
}

/* ================= Display Updates ================= */
function getFilteredExpenses() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const cat = document.getElementById('filterCategory').value;
    const from = document.getElementById('filterFrom').value;
    const to = document.getElementById('filterTo').value;

    return expenses
        .filter(exp => {
            if (cat && exp.category !== cat) return false;
            if (from && exp.date < from) return false;
            if (to && exp.date > to) return false;
            if (query) {
                const text = ((exp.note || '') + ' ' + exp.category).toLowerCase();
                if (text.indexOf(query) === -1) return false;
            }
            return true;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 50);
}

function updateExpenseList() {
    const listElement = document.getElementById('expenseList');
    const filtered = getFilteredExpenses();

    if (filtered.length === 0) {
        listElement.innerHTML = '<div class="expense-item" style="color: var(--card-text-muted);">No expenses match your filters.</div>';
        return;
    }

    listElement.innerHTML = filtered.map(exp => `
        <div class="expense-item">
            <div>
                <span class="expense-category">${categoryEmojis[exp.category] || '📌'} ${exp.category}</span>
                ${exp.recurring ? '<span class="recurring-badge">🔄</span>' : ''}
                ${exp.note ? `<span class="expense-note-text">${escapeHtml(exp.note)}</span>` : ''}
            </div>
            <span class="expense-amount">${formatMoney(exp.amount)}</span>
            <span class="expense-date">${exp.date}</span>
            <div class="expense-actions">
                <button class="edit-btn" onclick="editExpense(${exp.id})">✏️</button>
                <button class="delete-btn" onclick="deleteExpense(${exp.id})">✕</button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateSavingsDisplay() {
    const listElement = document.getElementById('savingsGoalsList');

    if (savingsGoals.length === 0) {
        listElement.innerHTML = '<div class="savings-item" style="color: var(--card-text-muted);">No savings goals yet. Add one above!</div>';
        return;
    }

    listElement.innerHTML = savingsGoals.map(goal => {
        const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
        return `
            <div class="savings-item">
                <div class="savings-info">
                    <strong>${escapeHtml(goal.name)}</strong>
                    <div>Target: ${formatMoney(goal.targetAmount)}</div>
                    ${goal.deadline ? '<small>Deadline: ' + goal.deadline + '</small>' : ''}
                </div>
                <div class="savings-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${formatMoney(goal.currentAmount)} / ${formatMoney(goal.targetAmount)}</small>
                </div>
                <div class="expense-actions">
                    <button class="edit-btn" onclick="contributeToGoal(${goal.id})">➕</button>
                    <button class="delete-btn" onclick="deleteSavingsGoal(${goal.id})">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateRecurringDisplay() {
    const listElement = document.getElementById('recurringList');

    if (recurringExpenses.length === 0) {
        listElement.innerHTML = '<div class="recurring-item" style="color: var(--card-text-muted);">No recurring expenses yet.</div>';
        return;
    }

    listElement.innerHTML = recurringExpenses.map(rec => `
        <div class="recurring-item">
            <div>
                <span class="expense-category">${categoryEmojis[rec.category] || '📌'} ${rec.category}</span>
                <strong>${formatMoney(rec.amount)}</strong>
                <span class="recurring-badge">${rec.frequency}</span>
            </div>
            <div>
                <small>Started: ${rec.startDate}</small>
                <button class="delete-btn" onclick="deleteRecurring(${rec.id})">✕</button>
            </div>
        </div>
    `).join('');
}

function updateCategoryBudgetsDisplay() {
    const listElement = document.getElementById('categoryBudgetsList');

    if (Object.keys(categoryBudgets).length === 0) {
        listElement.innerHTML = '<div class="budget-item" style="color: var(--card-text-muted);">No category budgets yet. Set one to cap monthly spending per category.</div>';
        return;
    }

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    listElement.innerHTML = Object.keys(categoryBudgets).map(cat => {
        const budget = categoryBudgets[cat];
        const spent = expenses
            .filter(exp => {
                const d = new Date(exp.date);
                return d.getMonth() === month && d.getFullYear() === year && exp.category === cat;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);
        const pct = Math.min(100, (spent / budget) * 100);
        const over = spent > budget;
        return `
            <div class="budget-item">
                <span class="expense-category">${categoryEmojis[cat] || '📌'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <div class="budget-value ${over ? 'over' : ''}">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${pct}%"></div>
                    </div>
                    <small>${formatMoney(spent)} / ${formatMoney(budget)} ${over ? '⚠️ Over!' : ''}</small>
                </div>
                <button class="delete-btn" onclick="deleteCategoryBudget('${cat}')">✕</button>
            </div>
        `;
    }).join('');
}

function updateBalance() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const totalExpenses = expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

    const balance = monthlyIncome - totalExpenses;

    const balanceElement = document.getElementById('currentBalance');
    if (balanceElement) {
        balanceElement.textContent = formatMoney(balance);
        balanceElement.style.color = balance >= 0 ? '#00d25b' : '#ff4757';
    }
}

/* ================= Monthly Report ================= */
function openReport() {
    const content = document.getElementById('reportContent');
    const now = new Date();
    const monthLabel = now.toLocaleString('en', { month: 'long', year: 'numeric' });
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthExpenses = expenses.filter(exp => {
        const d = new Date(exp.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const totalSpent = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = monthlyIncome - totalSpent;

    /* Category breakdown */
    const byCategory = {};
    monthExpenses.forEach(exp => {
        byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });

    const sortedCats = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]);
    let topCategory = sortedCats.length ? sortedCats[0] : null;

    let html = '<div class="report-section">';
    html += '<h4>' + monthLabel + ' Summary</h4>';
    html += '<div class="report-row"><span>Total Income</span><span class="report-total">' + formatMoney(monthlyIncome) + '</span></div>';
    html += '<div class="report-row"><span>Total Spent</span><span class="report-total" style="color:' + (totalSpent > monthlyIncome ? '#ff4757' : '#ff6384') + '">' + formatMoney(totalSpent) + '</span></div>';
    html += '<div class="report-row ' + (remaining < 0 ? 'bad' : 'good') + '"><span>Remaining</span><span>' + formatMoney(remaining) + '</span></div>';
    html += '<div class="report-row"><span>Top Category</span><span>' + (topCategory ? categoryEmojis[topCategory] + ' ' + topCategory.charAt(0).toUpperCase() + topCategory.slice(1) + ' (' + formatMoney(byCategory[topCategory]) + ')' : '—') + '</span></div>';
    html += '</div>';

    if (sortedCats.length) {
        html += '<div class="report-section"><h4>Category Breakdown</h4>';
        sortedCats.forEach(cat => {
            const pct = totalSpent ? ((byCategory[cat] / totalSpent) * 100).toFixed(1) : 0;
            html += '<div class="report-row"><span>' + (categoryEmojis[cat] || '📌') + ' ' + cat.charAt(0).toUpperCase() + cat.slice(1) + '</span><span>' + formatMoney(byCategory[cat]) + ' (' + pct + '%)</span></div>';
        });
        html += '</div>';
    }

    const budgetCats = Object.keys(categoryBudgets);
    if (budgetCats.length) {
        html += '<div class="report-section"><h4>Budget Compliance</h4>';
        budgetCats.forEach(cat => {
            const spent = monthExpenses
                .filter(exp => exp.category === cat)
                .reduce((sum, exp) => sum + exp.amount, 0);
            const over = spent > categoryBudgets[cat];
            html += '<div class="report-row ' + (over ? 'bad' : 'good') + '"><span>' + (categoryEmojis[cat] || '📌') + ' ' + cat.charAt(0).toUpperCase() + cat.slice(1) + '</span><span>' + formatMoney(spent) + ' / ' + formatMoney(categoryBudgets[cat]) + (over ? ' ⚠️' : '') + '</span></div>';
        });
        html += '</div>';
    }

    if (savingsGoals.length) {
        html += '<div class="report-section"><h4>Savings Goals</h4>';
        savingsGoals.forEach(goal => {
            const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            html += '<div class="report-row"><span>' + escapeHtml(goal.name) + '</span><span>' + formatMoney(goal.currentAmount) + ' / ' + formatMoney(goal.targetAmount) + ' (' + pct.toFixed(0) + '%)</span></div>';
        });
        html += '</div>';
    }

    if (monthlyIncome <= 0 && totalSpent === 0 && budgetCats.length === 0 && !topCategory) {
        html += '<div style="color: var(--card-text-muted); text-align:center;">No data yet this month. Add income and expenses to see your report.</div>';
    }

    content.innerHTML = html;
    document.getElementById('reportModal').style.display = 'flex';
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

function exportReportCSV() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthExpenses = expenses.filter(exp => {
        const d = new Date(exp.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const rows = [['Date', 'Category', 'Note', 'Amount']];
    monthExpenses.forEach(exp => {
        rows.push([exp.date, exp.category, (exp.note || '').replace(/,/g, ' '), exp.amount]);
    });

    const byCategory = {};
    monthExpenses.forEach(exp => {
        byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });

    rows.push([]);
    rows.push(['Category Totals', '', '', '']);
    Object.keys(byCategory).forEach(cat => {
        rows.push([cat, '', '', byCategory[cat]]);
    });
    rows.push([]);
    rows.push(['Total Spent', '', '', monthExpenses.reduce((s, e) => s + e.amount, 0)]);

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly-report-' + now.toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Report exported as CSV!', 'success');
}

/* ================= Main UI Update ================= */
function updateUI() {
    updateCharts();
    updateSummary();
    updateExpenseList();
    updateSavingsDisplay();
    updateRecurringDisplay();
    updateCategoryBudgetsDisplay();
    updateBalance();
}

/* ================= Make functions global ================= */
window.setIncome = setIncome;
window.setLimits = setLimits;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.editExpense = editExpense;
window.saveEditedExpense = saveEditedExpense;
window.closeEditModal = closeEditModal;
window.toggleSection = toggleSection;
window.changeCurrency = changeCurrency;
window.addSavingsGoal = addSavingsGoal;
window.contributeToGoal = contributeToGoal;
window.confirmContribution = confirmContribution;
window.closeContributeModal = closeContributeModal;
window.showConfirmModal = showConfirmModal;
window.confirmAction = confirmAction;
window.closeConfirmModal = closeConfirmModal;
window.addRecurringExpense = addRecurringExpense;
window.forceAddExpense = forceAddExpense;
window.forceAddExpenseEdit = forceAddExpenseEdit;
window.cancelExpense = cancelExpense;
window.deleteSavingsGoal = deleteSavingsGoal;
window.deleteRecurring = deleteRecurring;
window.setCategoryBudget = setCategoryBudget;
window.deleteCategoryBudget = deleteCategoryBudget;
window.resetAllData = resetAllData;
window.exportData = exportData;
window.importData = importData;
window.openReport = openReport;
window.closeReportModal = closeReportModal;
window.exportReportCSV = exportReportCSV;
window.toggleDarkMode = toggleDarkMode;
window.suggestCategory = suggestCategory;