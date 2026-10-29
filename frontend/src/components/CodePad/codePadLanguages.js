/**
 * The languages CodePad offers, in the order of the menu.
 *
 *   name         what the menu and the header show
 *   extension    the file extension: "main.py", and the name of a downloaded file
 *   mark         the short text inside the language's round mark (no brand logos: a mark is a
 *                tonal circle on one hue of the data series, like an avatar without a photo)
 *   tone         the hue of the data series for that mark
 *   monaco       the language id of the editor
 *   version      the runtime version the execution service expects (kept for when running is connected)
 *   defaultCode  the starter program
 */
export const LANGUAGES = {
  python: {
    name: 'Python',
    extension: 'py',
    mark: 'Py',
    tone: 'amber',
    monaco: 'python',
    version: '3.10.0',
    defaultCode:
      '# This program demonstrates reading input in Python\n\nname = input("Enter your name: ")\nage = int(input("Enter your age: "))\n\nprint(f"Hello, {name}!")\nprint(f"In 5 years, you will be {age + 5} years old.")',
  },
  javascript: {
    name: 'JavaScript',
    extension: 'js',
    mark: 'JS',
    tone: 'teal',
    monaco: 'javascript',
    version: '18.15.0',
    defaultCode: 'console.log("Hello, World!");',
  },
  java: {
    name: 'Java',
    extension: 'java',
    mark: 'Jv',
    tone: 'coral',
    monaco: 'java',
    version: '15.0.2',
    defaultCode:
      'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        \n        System.out.println("Enter an integer:");\n        int number = scanner.nextInt();\n        \n        System.out.println("You entered: " + number);\n        System.out.println("Double of your number is: " + (number * 2));\n        \n        scanner.close();\n    }\n}',
  },
  cpp: {
    name: 'C++',
    extension: 'cpp',
    mark: 'C++',
    tone: 'sky',
    monaco: 'cpp',
    version: '10.2.0',
    defaultCode:
      '#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    int age;\n    \n    std::cout << "Enter your name: ";\n    std::getline(std::cin, name);\n    \n    std::cout << "Enter your age: ";\n    std::cin >> age;\n    \n    std::cout << "Hello, " << name << "!" << std::endl;\n    std::cout << "You are " << age << " years old." << std::endl;\n    \n    return 0;\n}',
  },
  c: {
    name: 'C',
    extension: 'c',
    mark: 'C',
    tone: 'blue',
    monaco: 'c',
    version: '10.2.0',
    defaultCode:
      '#include <stdio.h>\n\nint main() {\n    char name[50];\n    int age;\n    \n    printf("Enter your name: ");\n    scanf("%s", name);\n    \n    printf("Enter your age: ");\n    scanf("%d", &age);\n    \n    printf("Hello, %s!\\n", name);\n    printf("You are %d years old.\\n", age);\n    \n    return 0;\n}',
  },
};

export const DEFAULT_LANGUAGE = 'python';

/** The file name shown above the editor and used for a download: "main.py" (Java's public class is Main) */
export const fileNameOf = (language) => `main.${LANGUAGES[language].extension}`;
