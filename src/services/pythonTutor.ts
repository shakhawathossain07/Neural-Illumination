import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Challenge, EvaluationResult } from "../types/LearningTypes";

// Reusing the key from the existing Gemini service or env
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Use a fast model for quicker interactivity
const MODEL_NAME = "gemini-3.1-pro-preview";

// ============================================
// COMPREHENSIVE OFFLINE CURRICULUM
// Organized by difficulty level (1-10)
// ============================================
const CURRICULUM: Challenge[] = [
    // LEVEL 1: Absolute Basics - Print Statements
    {
        id: "l1_hello_world",
        title: "🌍 Hello World",
        description: "Welcome! Your first task: Print 'Hello, Python!' to the console.",
        starterCode: "# Your first Python program!\n# Use the print() function\n",
        difficulty: 1,
        expectedOutputPattern: "Hello, Python!",
        hints: ["Use print() with quotes around your text", "Example: print('message')"]
    },
    {
        id: "l1_your_name",
        title: "📛 Introduce Yourself",
        description: "Print your name (or any name) to the console. Example output: 'My name is Luna'",
        starterCode: "# Introduce yourself!\n",
        difficulty: 1,
        expectedOutputPattern: "My name is",
        hints: ["Use print() with a string", "Strings can use single or double quotes"]
    },
    {
        id: "l1_favorite_number",
        title: "🔢 Lucky Number",
        description: "Print your favorite number. Just the number, nothing else!",
        starterCode: "# What's your lucky number?\n",
        difficulty: 1,
        expectedOutputPattern: "42",  // Any number is valid
        hints: ["Numbers don't need quotes", "Example: print(42)"]
    },

    // LEVEL 2: Variables & Basic Types
    {
        id: "l2_variable_intro",
        title: "📦 Variable Storage",
        description: "Create a variable called 'age' and set it to 25, then print it.",
        starterCode: "# Create a variable and print it\nage = ___\nprint(age)",
        difficulty: 2,
        expectedOutputPattern: "25",
        hints: ["Replace ___ with a number", "Variables store data for later use"]
    },
    {
        id: "l2_string_concat",
        title: "🔗 String Concatenation",
        description: "Create two variables: first_name = 'Cyber' and last_name = 'Bot'. Print them together as 'CyberBot'.",
        starterCode: "first_name = 'Cyber'\nlast_name = 'Bot'\n# Print them combined\n",
        difficulty: 2,
        expectedOutputPattern: "CyberBot",
        hints: ["Use + to combine strings", "print(first_name + last_name)"]
    },
    {
        id: "l2_simple_math",
        title: "➕ Quick Math",
        description: "Calculate 15 + 27 and print the result.",
        starterCode: "# Do some math!\nresult = ___\nprint(result)",
        difficulty: 2,
        expectedOutputPattern: "42",
        hints: ["Python can do math directly", "result = 15 + 27"]
    },

    // LEVEL 3: Basic Logic & Comparisons
    {
        id: "l3_if_statement",
        title: "🚦 Traffic Light",
        description: "Given a variable 'light' set to 'green', print 'GO!' if it's green.",
        starterCode: "light = 'green'\n# If light is green, print GO!\n",
        difficulty: 3,
        expectedOutputPattern: "GO!",
        hints: ["Use if light == 'green':", "Don't forget the colon and indentation"]
    },
    {
        id: "l3_comparison",
        title: "⚖️ Number Comparison",
        description: "Given x = 10, print 'Big' if x is greater than 5, otherwise print 'Small'.",
        starterCode: "x = 10\n# Is x big or small?\n",
        difficulty: 3,
        expectedOutputPattern: "Big",
        hints: ["Use if x > 5:", "Use else: for the other case"]
    },
    {
        id: "l3_boolean",
        title: "✅ True or False",
        description: "Create a variable 'is_sunny' set to True. Print 'Beach day!' if it's sunny.",
        starterCode: "is_sunny = True\n# Check the weather\n",
        difficulty: 3,
        expectedOutputPattern: "Beach day!",
        hints: ["Booleans are True or False (capitalized)", "if is_sunny:"]
    },

    // LEVEL 4: Loops - For
    {
        id: "l4_simple_loop",
        title: "🔄 Counting Stars",
        description: "Print numbers 1 to 5, each on a new line.",
        starterCode: "# Count to 5!\n",
        difficulty: 4,
        expectedOutputPattern: "1",
        hints: ["Use for i in range(1, 6):", "range(1, 6) gives 1,2,3,4,5"]
    },
    {
        id: "l4_loop_sum",
        title: "📊 Sum It Up",
        description: "Calculate the sum of numbers from 1 to 10 using a loop. Print the result (should be 55).",
        starterCode: "total = 0\n# Add up 1 to 10\n\nprint(total)",
        difficulty: 4,
        expectedOutputPattern: "55",
        hints: ["Use for i in range(1, 11):", "Add each number: total = total + i"]
    },
    {
        id: "l4_loop_list",
        title: "🍎 Fruit Basket",
        description: "Given fruits = ['apple', 'banana', 'cherry'], print each fruit on a new line.",
        starterCode: "fruits = ['apple', 'banana', 'cherry']\n# Print each fruit\n",
        difficulty: 4,
        expectedOutputPattern: "apple",
        hints: ["Use for fruit in fruits:", "This loops through each item"]
    },

    // LEVEL 5: Lists & Basic Functions
    {
        id: "l5_list_access",
        title: "🎯 First Element",
        description: "Given scores = [95, 87, 92, 88], print the first score.",
        starterCode: "scores = [95, 87, 92, 88]\n# Get the first score\n",
        difficulty: 5,
        expectedOutputPattern: "95",
        hints: ["Lists are zero-indexed", "Use scores[0]"]
    },
    {
        id: "l5_list_len",
        title: "📏 How Many?",
        description: "Given items = ['a', 'b', 'c', 'd', 'e'], print the number of items.",
        starterCode: "items = ['a', 'b', 'c', 'd', 'e']\n# Count the items\n",
        difficulty: 5,
        expectedOutputPattern: "5",
        hints: ["Use the len() function", "print(len(items))"]
    },
    {
        id: "l5_simple_function",
        title: "🔧 Build a Greeter",
        description: "Create a function called 'greet' that prints 'Hello, friend!'. Then call it.",
        starterCode: "# Define and call a function\n",
        difficulty: 5,
        expectedOutputPattern: "Hello, friend!",
        hints: ["Use def greet():", "Call it with greet()"]
    },

    // LEVEL 6: Functions with Parameters
    {
        id: "l6_func_param",
        title: "🎁 Personalized Greeting",
        description: "Create a function 'greet(name)' that prints 'Hello, {name}!'. Call it with 'Atlas'.",
        starterCode: "# Function with a parameter\n\n# Call: greet('Atlas')",
        difficulty: 6,
        expectedOutputPattern: "Hello, Atlas!",
        hints: ["def greet(name):", "Use f-strings: print(f'Hello, {name}!')"]
    },
    {
        id: "l6_func_return",
        title: "📐 Square Calculator",
        description: "Create a function 'square(n)' that RETURNS n squared. Print square(5).",
        starterCode: "# Return a value from a function\n\nprint(square(5))",
        difficulty: 6,
        expectedOutputPattern: "25",
        hints: ["Use return n * n", "return sends a value back"]
    },
    {
        id: "l6_while_loop",
        title: "⏳ Countdown",
        description: "Use a while loop to print numbers from 5 down to 1, then print 'Liftoff!'",
        starterCode: "count = 5\n# Countdown!\n",
        difficulty: 6,
        expectedOutputPattern: "Liftoff!",
        hints: ["while count > 0:", "Decrease count each loop: count -= 1"]
    },

    // LEVEL 7: Intermediate Concepts
    {
        id: "l7_list_comp",
        title: "✨ List Comprehension",
        description: "Create a list of squares [1, 4, 9, 16, 25] using list comprehension and print it.",
        starterCode: "# Use list comprehension\nsquares = ___\nprint(squares)",
        difficulty: 7,
        expectedOutputPattern: "[1, 4, 9, 16, 25]",
        hints: ["[x**2 for x in range(1, 6)]", "This is a one-liner for loops"]
    },
    {
        id: "l7_dict_basics",
        title: "📖 Dictionary Lookup",
        description: "Given user = {'name': 'Luna', 'role': 'AI'}, print the user's name.",
        starterCode: "user = {'name': 'Luna', 'role': 'AI'}\n# Print the name\n",
        difficulty: 7,
        expectedOutputPattern: "Luna",
        hints: ["Use user['name']", "Dictionaries use key-value pairs"]
    },
    {
        id: "l7_string_methods",
        title: "🔠 String Manipulation",
        description: "Given text = '  hello world  ', print it uppercased and stripped of spaces.",
        starterCode: "text = '  hello world  '\n# Clean and uppercase\n",
        difficulty: 7,
        expectedOutputPattern: "HELLO WORLD",
        hints: ["Use .strip() to remove spaces", "Use .upper() for uppercase"]
    },

    // LEVEL 8: Advanced Functions & Concepts
    {
        id: "l8_recursion",
        title: "🔁 Factorial",
        description: "Create a recursive function 'factorial(n)' and print factorial(5) (should be 120).",
        starterCode: "# Recursive factorial\n\nprint(factorial(5))",
        difficulty: 8,
        expectedOutputPattern: "120",
        hints: ["Base case: if n <= 1: return 1", "Recursive: return n * factorial(n-1)"]
    },
    {
        id: "l8_lambda",
        title: "⚡ Lambda Express",
        description: "Create a lambda function 'double' that doubles a number. Print double(7).",
        starterCode: "# Lambda function\ndouble = ___\nprint(double(7))",
        difficulty: 8,
        expectedOutputPattern: "14",
        hints: ["lambda x: x * 2", "Lambdas are one-line functions"]
    },
    {
        id: "l8_try_except",
        title: "🛡️ Error Handling",
        description: "Try to convert 'abc' to int. If it fails, print 'Invalid number'.",
        starterCode: "# Handle the error gracefully\ntext = 'abc'\n",
        difficulty: 8,
        expectedOutputPattern: "Invalid number",
        hints: ["Use try: and except:", "ValueError is raised for bad conversions"]
    },

    // LEVEL 9: OOP Basics
    {
        id: "l9_simple_class",
        title: "🏗️ Build a Robot",
        description: "Create a class 'Robot' with a 'name' attribute. Create robot1 with name 'R2D2' and print its name.",
        starterCode: "# Define a Robot class\n\nrobot1 = Robot('R2D2')\nprint(robot1.name)",
        difficulty: 9,
        expectedOutputPattern: "R2D2",
        hints: ["class Robot:", "def __init__(self, name): self.name = name"]
    },
    {
        id: "l9_class_method",
        title: "🤖 Robot Actions",
        description: "Add a method 'greet()' to Robot that prints 'Beep boop!'. Create a robot and call greet().",
        starterCode: "# Robot with a method\n\nbot = Robot()\nbot.greet()",
        difficulty: 9,
        expectedOutputPattern: "Beep boop!",
        hints: ["def greet(self):", "Methods take 'self' as first parameter"]
    },

    // LEVEL 10: Advanced Algorithms
    {
        id: "l10_fibonacci",
        title: "🐚 Fibonacci Sequence",
        description: "Print the first 10 Fibonacci numbers: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34",
        starterCode: "# Generate Fibonacci sequence\n",
        difficulty: 10,
        expectedOutputPattern: "0, 1, 1, 2, 3, 5, 8, 13, 21, 34",
        hints: ["Start with a=0, b=1", "Each number is sum of previous two"]
    },
    {
        id: "l10_prime_check",
        title: "🔢 Prime Detector",
        description: "Create a function is_prime(n) that returns True if n is prime. Print is_prime(17).",
        starterCode: "# Check if a number is prime\n\nprint(is_prime(17))",
        difficulty: 10,
        expectedOutputPattern: "True",
        hints: ["Check divisibility from 2 to sqrt(n)", "Prime = only divisible by 1 and itself"]
    },
    {
        id: "l10_palindrome",
        title: "🔄 Palindrome Checker",
        description: "Create a function is_palindrome(s) that returns True if string is same forwards and backwards. Test with 'racecar'.",
        starterCode: "# Check for palindrome\n\nprint(is_palindrome('racecar'))",
        difficulty: 10,
        expectedOutputPattern: "True",
        hints: ["s == s[::-1] reverses a string", "Compare original with reversed"]
    }
];

