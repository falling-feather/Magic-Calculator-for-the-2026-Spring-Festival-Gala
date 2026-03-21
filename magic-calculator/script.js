const historyDom = document.querySelector(".calc-display-history");
const resultDom = document.querySelector(".calc-display-result");

// 获取当前时间字符串（{月}{日}{小时}{分钟}）
function getCurrentTimeString()
{
    const nowTime = new Date();
    const monthNum = nowTime.getMonth() + 1;
    const dayText = String(nowTime.getDate()).padStart(2, "0");
    const hourText = String(nowTime.getHours()).padStart(2, "0");
    const minuteText = String(nowTime.getMinutes()).padStart(2, "0");
    return String(monthNum) + dayText + hourText + minuteText;
}

// 获取当前时间数字
function getCurrentTimeNumber()
{
    return Number(getCurrentTimeString());
}

const state = {
    displayValue: "0",
    historyText: "",
    firstOperand: null,
    waitingForSecondOperand: false,
    operator: null,
    lastSecondOperand: null,
    operatorForRepeat: null,

    // 魔术相关状态
    kongzhi: true, // 页面刚进入或AC后，是否仍处于空置计数阶段
    dengyunums: 0, // 空置阶段连续点击等号次数（n）
    moshiN: 0, // 锁定用于本轮判定的n
    inputnums: 0, // 本轮运算符点击次数（m）
    moshiOn: false, // 是否在本轮记录与判定中
    suoding: false, // 当前输入位数>=7后是否已替换为时间差
};

function syncDisplay()
{
    resultDom.textContent = state.displayValue;
    historyDom.textContent = state.historyText;
}

function resetMagicSession()
{
    state.moshiN = 0;
    state.inputnums = 0;
    state.moshiOn = false;
    state.suoding = false;
}

function resetMagicAllByClear()
{
    state.kongzhi = true;
    state.dengyunums = 0;
    resetMagicSession();
}

function armMagicSessionOnFirstAction()
{
    if (!state.kongzhi) return;

    state.moshiN = state.dengyunums;
    state.dengyunums = 0;
    state.kongzhi = false;
    state.inputnums = 0;
    state.moshiOn = state.moshiN > 0;
    state.suoding = false;
}

function countDigits(value)
{
    const numChars = String(value).match(/\d/g);
    return numChars ? numChars.length : 0;
}

function maybeApplyMagicReplacement()
{
    if (!state.moshiOn || state.suoding) return;
    if (state.moshiN <= 0) return;
    if (state.inputnums !== state.moshiN - 1) return;
    if (state.operator !== "add" && state.operator !== "subtract") return;
    if (countDigits(state.displayValue) < 7) return;

    const baseNum = state.firstOperand != null ? state.firstOperand : 0;
    const timeNum = getCurrentTimeNumber();
    const newNum = state.operator === "add" ? timeNum - baseNum : baseNum - timeNum;

    state.displayValue = String(Math.trunc(newNum));
    state.suoding = true;
}

function maybeHandleIdleEqualsCount()
{
    if (!state.kongzhi) return false;
    state.dengyunums += 1;
    return true;
}

function consumeOperatorForMagicCount()
{
    if (!state.moshiOn) return;
    state.inputnums += 1;
    state.suoding = false;
}

function inputDigit(digit)
{
    armMagicSessionOnFirstAction();
    if (state.suoding) return;

    if (state.waitingForSecondOperand)
    {
        state.displayValue = digit;
        state.waitingForSecondOperand = false;
    }
    else
    {
        state.displayValue =
            state.displayValue === "0" ? digit : state.displayValue + digit;
    }

    maybeApplyMagicReplacement();
}

function inputDecimal()
{
    armMagicSessionOnFirstAction();
    if (state.suoding) return;

    if (state.waitingForSecondOperand)
    {
        state.displayValue = "0.";
        state.waitingForSecondOperand = false;
    }
    else
    {
        if (!state.displayValue.includes("."))
        {
            state.displayValue += ".";
        }
    }

    maybeApplyMagicReplacement();
}

function formatOperatorSymbol(op)
{
    switch (op)
    {
        case "add":
            return "+";
        case "subtract":
            return "−";
        case "multiply":
            return "×";
        case "divide":
            return "÷";
        default:
            return "";
    }
}

function performCalculation(first, second, operator)
{
    switch (operator)
    {
        case "add":
            return first + second;
        case "subtract":
            return first - second;
        case "multiply":
            return first * second;
        case "divide":
            return second === 0 ? 0 : first / second;
        default:
            return second;
    }
}

