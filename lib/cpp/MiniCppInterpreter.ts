
export interface InterpreterResult {
    output: string[];
    error?: string;
}

export interface SyntaxCheckResult {
    valid: boolean;
    error?: string;
    line?: number;
}

export class MiniCppInterpreter {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private variables: Map<string, any> = new Map();
    private outputBuffer: string[] = [];
    private inputBuffer: string[] = [];

    constructor() {
        this.reset();
    }

    reset() {
        this.variables.clear();
        this.outputBuffer = [];
        this.inputBuffer = [];
    }

    /**
     * Checks for common syntax errors and returns a friendly Mongolian message.
     */
    checkSyntax(code: string): SyntaxCheckResult {
        const lines = code.split('\n');

        // Check 1: Semicolons
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length === 0 || line.startsWith('//') || line.startsWith('#') || line.endsWith('{') || line.endsWith('}') || line === 'using namespace std;') continue;

            // Exclude lines that shouldn't have semicolons (if, else, for headers)
            if (line.startsWith('if') || line.startsWith('else') || line.startsWith('for') || line.startsWith('while') || line.startsWith('int main')) continue;

            if (!line.endsWith(';')) {
                return {
                    valid: false,
                    error: `${i + 1}-р мөрөнд цэгтэй таслал (;) дутуу байна.`,
                    line: i + 1
                };
            }
        }

        // Check 2: Braces balance
        let openBraces = 0;
        for (let i = 0; i < code.length; i++) {
            if (code[i] === '{') openBraces++;
            if (code[i] === '}') openBraces--;
        }

        if (openBraces !== 0) {
            return {
                valid: false,
                error: openBraces > 0 ? "Хаах хаалт (}) дутуу байна." : "Нээх хаалт ({) дутуу байна."
            };
        }

        return { valid: true };
    }

    /**
     * Executes the code with provided inputs.
     * This is a simplified regex-based execution for education.
     * It does NOT run actual C++ but simulates the logic of specific labs.
     */
    execute(code: string, inputs: string[] = []): InterpreterResult {
        this.reset();
        this.inputBuffer = [...inputs];

        try {
            const lines = code.split('\n');
            let i = 0;
            let loopStartLine = -1;
            let loopCondition = "";
            let loopStep = "";

            let loopLimit = 0; // infinite loop guard

            while (i < lines.length) {
                if (loopLimit > 1000) throw new Error("Infinite loop detected");

                const line = lines[i].trim();

                // Skip comments and empty lines
                if (!line || line.startsWith('//') || line.startsWith('#') || line === 'using namespace std;') {
                    i++; continue;
                }

                // Variable Declaration: int x = 5; or int x;
                if (line.match(/^int\s+\w+/)) {
                    const match = line.match(/^int\s+(\w+)(\s*=\s*(.+))?;/);
                    if (match) {
                        const varName = match[1];
                        const valueExp = match[3];
                        let value = 0;
                        if (valueExp) {
                            value = this.evaluateExpression(valueExp);
                        }
                        this.variables.set(varName, value);
                    }
                }
                else if (line.match(/^string\s+\w+/)) {
                    const match = line.match(/^string\s+(\w+)(\s*=\s*"(.*)")?;/);
                    if (match) {
                        const varName = match[1];
                        const value = match[3] || "";
                        this.variables.set(varName, value);
                    }
                }

                // COUT: cout << "Hello" << x << endl;
                else if (line.startsWith('cout')) {
                    const parts = line.split('<<').slice(1); // skip cout
                    let outputLine = "";

                    for (let part of parts) {
                        part = part.trim();
                        if (part.endsWith(';')) part = part.slice(0, -1).trim();
                        if (part === 'endl') {
                            // strictly handled, often just newline
                            outputLine += '\n';
                        } else if (part.startsWith('"') && part.endsWith('"')) {
                            outputLine += part.slice(1, -1);
                        } else {
                            // Variable lookup
                            if (this.variables.has(part)) {
                                outputLine += this.variables.get(part);
                            } else {
                                // Try eval arithmetic
                                try {
                                    outputLine += this.evaluateExpression(part);
                                } catch {
                                    outputLine += `[Undef: ${part}]`;
                                }
                            }
                        }
                    }
                    this.outputBuffer.push(outputLine);
                }

                // CIN: cin >> x;
                else if (line.startsWith('cin')) {
                    const match = line.match(/cin\s*>>\s*(\w+);/);
                    if (match) {
                        const varName = match[1];
                        const inputVal = this.inputBuffer.shift();
                        if (inputVal !== undefined) {
                            if (Number.isNaN(Number(inputVal))) {
                                this.variables.set(varName, inputVal);
                            } else {
                                this.variables.set(varName, Number(inputVal));
                            }
                        } else {
                            // No input provided, runtime error simulation
                            return { output: this.outputBuffer, error: "Оролтын утга дууссан байна." };
                        }
                    }
                }

                // SIMPLE IF/ELSE simulation
                // Note: supporting only single line blocks or simple blocks for this demo version
                else if (line.startsWith('if')) {
                    const conditionMatch = line.match(/if\s*\((.+)\)/);
                    if (conditionMatch) {
                        const condition = conditionMatch[1];
                        const isTrue = this.evaluateCondition(condition);
                        if (!isTrue) {
                            // Skip to else or end of block
                            // Very simple block skipper (scan for closing brace)
                            let braces = 0;
                            if (line.includes('{')) braces++;

                            let j = i + 1;
                            while (j < lines.length) {
                                if (lines[j].includes('{')) braces++;
                                if (lines[j].includes('}')) braces--;
                                if (braces === 0) {
                                    i = j; // Jump here
                                    break;
                                }
                                j++;
                            }
                            // If next line is not 'else', normal flow continues.
                            // If next line is 'else', we are currently at 'i' which is the closing brace of 'if'.
                            // We need to check if i+1 is else.
                        }
                        // If true, just continue to next line (enter block) 
                    }
                }

                else if (line.startsWith('else')) {
                    // We hit an else. This means we executed the 'if' block successfully (because we fell through).
                    // So we must skip the else block.
                    let braces = 0;
                    if (line.includes('{')) braces++;

                    let j = i + 1;
                    while (j < lines.length) {
                        if (lines[j].includes('{')) braces++;
                        if (lines[j].includes('}')) braces--;
                        if (braces === 0) {
                            i = j; // Jump here
                            break;
                        }
                        j++;
                    }
                }

                // END OF LOOP or BLOCK
                else if (line.includes('}')) {
                    // Check if we are in a loop
                    if (loopStartLine !== -1) {
                        // Perform step
                        this.executeStep(loopStep);
                        // Check condition
                        const isTrue = this.evaluateCondition(loopCondition);
                        if (isTrue) {
                            i = loopStartLine; // Jump back
                            loopLimit++;
                            i++; continue; // Immediately start next iteration logic
                        } else {
                            loopStartLine = -1; // Loop finished
                        }
                    }
                }

                // FOR LOOP: for (int i = 1; i <= 5; i++)
                else if (line.startsWith('for')) {
                    const match = line.match(/for\s*\((.+);(.+);(.+)\)/);
                    if (match) {
                        const init = match[1].trim();
                        const cond = match[2].trim();
                        const step = match[3].trim();

                        // Init
                        if (init.startsWith('int')) {
                            const initMatch = init.match(/int\s+(\w+)\s*=\s*(.+)/);
                            if (initMatch) {
                                this.variables.set(initMatch[1], this.evaluateExpression(initMatch[2]));
                            }
                        }

                        loopCondition = cond;
                        loopStep = step;

                        // Check initial condition
                        if (this.evaluateCondition(cond)) {
                            loopStartLine = i + 1; // Body starts next line
                            if (line.includes('{')) {
                                // standard bracketed loop
                            }
                        } else {
                            // Skip loop entirely
                            let braces = 0;
                            if (line.includes('{')) braces++;

                            let j = i + 1;
                            while (j < lines.length) {
                                if (lines[j].includes('{')) braces++;
                                if (lines[j].includes('}')) braces--;
                                if (braces === 0) {
                                    i = j; // Jump here
                                    break;
                                }
                                j++;
                            }
                        }
                    }
                }

                i++;
            }

        } catch (e: unknown) {
            return {
                output: this.outputBuffer,
                error: (e as Error).message || "Үл мэдэгдэх алдаа гарлаа."
            };
        }

        return { output: this.outputBuffer };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private evaluateExpression(expr: string): any {
        // Replace known variables with values
        for (const [key, val] of this.variables.entries()) {
            // crude replace, be careful with substrings (e.g. var 'a' in 'apple')
            // Using logic to replace exact matches or simple arithmetic eval
            // For safety and simplicity, we can regex replace whole words
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            expr = expr.replace(regex, val);
        }
        // Eval arithmetic
        try {
            // eslint-disable-next-line
            return Function(`'use strict'; return (${expr})`)();
        } catch {
            return 0;
        }
    }

    private evaluateCondition(cond: string): boolean {
        // Replace known variables with values
        for (const [key, val] of this.variables.entries()) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            // quotes for strings if needed? Numbers are fine.
            if (typeof val === 'string') {
                cond = cond.replace(regex, `"${val}"`);
            } else {
                cond = cond.replace(regex, val);
            }
        }
        try {
            // eslint-disable-next-line
            return !!Function(`'use strict'; return (${cond})`)();
        } catch {
            return false;
        }
    }

    private executeStep(step: string) {
        // i++ or i--
        if (step.includes('++')) {
            const varName = step.replace('++', '').trim();
            if (this.variables.has(varName)) {
                this.variables.set(varName, this.variables.get(varName) + 1);
            }
        } else if (step.includes('--')) {
            const varName = step.replace('--', '').trim();
            if (this.variables.has(varName)) {
                this.variables.set(varName, this.variables.get(varName) - 1);
            }
        }
    }
}