export class PythonTutorService {
    private model: ReturnType<typeof genAI.getGenerativeModel>;
    private usedChallengeIds: Set<string> = new Set();

    constructor() {
        this.model = genAI.getGenerativeModel({ model: MODEL_NAME });
    }

    async generateChallenge(difficulty: number, previousTopics: string[] = []): Promise<Challenge> {
        // First, try to get a unique challenge from our curated curriculum
        const curriculumChallenge = this.getFromCurriculum(difficulty, previousTopics);

        // If we have a curriculum challenge, use it (more reliable)
        if (curriculumChallenge) {
            return curriculumChallenge;
        }

        // Otherwise, try AI generation for more variety
        const prompt = `
You are an expert Python Tutor AI creating unique, engaging coding challenges.

DIFFICULTY: ${difficulty}/10
PREVIOUSLY COMPLETED: ${previousTopics.slice(-5).join(", ") || "None yet"}

DIFFICULTY GUIDELINES:
- Level 1-2: Print statements, basic variables, simple strings
- Level 3-4: If/else logic, simple loops, basic comparisons
- Level 5-6: Functions, lists, while loops, parameters
- Level 7-8: List comprehensions, dictionaries, recursion, lambdas
- Level 9-10: Classes, OOP, algorithms, advanced concepts

RULES:
1. Create a UNIQUE challenge not similar to previous topics
2. Make it FUN and engaging with emojis in title
3. Give clear, specific instructions
4. Provide helpful starter code
5. Include 2 progressive hints

Return ONLY valid JSON:
{
    "id": "unique_snake_case_id",
    "title": "🎯 Catchy Title",
    "description": "Clear task description",
    "starterCode": "# Helpful starter code\\n",
    "difficulty": ${difficulty},
    "expectedOutputPattern": "expected output text or pattern",
    "hints": ["First hint", "More specific second hint"]
}`;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
            const aiChallenge = JSON.parse(cleanText) as Challenge;
            this.usedChallengeIds.add(aiChallenge.id);
            return aiChallenge;
        } catch (error) {
            console.error("Gemini Challenge Gen Failed, using curriculum:", error);
            return this.getFromCurriculum(difficulty, previousTopics, true) || CURRICULUM[0];
        }
    }

    private getFromCurriculum(difficulty: number, previousTopics: string[], forceAny: boolean = false): Challenge | null {
        // Get challenges at this difficulty level
        let available = CURRICULUM.filter(c =>
            c.difficulty === difficulty &&
            !this.usedChallengeIds.has(c.id) &&
            !previousTopics.includes(c.title)
        );

        // If no exact match, try nearby levels
        if (available.length === 0) {
            available = CURRICULUM.filter(c =>
                Math.abs(c.difficulty - difficulty) <= 1 &&
                !this.usedChallengeIds.has(c.id) &&
                !previousTopics.includes(c.title)
            );
        }

        // If still none and we need to force, get any unused
        if (available.length === 0 && forceAny) {
            available = CURRICULUM.filter(c => !this.usedChallengeIds.has(c.id));
        }

        // If all used, reset and start over
        if (available.length === 0) {
            this.usedChallengeIds.clear();
            available = CURRICULUM.filter(c => c.difficulty === difficulty);
        }

        if (available.length === 0) return null;

        // Pick a random one from available
        const challenge = available[Math.floor(Math.random() * available.length)];
        this.usedChallengeIds.add(challenge.id);
        return challenge;
    }

    async evaluateSubmission(
        code: string,
        output: string,
        challenge: Challenge
    ): Promise<EvaluationResult> {
        const prompt = `
You are grading a Python student's code. Be ENCOURAGING and helpful!

CHALLENGE: ${challenge.title}
TASK: ${challenge.description}
EXPECTED OUTPUT: ${challenge.expectedOutputPattern}

STUDENT CODE:
${code}

ACTUAL OUTPUT:
${output}

GRADING:
1. Does the output match expectation?
2. Is the code logic correct?
3. Any style improvements?

BE ENCOURAGING! Celebrate wins, gently guide failures.

Return ONLY valid JSON:
{
    "passed": true/false,
    "feedback": "Encouraging message with specific feedback",
    "scoreAdjustment": number (1.0 perfect, 0.5 partial, -0.5 wrong),
    "nextDifficulty": ${challenge.difficulty} (same/+1/-1 based on performance)
}`;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
            return JSON.parse(cleanText) as EvaluationResult;
        } catch (error) {
            console.error("Gemini Evaluation Failed, using local check:", error);

            // Smart local evaluation
            const outputLower = output.toLowerCase().trim();
            const expectedPattern = challenge.expectedOutputPattern || "";

            let passed = false;
            if (typeof expectedPattern === 'string') {
                passed = outputLower.includes(expectedPattern.toLowerCase());
            }

            return {
                passed,
                feedback: passed
                    ? "🎉 Excellent work! Your code produced the correct output!"
                    : "🤔 Not quite right. Check your output and try again. You've got this!",
                scoreAdjustment: passed ? 1 : 0,
                nextDifficulty: passed ? Math.min(10, challenge.difficulty + 1) : challenge.difficulty
            };
        }
    }

    // Reset progress (for testing/new sessions)
    resetProgress(): void {
        this.usedChallengeIds.clear();
    }
}

export const pythonTutor = new PythonTutorService();