function handleOperator(nextOp)
{
    armMagicSessionOnFirstAction();
    consumeOperatorForMagicCount();

    const inputNum = parseFloat(state.displayValue);

    if (state.operator && state.waitingForSecondOperand)
    {
        // 连续点击运算符时，仅更新运算符和历史栏符号
        state.operator = nextOp;
        state.historyText = `${state.firstOperand ?? inputNum} ${formatOperatorSymbol(
      nextOp
    )}`;
        return;
    }

    if (state.firstOperand == null)
    {
        state.firstOperand = inputNum;
    }
    else if (state.operator)
    {
        const result = performCalculation(
            state.firstOperand,
            inputNum,
            state.operator
        );
        state.displayValue = String(result);
        state.firstOperand = result;
    }

    state.waitingForSecondOperand = true;
    state.operator = nextOp;
    state.lastSecondOperand = inputNum;
    state.historyText = `${state.firstOperand} ${formatOperatorSymbol(
    nextOp
  )}`;
}

function handleEquals()
{
    const inputNum = parseFloat(state.displayValue);

    if (state.operator == null)
    {
        // 没有新的运算符时，重复上一次运算（原生计算器行为）
        if (state.lastSecondOperand != null && state.operatorForRepeat)
        {
            const result = performCalculation(
                inputNum,
                state.lastSecondOperand,
                state.operatorForRepeat
            );
            state.historyText = `${inputNum} ${formatOperatorSymbol(
        state.operatorForRepeat
      )} ${state.lastSecondOperand}`;
            state.displayValue = String(result);
            state.firstOperand = result;
        }
    }
    else
    {
        let secondNum = inputNum;
        if (state.waitingForSecondOperand && state.lastSecondOperand != null)
        {
            // 直接按等号，复用上一次的第二个操作数
            secondNum = state.lastSecondOperand;
        }

        const result = performCalculation(
            state.firstOperand != null ? state.firstOperand : 0,
            secondNum,
            state.operator
        );

        state.historyText = `${state.firstOperand} ${formatOperatorSymbol(
      state.operator
    )} ${secondNum}`;

        state.displayValue = String(result);
        state.firstOperand = result;
        state.lastSecondOperand = secondNum;
        state.operatorForRepeat = state.operator;
        state.operator = null;
        state.waitingForSecondOperand = false;
    }
}

function clearAll()
{
    state.displayValue = "0";
    state.historyText = "";
    state.firstOperand = null;
    state.waitingForSecondOperand = false;
    state.operator = null;
    state.lastSecondOperand = null;
    state.operatorForRepeat = null;

    resetMagicAllByClear();
}

function toggleSign()
{
    armMagicSessionOnFirstAction();
    if (state.suoding) return;

    if (state.displayValue === "0") return;
    if (state.displayValue.startsWith("-"))
    {
        state.displayValue = state.displayValue.slice(1);
    }
    else
    {
        state.displayValue = "-" + state.displayValue;
    }
}

function percent()
{
    armMagicSessionOnFirstAction();
    if (state.suoding) return;

    const num = parseFloat(state.displayValue);
    if (!isNaN(num))
    {
        state.displayValue = String(num / 100);
    }
}

function backspace()
{
    armMagicSessionOnFirstAction();
    if (state.suoding) return;

    if (state.waitingForSecondOperand)
    {
        state.displayValue = "0";
        state.waitingForSecondOperand = false;
        return;
    }

    if (state.displayValue.length <= 1 || state.displayValue === "-0")
    {
        state.displayValue = "0";
    }
    else
    {
        state.displayValue = state.displayValue.slice(0, -1);
        if (state.displayValue === "-" || state.displayValue === "")
        {
            state.displayValue = "0";
        }
    }
}

document
    .querySelector(".calc-keypad")
    .addEventListener("click", (event) =>
    {
        const btn = event.target.closest("button");
        if (!btn) return;

        const label = btn.textContent.trim();

        if (label === "AC")
        {
            clearAll();
        }
        else if (label === "=")
        {
            if (maybeHandleIdleEqualsCount())
            {
                // 空置阶段只计数，不执行计算
            }
            else
            {
                resetMagicSession();
                handleEquals();
            }
        }
        else if (/^\d$/.test(label))
        {
            inputDigit(label);
        }
        else if (label === ".")
        {
            inputDecimal();
        }
        else if (label === "±")
        {
            toggleSign();
        }
        else if (label === "%")
        {
            percent();
        }
        else if (label === "⌫")
        {
            backspace();
        }
        else if (label === "+")
        {
            handleOperator("add");
        }
        else if (label === "−")
        {
            handleOperator("subtract");
        }
        else if (label === "×")
        {
            handleOperator("multiply");
        }
        else if (label === "÷")
        {
            handleOperator("divide");
        }

        syncDisplay();
    });

// 初始化显示
syncDisplay();
