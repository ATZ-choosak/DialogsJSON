import React, { useState, useRef } from "react";

interface Node {
  text: string;
  choices?: {
    text: string;
    next: string;
    function_name: string | null;
    id: string;
  }[];
  isEnding?: boolean;
  position?: {
    x: number;
    y: number;
  };
  function_name?: string | null;
  speaker?: string | null;
  is_me?: boolean;
  next?: string;
}

interface StoryData {
  nodes: {
    [key: string]: Node;
  };
  characters?: Array<{
    id: string;
    name: string;
  }>;
}

const TranslatePage = (): React.ReactElement => {
  const [files, setFiles] = useState<File[]>([]);
  const [translationData, setTranslationData] = useState<{
    [key: string]: string;
  }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const processFiles = async () => {
    if (files.length === 0) {
      alert("Please select at least one file to import.");
      return;
    }

    setIsLoading(true);
    try {
      const translations: { [key: string]: string } = {};

      for (const file of files) {
        const text = await file.text();
        const data: StoryData = JSON.parse(text);

        // Process nodes
        Object.entries(data.nodes).forEach(([nodeId, node]) => {
          // Extract main text from nodes
          if (node.text && typeof node.text === "string") {
            translations[nodeId] = node.text;
          }

          // Extract text from choices
          if (node.choices && Array.isArray(node.choices)) {
            node.choices.forEach((choice) => {
              if (choice.text && typeof choice.text === "string") {
                const choiceId = `${nodeId}`;
                translations[choiceId] = choice.text;
              }
            });
          }
        });
      }

      setTranslationData(translations);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Error processing files. Please check the file format.");
    }
    setIsLoading(false);
  };

  const exportTranslations = () => {
    if (Object.keys(translationData).length === 0) {
      alert("No data to export. Please import files first.");
      return;
    }

    const jsonString = JSON.stringify(translationData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "translations.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFiles = () => {
    setFiles([]);
    setTranslationData({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-5 font-sans">
      <h1 className="text-2xl font-bold mb-4">Translation Export Tool</h1>

      <div className="mb-8 p-5 border border-gray-300 rounded-md">
        <h2 className="text-xl font-semibold mb-3">Import Story Files</h2>
        <input
          type="file"
          accept=".json"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          className="mb-4 w-full"
        />
        <div className="flex gap-3">
          <button
            onClick={processFiles}
            disabled={isLoading || files.length === 0}
            className={`px-4 py-2 bg-green-600 text-white rounded-md ${
              isLoading || files.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "hover:bg-green-700"
            }`}
          >
            {isLoading ? "Processing..." : "Process Files"}
          </button>
          <button
            onClick={clearFiles}
            disabled={
              isLoading ||
              (files.length === 0 && Object.keys(translationData).length === 0)
            }
            className={`px-4 py-2 bg-green-600 text-white rounded-md ${
              isLoading ||
              (files.length === 0 && Object.keys(translationData).length === 0)
                ? "bg-gray-400 cursor-not-allowed"
                : "hover:bg-green-700"
            }`}
          >
            Clear
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mb-8 p-5 border border-gray-300 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Selected Files:</h3>
          <ul className="list-disc pl-5">
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(translationData).length > 0 && (
        <div className="mb-8 p-5 border border-gray-300 rounded-md">
          <h2 className="text-xl font-semibold mb-3">Export Translations</h2>
          <div className="mb-4">
            <p>
              Found {Object.keys(translationData).length} translatable texts
            </p>
          </div>
          <button
            onClick={exportTranslations}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mb-4"
          >
            Export JSON
          </button>

          <div className="mt-5">
            <h3 className="text-lg font-semibold mb-2">Preview:</h3>
            <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[300px]">
              <pre className="m-0 whitespace-pre-wrap">
                {JSON.stringify(translationData, null, 2).substring(0, 300)}
                {Object.keys(translationData).length > 10 ? "..." : ""}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslatePage;
