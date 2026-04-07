// App State
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let monthlyIncome = parseFloat(localStorage.getItem('monthlyIncome')) || 0;
let dailyLimit = parseFloat(localStorage.getItem('dailyLimit')) || 0;
let weeklyLimit = parseFloat(localStorage.getItem('weeklyLimit')) || 0;
let savingsGoals = JSON.parse(localStorage.getItem('savingsGoals')) || [];
let recurringExpenses = JSON.parse(localStorage.getItem('recurringExpenses')) || [];
let currency = localStorage.getItem('currency') || 'USD';
let pendingExpense = null;

// Currency symbols
const currencySymbols = {
    'NGN': '₦','USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
    'CAD': 'C$', 'AUD': 'A$', 'INR': '₹'
};

// Charts
let categoryChart, trendChart;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
        // Initialize auth
        if (!initAuth()) {
            return; // Will redirect to landing
        }
        
        // Display user info
        const userInfo = getUserInfo();
        if (userInfo) {
            document.getElementById('welcomeMessage').textContent = `Welcome, ${userInfo.name.split(' ')[0]}!`;
            
            if (userInfo.picture) {
                const avatar = document.getElementById('userAvatar');
                avatar.src = userInfo.picture;
                avatar.style.display = 'block';
            }
        }
    
    loadInitialData();
    updateUI();
    checkAlerts();
    processRecurringExpenses();
    resetDailyWeeklyIfNeeded();
    
    // Check for resets every minute
    setInterval(resetDailyWeeklyIfNeeded, 60000);
    // Process recurring expenses every hour
    setInterval(processRecurringExpenses, 3600000);
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

// Initialize auth and display user info
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!initAuth()) {
        return; // Will redirect to landing
    }
    
    // Display user info
    const userName = getUserName();
    const userPicture = getUserPicture();
    
    document.getElementById('welcomeMessage').textContent = `Welcome, ${userName}!`;
    
    if (userPicture) {
        const avatar = document.getElementById('userAvatar');
        avatar.src = userPicture;
        avatar.style.display = 'block';
    }
    
    // Your existing initialization code here...
    loadInitialData();
    updateUI();
    checkAlerts();
    processRecurringExpenses();
    resetDailyWeeklyIfNeeded();
});

// Currency Functions
function changeCurrency() {
    currency = document.getElementById('currencySelect').value;
    localStorage.setItem('currency', currency);
    updateUI();
}

function formatMoney(amount) {
    const symbol = currencySymbols[currency] || '₦';
    return `${symbol}${amount.toFixed(2)}`;
}

// Toggle Sections
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';
}

// Reset All Data
function resetAllData() {
    if (confirm('⚠️ Are you sure you want to reset ALL data? This cannot be undone. All expenses, income, limits, goals, and recurring expenses will be deleted.')) {
        // Clear localStorage
        localStorage.removeItem('expenses');
        localStorage.removeItem('monthlyIncome');
        localStorage.removeItem('dailyLimit');
        localStorage.removeItem('weeklyLimit');
        localStorage.removeItem('savingsGoals');
        localStorage.removeItem('recurringExpenses');
        
        // Reset app state
        expenses = [];
        monthlyIncome = 0;
        dailyLimit = 0;
        weeklyLimit = 0;
        savingsGoals = [];
        recurringExpenses = [];
        
        // Clear form inputs
        document.getElementById('monthlyIncome').value = '';
        document.getElementById('dailyLimit').value = '';
        document.getElementById('weeklyLimit').value = '';
        document.getElementById('expenseCategory').value = 'food';
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseDate').value = '';
        document.getElementById('goalName').value = '';
        document.getElementById('goalAmount').value = '';
        document.getElementById('goalDeadline').value = '';
        document.getElementById('recurringAmount').value = '';
        
        // Hide displays and show input sections
        document.getElementById('incomeSection').style.display = 'block';
        document.getElementById('incomeDisplay').style.display = 'none';
        document.getElementById('limitsSection').style.display = 'block';
        document.getElementById('limitsDisplay').style.display = 'none';
        
        // Update UI
        updateUI();
        
        showAlert('✅ All data has been reset!', 'success');
    }
}

