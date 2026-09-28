import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect } from 'react';

type EditorLanguage = 'python' | 'cpp' | 'plaintext';
type MonacoApi = Parameters<OnMount>[1];

type MonacoCodeEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  error?: string;
  height?: string;
  readOnly?: boolean;
};

const registeredLanguages = new Set<EditorLanguage>();
let monacoInstance: MonacoApi | undefined;

const getCompletionItems = (monaco: MonacoApi, language: Exclude<EditorLanguage, 'plaintext'>) => {
  const keyword = monaco.languages.CompletionItemKind.Keyword;
  const functionKind = monaco.languages.CompletionItemKind.Function;
  const snippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

  if (language === 'python') {
    return [
      { label: 'def', kind: keyword, insertText: 'def ${1:function_name}(${2:args}):\n\t$0', insertTextRules: snippet, detail: 'Python function' },
      { label: 'for', kind: keyword, insertText: 'for ${1:item} in ${2:iterable}:\n\t$0', insertTextRules: snippet, detail: 'Python loop' },
      { label: 'if', kind: keyword, insertText: 'if ${1:condition}:\n\t$0', insertTextRules: snippet, detail: 'Python condition' },
      { label: 'while', kind: keyword, insertText: 'while ${1:condition}:\n\t$0', insertTextRules: snippet, detail: 'Python loop' },
      { label: 'print', kind: functionKind, insertText: 'print(${1:value})$0', insertTextRules: snippet, detail: 'Python built-in' },
      { label: 'input', kind: functionKind, insertText: 'input(${1:prompt})$0', insertTextRules: snippet, detail: 'Python built-in' },
      { label: 'map', kind: functionKind, insertText: 'map(${1:function}, ${2:iterable})$0', insertTextRules: snippet, detail: 'Python built-in' },
      { label: 'range', kind: functionKind, insertText: 'range(${1:stop})$0', insertTextRules: snippet, detail: 'Python built-in' },
    ];
  }

  return [
    { label: '#include', kind: keyword, insertText: '#include <${1:bits/stdc++.h}>$0', insertTextRules: snippet, detail: 'C++ include directive' },
    { label: 'int main', kind: functionKind, insertText: 'int main() {\n    $0\n}', insertTextRules: snippet, detail: 'C++ entry point' },
    { label: 'for', kind: keyword, insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}', insertTextRules: snippet, detail: 'C++ loop' },
    { label: 'if', kind: keyword, insertText: 'if (${1:condition}) {\n    $0\n}', insertTextRules: snippet, detail: 'C++ condition' },
    { label: 'vector', kind: functionKind, insertText: 'vector<${1:int}> ${2:values};$0', insertTextRules: snippet, detail: 'C++ standard container' },
    { label: 'cout', kind: functionKind, insertText: "cout << ${1:value} << '\\n';$0", insertTextRules: snippet, detail: 'C++ output' },
    { label: 'cin', kind: functionKind, insertText: 'cin >> ${1:value};$0', insertTextRules: snippet, detail: 'C++ input' },
  ];
};

function registerCompletionProvider(monaco: MonacoApi, language: EditorLanguage) {
  if (language === 'plaintext' || registeredLanguages.has(language)) return;

  const suggestions = getCompletionItems(monaco, language);
  monaco.languages.registerCompletionItemProvider(language, {
    triggerCharacters: ['.', ' ', '#'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return { suggestions: suggestions.map((suggestion) => ({ ...suggestion, range })) };
    },
  });
  registeredLanguages.add(language);
}

export function MonacoCodeEditor({
  label,
  value,
  onChange,
  language,
  error,
  height = '220px',
  readOnly = false,
}: MonacoCodeEditorProps) {
  const handleMount = useCallback<OnMount>((_editor, monaco) => {
    monacoInstance = monaco;
    registerCompletionProvider(monaco, language);
  }, [language]);

  useEffect(() => {
    if (monacoInstance) registerCompletionProvider(monacoInstance, language);
  }, [language]);

  return (
    <label className="block text-sm text-gray-700">
      <span className="mb-1 flex items-center justify-between gap-3">
        <span className="font-medium">{label}</span>
        {language !== 'plaintext' && <span className="text-xs text-gray-500">Ctrl+Space để xem gợi ý</span>}
      </span>
      <div className={`overflow-hidden rounded border ${error ? 'border-red-500' : 'border-gray-700'}`}>
        <Editor
          height={height}
          language={language}
          theme="vs-dark"
          value={value}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          onMount={handleMount}
          options={{
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
            contextmenu: true,
            folding: true,
            fontSize: 14,
            lineNumbers: 'on',
            minimap: { enabled: true },
            padding: { top: 10, bottom: 10 },
            quickSuggestions: language !== 'plaintext',
            readOnly,
            scrollBeyondLastLine: false,
            suggestOnTriggerCharacters: language !== 'plaintext',
            tabSize: 4,
            wordWrap: 'on',
          }}
        />
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
