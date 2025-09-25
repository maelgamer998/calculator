document.addEventListener('DOMContentLoaded', function () {
    const display = document.getElementById('display');
    const buttons = document.querySelectorAll('.btn');
    const toggleThemeButton = document.querySelector('.toggle-theme');
    const toggleScientificButton = document.querySelector('.toggle-scientific');
    const toggleHistoryButton = document.querySelector('.toggle-history');
    const scientificButtons = document.getElementById('scientific-buttons');
    const historyPanel = document.getElementById('history-panel');
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clear-history');
    const clearButton = document.getElementById('clear');
    const backspaceButton = document.getElementById('backspace');
    const equalsButton = document.getElementById('equals');
    const calculator = document.querySelector('.calculator');

    const calculatorState = {
        expression: '',
        memory: 0,
        history: JSON.parse(localStorage.getItem('calcHistory')) || [],
        isError: false,
        lastResult: null
    };

    function saveState() {
        localStorage.setItem('calcHistory', JSON.stringify(calculatorState.history));
    }

    function updateDisplay() {
        if (calculatorState.isError) {
            display.textContent = 'Erro';
            display.classList.add('error');
            return;
        }
        display.textContent = calculatorState.expression || '0';
        display.classList.remove('error');
    }

    function showTempMessage(message, duration = 1000) {
        const originalText = display.textContent;
        display.textContent = message;
        display.classList.add('temp-message');
        
        setTimeout(() => {
            if (display.textContent === message) {
                display.classList.remove('temp-message');
                updateDisplay();
            }
        }, duration);
    }

    function isValidExpression(expr) {
        if (!expr || expr.trim() === '') return false;
        
        const parentheses = expr.replace(/[^()]/g, '');
        let balance = 0;
        for (let char of parentheses) {
            balance += char === '(' ? 1 : -1;
            if (balance < 0) return false;
        }
        if (balance !== 0) return false;
        
        const invalidPatterns = [
            /\.\./, 
            /[+\-*/]{2,}/,
            /\(\)/, 
            /[+\-*/.]$/,
            /^[+\-*/]/, 
            /\(\+/, /\(\*/, /\(\//,
        ];
        
        return !invalidPatterns.some(pattern => pattern.test(expr));
    }

    function calculateExpression(expr) {
        if (!isValidExpression(expr)) {
            throw new Error('Expressão inválida');
        }
        
        try {
            let safeExpr = expr
                .replace(/÷/g, '/')
                .replace(/×/g, '*')
                .replace(/−/g, '-')
                .replace(/π/g, Math.PI.toString())
                .replace(/e/g, Math.E.toString());

            safeExpr = safeExpr
                .replace(/sin\(/g, 'Math.sin(')
                .replace(/cos\(/g, 'Math.cos(')
                .replace(/tan\(/g, 'Math.tan(')
                .replace(/log\(/g, 'Math.log10(')
                .replace(/ln\(/g, 'Math.log(')
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/\*\*/g, '**');

            safeExpr = safeExpr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

            const result = new Function('"use strict"; return (' + safeExpr + ')')();
            
            if (result === null || result === undefined || isNaN(result) || !isFinite(result)) {
                throw new Error('Resultado inválido');
            }
            
            return result;
        } catch (error) {
            throw new Error('Erro no cálculo: ' + error.message);
        }
    }

    function calculateCurrent() {
        if (!calculatorState.expression) return null;
        
        try {
            return calculateExpression(calculatorState.expression);
        } catch {
            return null;
        }
    }

    function addToHistory(expr, result) {
        const historyItem = `${expr} = ${result}`;
        calculatorState.history.unshift(historyItem);
        
        if (calculatorState.history.length > 50) {
            calculatorState.history.pop();
        }
        
        saveState();
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        calculatorState.history.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            
            li.addEventListener('click', () => {
                const result = item.split(' = ')[1];
                calculatorState.expression = result;
                calculatorState.lastResult = parseFloat(result);
                updateDisplay();
            });
            
            historyList.appendChild(li);
        });
    }

    function initializeEventListeners() {
        if (clearHistoryButton) {
            clearHistoryButton.addEventListener('click', () => {
                calculatorState.history = [];
                saveState();
                renderHistory();
                showTempMessage('Histórico limpo');
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                calculatorState.expression = '';
                calculatorState.isError = false;
                updateDisplay();
            });
        }

        if (backspaceButton) {
            backspaceButton.addEventListener('click', () => {
                if (calculatorState.isError) {
                    calculatorState.expression = '';
                    calculatorState.isError = false;
                } else {
                    calculatorState.expression = calculatorState.expression.slice(0, -1);
                }
                updateDisplay();
            });
        }

        if (equalsButton) {
            equalsButton.addEventListener('click', () => {
                if (!calculatorState.expression || calculatorState.isError) return;

                try {
                    const result = calculateExpression(calculatorState.expression);
                    addToHistory(calculatorState.expression, result);
                    
                    calculatorState.expression = result.toString();
                    calculatorState.lastResult = result;
                    calculatorState.isError = false;
                    updateDisplay();
                } catch (error) {
                    calculatorState.isError = true;
                    updateDisplay();
                    console.error('Erro no cálculo:', error);
                }
            });
        }

        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = btn.getAttribute('data-value');
                if (!value) return;

                if (calculatorState.isError) {
                    calculatorState.expression = '';
                    calculatorState.isError = false;
                }

                switch (value) {
                    case 'MC':
                        calculatorState.memory = 0;
                        showTempMessage('Memória limpa');
                        break;
                    case 'MR':
                        calculatorState.expression += calculatorState.memory.toString();
                        break;
                    case 'M+':
                        try {
                            const currentValue = calculateCurrent();
                            if (currentValue !== null && !isNaN(currentValue)) {
                                calculatorState.memory += currentValue;
                                showTempMessage('Adicionado à memória');
                            }
                        } catch (error) {
                            console.error('Erro M+:', error);
                        }
                        break;
                    case 'M-':
                        try {
                            const currentValue = calculateCurrent();
                            if (currentValue !== null && !isNaN(currentValue)) {
                                calculatorState.memory -= currentValue;
                                showTempMessage('Subtraído da memória');
                            }
                        } catch (error) {
                            console.error('Erro M-:', error);
                        }
                        break;
                    default:
                        calculatorState.expression += value;
                }

                updateDisplay();
            });
        });

        if (toggleThemeButton) {
            toggleThemeButton.addEventListener('click', () => {
                document.body.classList.toggle('dark-theme');
                const isDark = document.body.classList.contains('dark-theme');

                const icon = toggleThemeButton.querySelector('i');

                if (isDark) {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                } else {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                }

                localStorage.setItem('calculatorTheme', isDark ? 'dark' : 'light');
            });
        }

        if (toggleScientificButton) {
            toggleScientificButton.addEventListener('click', () => {
                scientificButtons.classList.toggle('hidden');
                calculator.classList.toggle('scientific-mode');
                const isScientific = calculator.classList.contains('scientific-mode');
                localStorage.setItem('calculatorScientific', isScientific.toString());
            });
        }

        if (toggleHistoryButton) {
            toggleHistoryButton.addEventListener('click', () => {
                historyPanel.classList.toggle('hidden');
                const isHistoryVisible = !historyPanel.classList.contains('hidden');
                localStorage.setItem('calculatorHistory', isHistoryVisible.toString());
            });
        }

        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const keyMap = {
                '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
                '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
                '.': '.', '+': '+', '-': '−', '*': '×', '/': '÷',
                '(': '(', ')': ')', '%': '%'
            };
            
            const scientificKeyMap = {
                's': 'sin(', 'c': 'cos(', 't': 'tan(',
                'l': 'log(', 'n': 'ln(', 'q': 'sqrt(', 'p': 'π', 'e': 'e'
            };
            
            const controlKeyMap = {
                'Enter': 'equals',
                '=': 'equals',
                'Escape': 'clear',
                'Delete': 'clear',
                'Backspace': 'backspace'
            };

            const key = e.key;
            
            if (controlKeyMap[key]) {
                e.preventDefault();
                const buttonId = controlKeyMap[key];
                document.getElementById(buttonId)?.click();
                return;
            }
            
            if (keyMap[key]) {
                e.preventDefault();
                if (calculatorState.isError) {
                    calculatorState.expression = '';
                    calculatorState.isError = false;
                }
                calculatorState.expression += keyMap[key];
                updateDisplay();
                return;
            }
        });
    }

    function loadPreferences() {
        const savedTheme = localStorage.getItem('calculatorTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            if (toggleThemeButton) toggleThemeButton.querySelector('i').classList.replace('fa-sun', 'fa-moon');
        }
        
        const savedScientific = localStorage.getItem('calculatorScientific');
        if (savedScientific === 'true' && scientificButtons) {
            scientificButtons.classList.remove('hidden');
            calculator.classList.add('scientific-mode');
        }

        const savedHistory = localStorage.getItem('calculatorHistory');
        if (savedHistory === 'true' && historyPanel) {
            historyPanel.classList.remove('hidden');
        }
    }

    function initCalculator() {
        loadPreferences();
        renderHistory();
        updateDisplay();
        initializeEventListeners();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCalculator);
    } else {
        initCalculator();
    }
});