function showIncomeDisplay() {
    document.getElementById('incomeSection').style.display = 'none';
    document.getElementById('incomeDisplay').style.display = 'flex';
    document.getElementById('displayIncome').textContent = formatMoney(monthlyIncome);
}

function showLimitsDisplay() {
    document.getElementById('limitsSection').style.display = 'none';
    document.getElementById('limitsDisplay').style.display = 'flex';
    document.getElementById('displayDaily').textContent = formatMoney(dailyLimit);
    document.getElementById('displayWeekly').textContent = formatMoney(weeklyLimit);
}

// Income Functions
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

// Limit Functions
function setLimits() {
    dailyLimit = parseFloat(document.getElementById('dailyLimit').value) || 0;
    weeklyLimit = parseFloat(document.getElementById('weeklyLimit').value) || 0;
    
    localStorage.setItem('dailyLimit', dailyLimit);
    localStorage.setItem('weeklyLimit', weeklyLimit);
    
    showLimitsDisplay();
    showAlert('Budget limits set successfully!', 'success');
    checkAlerts();
}

// Savings Goals Functions
function addSavingsGoal() {
    const name = document.getElementById('goalName').value;
    const amount = parseFloat(document.getElementById('goalAmount').value);
    const deadline = document.getElementById('goalDeadline').value;
    
    if (!name || !amount) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    const goal = {
        id: Date.now(),
        name,
        targetAmount: amount,
        currentAmount: 0,
        deadline,
        createdAt: new Date().toISOString()
    };
    
    savingsGoals.push(goal);
    localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
    updateSavingsDisplay();
    showAlert('Savings goal added!', 'success');
    
    // Clear form
    document.getElementById('goalName').value = '';
    document.getElementById('goalAmount').value = '';
    document.getElementById('goalDeadline').value = '';
}

function updateSavingsProgress(goalId, amount) {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (goal) {
        goal.currentAmount += amount;
        localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
        updateSavingsDisplay();
    }
}

// Recurring Expenses Functions
function addRecurringExpense() {
    const category = document.getElementById('recurringCategory').value;
    const amount = parseFloat(document.getElementById('recurringAmount').value);
    const frequency = document.getElementById('recurringFrequency').value;
    const startDate = document.getElementById('recurringStartDate').value || new Date().toISOString().split('T')[0];
    
    if (!amount) {
        showAlert('Please enter an amount', 'error');
        return;
    }
    
    const recurring = {
        id: Date.now(),
        category,
        amount,
        frequency,
        startDate,
        lastProcessed: null,
        active: true
    };
    
    recurringExpenses.push(recurring);
    localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    updateRecurringDisplay();
    showAlert('Recurring expense added!', 'success');
    
    // Clear form
    document.getElementById('recurringAmount').value = '';
}

function processRecurringExpenses() {
    const today = new Date().toISOString().split('T')[0];
    let newExpenses = [];
    
    recurringExpenses.forEach(recurring => {
        if (!recurring.active) return;
        
        const shouldProcess = shouldProcessRecurring(recurring, today);
        
        if (shouldProcess) {
            const expense = {
                id: Date.now() + Math.random(),
                category: recurring.category,
                amount: recurring.amount,
                date: today,
                timestamp: new Date().toISOString(),
                recurring: true,
                recurringId: recurring.id
            };
            
            newExpenses.push(expense);
            recurring.lastProcessed = today;
        }
    });
    
    if (newExpenses.length > 0) {
        expenses = [...expenses, ...newExpenses];
        saveExpenses();
        localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
        updateUI();
        showAlert(`${newExpenses.length} recurring expense(s) added`, 'info');
    }
}

function shouldProcessRecurring(recurring, today) {
    if (!recurring.lastProcessed) return true;
    
    const lastDate = new Date(recurring.lastProcessed);
    const currentDate = new Date(today);
    const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
    
    switch(recurring.frequency) {
        case 'daily': return daysDiff >= 1;
        case 'weekly': return daysDiff >= 7;
        case 'monthly': return daysDiff >= 30;
        default: return false;
    }
}

// Expense Functions with Warning
function addExpense() {
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value || new Date().toISOString().split('T')[0];
    
    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }
    
    // Check limits
    const wouldExceedLimits = checkIfWouldExceedLimits(amount, date);
    
    if (wouldExceedLimits.exceeds) {
        // Store pending expense and show warning
        pendingExpense = { category, amount, date };
        showWarningModal(wouldExceedLimits.message);
    } else {
        // Add expense normally
        addExpenseToDB({ category, amount, date });
    }
}

function checkIfWouldExceedLimits(amount, date) {
    const result = { exceeds: false, message: '' };
    
    // Check daily limit
    if (dailyLimit > 0) {
        const dayTotal = expenses
            .filter(exp => exp.date === date)
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        if (dayTotal + amount > dailyLimit) {
            result.exceeds = true;
            result.message += `Daily limit of ${formatMoney(dailyLimit)} would be exceeded. `;
        }
    }
    
    // Check weekly limit
    if (weeklyLimit > 0) {
        const weekTotal = getWeekExpensesForDate(date);
        if (weekTotal + amount > weeklyLimit) {
            result.exceeds = true;
            result.message += `Weekly limit of ${formatMoney(weeklyLimit)} would be exceeded.`;
        }
    }
    
    // Check monthly income
    if (monthlyIncome > 0) {
        const monthTotal = getMonthExpensesForDate(date);
        if (monthTotal + amount > monthlyIncome) {
            result.exceeds = true;
            result.message += `This would exceed your monthly income of ${formatMoney(monthlyIncome)}.`;
        }
    }
    
    return result;
}

function showWarningModal(message) {
    document.getElementById('warningMessage').textContent = message;
    document.getElementById('warningModal').style.display = 'flex';
}

function forceAddExpense() {
    if (pendingExpense) {
        addExpenseToDB(pendingExpense);
        pendingExpense = null;
        document.getElementById('warningModal').style.display = 'none';
        showAlert('Expense added despite limit exceedance', 'warning');
    }
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
    showAlert('Expense added successfully!', 'success');
}

// Reset Functions
function resetDailyWeeklyIfNeeded() {
    const lastReset = localStorage.getItem('lastResetDate');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastReset !== today) {
        // This is a new day, trigger UI update
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

function getMonthExpensesForDate(date) {
    const inputDate = new Date(date);
    return expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === inputDate.getMonth() &&
                   expDate.getFullYear() === inputDate.getFullYear();
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
}

// Delete Functions
function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        expenses = expenses.filter(exp => exp.id !== id);
        saveExpenses();
        updateUI();
    }
}

function deleteSavingsGoal(id) {
    savingsGoals = savingsGoals.filter(goal => goal.id !== id);
    localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
    updateSavingsDisplay();
}

function deleteRecurring(id) {
    recurringExpenses = recurringExpenses.filter(rec => rec.id !== id);
    localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    updateRecurringDisplay();
}

// Save Functions
function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// Alert System
function checkAlerts() {
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses
        .filter(exp => exp.date === today)
        .reduce((sum, exp) => sum + exp.amount, 0);
    
    const weekExpenses = getWeekExpenses();
    
    let alertMessage = '';
    
    if (dailyLimit > 0 && todayExpenses > dailyLimit) {
        alertMessage += `⚠️ Daily limit exceeded! You've spent ${formatMoney(todayExpenses)} today (Limit: ${formatMoney(dailyLimit)})\n`;
    }
    
    if (weeklyLimit > 0 && weekExpenses > weeklyLimit) {
        alertMessage += `⚠️ Weekly limit exceeded! You've spent ${formatMoney(weekExpenses)} this week (Limit: ${formatMoney(weeklyLimit)})`;
    }
    
    if (alertMessage) {
        showAlert(alertMessage, 'warning');
    } else {
        document.getElementById('alertBox').style.display = 'none';
    }
}

function showAlert(message, type) {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    
    const colors = {
        success: '#00d25b',
        warning: '#ff9f43',
        error: '#ff4757',
        info: '#667eea'
    };
    
    alertBox.style.background = colors[type] || colors.info;
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            alertBox.style.display = 'none';
        }, 3000);
    }
}

// Chart Functions
function updateCharts() {
    updateCategoryChart();
    updateTrendChart();
}

function updateCategoryChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    const categories = {};
    expenses.forEach(exp => {
        categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    });
    
    if (Object.keys(categories).length === 0) {
        categories['No Expenses'] = 1;
    }
    
    const data = {
        labels: Object.keys(categories).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
        datasets: [{
            data: Object.values(categories),
            backgroundColor: [
                '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0',
                '#9966ff', '#ff9f40', '#ff6384'
            ]
        }]
    };
    
    if (categoryChart) categoryChart.destroy();
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Expenses by Category'
                },
                legend: {
                    position: 'bottom'
                }
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
    
    const data = {
        labels: last7Days,
        datasets: [{
            label: 'Daily Expenses',
            data: dailyTotals,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };
    
    if (trendChart) trendChart.destroy();
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Spending Trend (Last 7 Days)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatMoney(value);
                        }
                    }
                }
            }
        }
    });
}

// Summary Functions
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

// Display Updates
function updateExpenseList() {
    const listElement = document.getElementById('expenseList');
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
    
    listElement.innerHTML = sortedExpenses.map(exp => `
        <div class="expense-item">
            <div>
                <span class="expense-category">${getCategoryEmoji(exp.category)} ${exp.category}</span>
                ${exp.recurring ? '<span class="recurring-badge">🔄 Recurring</span>' : ''}
            </div>
            <span class="expense-amount">${formatMoney(exp.amount)}</span>
            <span class="expense-date">${exp.date}</span>
            <button class="delete-btn" onclick="deleteExpense(${exp.id})">✕</button>
        </div>
    `).join('');
}

function updateSavingsDisplay() {
    const listElement = document.getElementById('savingsGoalsList');
    
    listElement.innerHTML = savingsGoals.map(goal => {
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        return `
            <div class="savings-item">
                <div>
                    <strong>${goal.name}</strong>
                    <div>Target: ${formatMoney(goal.targetAmount)}</div>
                    ${goal.deadline ? `<small>Deadline: ${goal.deadline}</small>` : ''}
                </div>
                <div class="savings-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${formatMoney(goal.currentAmount)} / ${formatMoney(goal.targetAmount)}</small>
                </div>
                <button class="delete-btn" onclick="deleteSavingsGoal(${goal.id})">✕</button>
            </div>
        `;
    }).join('');
}

function updateRecurringDisplay() {
    const listElement = document.getElementById('recurringList');
    
    listElement.innerHTML = recurringExpenses.map(rec => `
        <div class="recurring-item">
            <div>
                <span class="expense-category">${getCategoryEmoji(rec.category)} ${rec.category}</span>
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

function getCategoryEmoji(category) {
    const emojis = {
        food: '🍔', transport: '🚌', entertainment: '🎮',
        shopping: '🛍️', bills: '📄', other: '📦'
    };
    return emojis[category] || '📌';
}


// Main UI Update
function updateUI() {
    updateCharts();
    updateSummary();
    updateExpenseList();
    updateSavingsDisplay();
    updateRecurringDisplay();
}

// Make functions global
window.setIncome = setIncome;
window.setLimits = setLimits;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.toggleSection = toggleSection;
window.changeCurrency = changeCurrency;
window.addSavingsGoal = addSavingsGoal;
window.addRecurringExpense = addRecurringExpense;
window.forceAddExpense = forceAddExpense;
window.cancelExpense = cancelExpense;
window.deleteSavingsGoal = deleteSavingsGoal;
window.deleteRecurring = deleteRecurring;