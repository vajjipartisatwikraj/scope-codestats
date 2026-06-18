import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Save as SaveIcon,
  Close as CloseIcon,
  FileDownload as FileDownloadIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "../../utils/axiosConfig";

// Import tab components
import BasicInfoTab from "./QuestionForm/BasicInfoTab";
import LanguagesTab from "./QuestionForm/LanguagesTab";
import MCQOptionsTab from "./QuestionForm/MCQOptionsTab";
import TestCasesTab from "./QuestionForm/TestCasesTab";
import AdditionalDetailsTab from "./QuestionForm/AdditionalDetailsTab";
import UploadJsonTab from "./QuestionForm/UploadJsonTab";
import SearchTab from "./QuestionForm/SearchTab";
import EditorialTab from "../cohort/tabs/EditorialTab";
import TabPanel from "./QuestionForm/TabPanel";

// Import utilities and constants
import { LANGUAGES, getDefaultFormData } from "./QuestionForm/constants";
import {
  codeExecutionApi,
  simpleValidateAllTestCases,
} from "./QuestionForm/utils";

const PAQuestionForm = ({
  initialData,
  onSave,
  onCancel,
  moduleId,
  isEdit = false,
}) => {
  // Main state
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState(getDefaultFormData(moduleId));
  const [errors, setErrors] = useState({});

  // Additional form states
  const [newTag, setNewTag] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newHint, setNewHint] = useState("");
  const [newTestCase, setNewTestCase] = useState({
    input: "",
    output: "",
    hidden: false,
    explanation: "",
  });

  // Test execution states
  const [testCaseResults, setTestCaseResults] = useState([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [availableRuntimes, setAvailableRuntimes] = useState([]);
  const [isLoadingRuntimes, setIsLoadingRuntimes] = useState(false);

  // File upload states
  const fileInputRef = useRef(null);
  const testCaseFileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingTestCases, setIsUploadingTestCases] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Confirmation dialog state
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  // Initialize form data when initialData changes
  useEffect(() => {
    if (initialData) {
      const completeFormData = {
        ...getDefaultFormData(moduleId),
        ...initialData,
        module: moduleId || initialData.module,
        marks: initialData.marks ? Number(initialData.marks) : 10,
        questionBank: initialData.questionBank || "",
        constraints: {
          timeLimit: initialData.constraints?.timeLimit
            ? Number(initialData.constraints.timeLimit)
            : 1000,
          memoryLimit: initialData.constraints?.memoryLimit
            ? Number(initialData.constraints.memoryLimit)
            : 256,
        },
        fillInTheBlank: initialData.fillInTheBlank ?? false,
        fillInTheBlankSettings: {
          allowPlainTextPaste:
            initialData.fillInTheBlankSettings?.allowPlainTextPaste ?? false,
        },
      };

      setFormData(completeFormData);
    }
  }, [initialData, moduleId]);

  // Setup available runtimes
  useEffect(() => {
    setIsLoadingRuntimes(true);
    const runtimes = LANGUAGES.map((lang) => ({
      language: lang.name,
      version: lang.version,
      displayName: lang.displayName,
    }));
    setAvailableRuntimes(runtimes);
    setIsLoadingRuntimes(false);
  }, []);

  // Input change handlers
  const handleInputChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;

      // Handle different input types
      if (type === "checkbox" || name === "encryptedEditor") {
        // For checkboxes and switches, use the checked value
        const boolValue = type === "checkbox" ? checked : value;
        setFormData((prev) => ({ ...prev, [name]: boolValue }));
      } else if (name === "marks") {
        const numValue = value === "" ? 0 : Number(value);
        if (!isNaN(numValue)) {
          setFormData((prev) => ({ ...prev, [name]: numValue }));
        }
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }

      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors]
  );

  const handleNestedInputChange = useCallback((e, parentKey, childKey) => {
    const { value } = e.target;

    if (
      parentKey === "constraints" &&
      (childKey === "timeLimit" || childKey === "memoryLimit")
    ) {
      const numValue = value === "" ? 0 : Number(value);
      if (!isNaN(numValue)) {
        setFormData((prev) => ({
          ...prev,
          [parentKey]: { ...prev[parentKey], [childKey]: numValue },
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [parentKey]: { ...prev[parentKey], [childKey]: value },
      }));
    }
  }, []);

  // Tab management
  const handleTabChange = useCallback(
    (event, newValue) => {
      const maxTabIndex = formData.type === "mcq" ? 5 : 6; // Adjusted for new tab structure with Editorial
      if (newValue <= maxTabIndex) {
        setActiveTab(newValue);
      }
    },
    [formData.type]
  );

  // Language management
  const handleLanguageSelect = useCallback(
    (languageName) => {
      if (formData.languages.some((lang) => lang.name === languageName)) {
        toast.info("This language is already added");
        return;
      }

      const language = LANGUAGES.find((lang) => lang.name === languageName);
      if (language) {
        const newLanguage = {
          name: language.name,
          version: language.version,
          boilerplateCode: language.defaultCode,
          solutionCode: "",
        };

        setFormData((prev) => ({
          ...prev,
          languages: [...prev.languages, newLanguage],
          defaultLanguage: prev.defaultLanguage || language.name,
        }));
      }
    },
    [formData.languages]
  );

  const removeLanguage = useCallback(
    (index) => {
      const updatedLanguages = [...formData.languages];
      const removedLanguage = updatedLanguages[index];
      updatedLanguages.splice(index, 1);

      let newDefaultLanguage = formData.defaultLanguage;
      if (removedLanguage.name === formData.defaultLanguage) {
        newDefaultLanguage =
          updatedLanguages.length > 0 ? updatedLanguages[0].name : "";
      }

      setFormData((prev) => ({
        ...prev,
        languages: updatedLanguages,
        defaultLanguage: newDefaultLanguage,
      }));
    },
    [formData.languages, formData.defaultLanguage]
  );

  const handleCodeChange = useCallback(
    (index, field, value) => {
      const updatedLanguages = [...formData.languages];
      updatedLanguages[index][field] = value;
      setFormData((prev) => ({ ...prev, languages: updatedLanguages }));
    },
    [formData.languages]
  );

  const handleSetDefaultLanguage = useCallback((languageName) => {
    setFormData((prev) => ({ ...prev, defaultLanguage: languageName }));
  }, []);

  // MCQ Options management
  const handleOptionChange = useCallback(
    (index, field, value) => {
      const updatedOptions = [...formData.options];

      if (field === "isCorrect" && value) {
        updatedOptions.forEach((option) => (option.isCorrect = false));
      }
      updatedOptions[index][field] = value;

      setFormData((prev) => ({ ...prev, options: updatedOptions }));

      if (errors.options || errors.optionsEmpty) {
        setErrors((prev) => ({ ...prev, options: "", optionsEmpty: "" }));
      }
    },
    [formData.options, errors]
  );

  const addOption = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { text: "", isCorrect: false }],
    }));
  }, []);

  const removeOption = useCallback(
    (index) => {
      const updatedOptions = [...formData.options];
      updatedOptions.splice(index, 1);
      setFormData((prev) => ({ ...prev, options: updatedOptions }));
    },
    [formData.options]
  );

  // Test case management
  const handleTestCaseChange = useCallback((field, value) => {
    setNewTestCase((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addTestCase = useCallback(() => {
    if (!newTestCase.input.trim() || !newTestCase.output.trim()) {
      toast.error("Input and output are required for test cases");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { ...newTestCase }],
    }));

    setNewTestCase({
      input: "",
      output: "",
      hidden: false,
      explanation: "",
    });

    if (errors.testCases) {
      setErrors((prev) => ({ ...prev, testCases: "" }));
    }
  }, [newTestCase, errors.testCases]);

  const removeTestCase = useCallback(
    (index) => {
      const updatedTestCases = [...formData.testCases];
      updatedTestCases.splice(index, 1);
      setFormData((prev) => ({ ...prev, testCases: updatedTestCases }));
    },
    [formData.testCases]
  );

  const toggleTestCaseVisibility = useCallback(
    (index) => {
      const updatedTestCases = [...formData.testCases];
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        hidden: !updatedTestCases[index].hidden,
      };
      setFormData((prev) => ({ ...prev, testCases: updatedTestCases }));
    },
    [formData.testCases]
  );

  const editTestCase = useCallback(
    (index, updatedTestCase) => {
      const updatedTestCases = [...formData.testCases];
      updatedTestCases[index] = { ...updatedTestCase };
      setFormData((prev) => ({ ...prev, testCases: updatedTestCases }));
    },
    [formData.testCases]
  );

  // Hints, tags, companies management
  const handleAddHint = useCallback(() => {
    if (!newHint.trim()) {
      toast.error("Hint text is required");
      return;
    }
    setFormData((prev) => ({ ...prev, hints: [...prev.hints, newHint] }));
    setNewHint("");
  }, [newHint]);

  const removeHint = useCallback(
    (index) => {
      const updatedHints = [...formData.hints];
      updatedHints.splice(index, 1);
      setFormData((prev) => ({ ...prev, hints: updatedHints }));
    },
    [formData.hints]
  );

  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) {
      toast.error("Tag text is required");
      return;
    }
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag] }));
    setNewTag("");
  }, [newTag]);

  const removeTag = useCallback(
    (index) => {
      const updatedTags = [...formData.tags];
      updatedTags.splice(index, 1);
      setFormData((prev) => ({ ...prev, tags: updatedTags }));
    },
    [formData.tags]
  );

  const handleAddCompany = useCallback(() => {
    if (!newCompany.trim()) {
      toast.error("Company name is required");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      companies: [...prev.companies, newCompany],
    }));
    setNewCompany("");
  }, [newCompany]);

  const removeCompany = useCallback(
    (index) => {
      const updatedCompanies = [...formData.companies];
      updatedCompanies.splice(index, 1);
      setFormData((prev) => ({ ...prev, companies: updatedCompanies }));
    },
    [formData.companies]
  );

  // File upload handlers
  const handleFileUpload = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsUploading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const questionData = JSON.parse(content);

          // Validate required fields
          if (
            !questionData.title ||
            !questionData.description ||
            !questionData.type
          ) {
            toast.error(
              "Invalid question format. JSON must include title, description, and type."
            );
            setIsUploading(false);
            return;
          }

          // Build the complete form data from JSON
          const updatedFormData = {
            ...getDefaultFormData(moduleId),
            title: questionData.title || "",
            description: questionData.description || "",
            type: questionData.type || "programming",
            difficulty: questionData.difficulty || "Medium",
            marks: questionData.marks ? Number(questionData.marks) : 10,
            questionBank: questionData.questionBank || "",
            tags: Array.isArray(questionData.tags) ? questionData.tags : [],
            companies: Array.isArray(questionData.companies)
              ? questionData.companies
              : [],
            hints: Array.isArray(questionData.hints) ? questionData.hints : [],
            videoUrl: questionData.videoUrl || "",
            articleUrl: questionData.articleUrl || "",
            referenceUrl: questionData.referenceUrl || "",
            editorial: questionData.editorial || "",
            module: moduleId,
            encryptedEditor: questionData.encryptedEditor ?? false,
            encryptionSettings: {
              allowPlainTextPaste:
                questionData.encryptionSettings?.allowPlainTextPaste ?? false,
            },
          };

          // Add type-specific fields
          if (questionData.type === "programming") {
            updatedFormData.languages = Array.isArray(questionData.languages)
              ? questionData.languages.map((lang) => ({
                  name: lang.name || "",
                  version: lang.version || "",
                  boilerplateCode: lang.boilerplateCode || "",
                  solutionCode: lang.solutionCode || "",
                  scoringTiers: Array.isArray(lang.scoringTiers)
                    ? lang.scoringTiers.map((tier) => ({
                        maxTime: tier.maxTime ? Number(tier.maxTime) : 0,
                        points: tier.points ? Number(tier.points) : 0,
                      }))
                    : [],
                  minimumPoints: lang.minimumPoints !== undefined
                    ? Number(lang.minimumPoints)
                    : 1,
                }))
              : [];

            updatedFormData.defaultLanguage =
              questionData.defaultLanguage ||
              (updatedFormData.languages.length > 0
                ? updatedFormData.languages[0].name
                : "");

            updatedFormData.testCases = Array.isArray(questionData.testCases)
              ? questionData.testCases.map((tc) => ({
                  input: tc.input || "",
                  output: tc.output || "",
                  hidden: tc.hidden || false,
                  explanation: tc.explanation || "",
                }))
              : [];

            updatedFormData.examples = Array.isArray(questionData.examples)
              ? questionData.examples
              : [];

            updatedFormData.constraints = {
              timeLimit: questionData.constraints?.timeLimit
                ? Number(questionData.constraints.timeLimit)
                : 1000,
              memoryLimit: questionData.constraints?.memoryLimit
                ? Number(questionData.constraints.memoryLimit)
                : 256,
            };
          } else if (questionData.type === "mcq") {
            updatedFormData.options = Array.isArray(questionData.options)
              ? questionData.options.map((opt) => ({
                  text: opt.text || "",
                  isCorrect: opt.isCorrect || false,
                }))
              : [{ text: "", isCorrect: false }];
          }

          setFormData(updatedFormData);
          toast.success("Question data loaded successfully from JSON");
          setActiveTab(0);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          toast.error(
            "Failed to parse JSON file. Please check the file format."
          );
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };

      reader.onerror = () => {
        toast.error("Error reading file");
        setIsUploading(false);
      };

      reader.readAsText(file);
    },
    [moduleId]
  );

  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle Paste JSON
  const handlePasteJSON = useCallback(
    (questionData) => {
      try {
        // Build the complete form data from JSON
        const updatedFormData = {
          ...getDefaultFormData(moduleId),
          title: questionData.title || "",
          description: questionData.description || "",
          type: questionData.type || "programming",
          difficulty: questionData.difficulty || "Medium",
          marks: questionData.marks ? Number(questionData.marks) : 10,
          questionBank: questionData.questionBank || "",
          tags: Array.isArray(questionData.tags) ? questionData.tags : [],
          companies: Array.isArray(questionData.companies)
            ? questionData.companies
            : [],
          hints: Array.isArray(questionData.hints) ? questionData.hints : [],
          videoUrl: questionData.videoUrl || "",
          articleUrl: questionData.articleUrl || "",
          referenceUrl: questionData.referenceUrl || "",
          editorial: questionData.editorial || "",
          module: moduleId,
          encryptedEditor: questionData.encryptedEditor ?? false,
          encryptionSettings: {
            allowPlainTextPaste:
              questionData.encryptionSettings?.allowPlainTextPaste ?? false,
          },
        };

        // Add type-specific fields
        if (questionData.type === "programming") {
          updatedFormData.languages = Array.isArray(questionData.languages)
            ? questionData.languages.map((lang) => ({
                name: lang.name || "",
                version: lang.version || "",
                boilerplateCode: lang.boilerplateCode || "",
                solutionCode: lang.solutionCode || "",
                scoringTiers: Array.isArray(lang.scoringTiers)
                  ? lang.scoringTiers.map((tier) => ({
                      maxTime: tier.maxTime ? Number(tier.maxTime) : 0,
                      points: tier.points ? Number(tier.points) : 0,
                    }))
                  : [],
                minimumPoints: lang.minimumPoints !== undefined
                  ? Number(lang.minimumPoints)
                  : 1,
              }))
            : [];

          updatedFormData.defaultLanguage =
            questionData.defaultLanguage ||
            (updatedFormData.languages.length > 0
              ? updatedFormData.languages[0].name
              : "");

          updatedFormData.testCases = Array.isArray(questionData.testCases)
            ? questionData.testCases.map((tc) => ({
                input: tc.input || "",
                output: tc.output || "",
                hidden: tc.hidden || false,
                explanation: tc.explanation || "",
              }))
            : [];

          updatedFormData.examples = Array.isArray(questionData.examples)
            ? questionData.examples
            : [];

          updatedFormData.constraints = {
            timeLimit: questionData.constraints?.timeLimit
              ? Number(questionData.constraints.timeLimit)
              : 1000,
            memoryLimit: questionData.constraints?.memoryLimit
              ? Number(questionData.constraints.memoryLimit)
              : 256,
          };
        } else if (questionData.type === "mcq") {
          updatedFormData.options = Array.isArray(questionData.options)
            ? questionData.options.map((opt) => ({
                text: opt.text || "",
                isCorrect: opt.isCorrect || false,
              }))
            : [{ text: "", isCorrect: false }];
        }

        setFormData(updatedFormData);
        toast.success("Question data loaded successfully from pasted JSON");
        setActiveTab(0); // Switch to Basic Info tab
      } catch (error) {
        console.error("Error processing pasted JSON:", error);
        toast.error("Failed to process JSON. Please check the format.");
      }
    },
    [moduleId]
  );

  // Test case file upload
  const readFileContent = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }, []);

  const handleTestCaseFileUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files);
      if (!files || files.length === 0) return;

      setIsUploadingTestCases(true);

      try {
        const inFiles = files.filter((file) => file.name.endsWith(".in"));
        const outFiles = files.filter((file) => file.name.endsWith(".out"));

        if (inFiles.length === 0) {
          toast.error(
            "No .in files found. Please select files with .in extension."
          );
          setIsUploadingTestCases(false);
          return;
        }

        const newTestCases = [];

        inFiles.sort((a, b) => a.name.localeCompare(b.name));
        outFiles.sort((a, b) => a.name.localeCompare(b.name));

        for (const inFile of inFiles) {
          const baseName = inFile.name.replace(".in", "");
          const outFile = outFiles.find(
            (file) => file.name === `${baseName}.out`
          );

          if (outFile) {
            try {
              const inputContent = await readFileContent(inFile);
              const outputContent = await readFileContent(outFile);

              newTestCases.push({
                input: inputContent.trim(),
                output: outputContent.trim(),
                hidden: false,
                explanation: `Test case from ${inFile.name}`,
              });
            } catch (error) {
              console.error(
                `Error reading files ${inFile.name}/${outFile.name}:`,
                error
              );
              toast.error(`Error reading files ${inFile.name}/${outFile.name}`);
            }
          } else {
            toast.warn(`No matching .out file found for ${inFile.name}`);
          }
        }

        if (newTestCases.length > 0) {
          setFormData((prev) => ({
            ...prev,
            testCases: [...prev.testCases, ...newTestCases],
          }));
          toast.success(
            `Successfully loaded ${newTestCases.length} test cases from files!`
          );
        } else {
          toast.error("No valid test case pairs found");
        }
      } catch (error) {
        console.error("Error processing test case files:", error);
        toast.error("Failed to process test case files");
      } finally {
        setIsUploadingTestCases(false);
        if (testCaseFileInputRef.current) {
          testCaseFileInputRef.current.value = "";
        }
      }
    },
    [readFileContent]
  );

  const handleTestCaseUploadButtonClick = useCallback(() => {
    testCaseFileInputRef.current?.click();
  }, []);

  // Search functionality
  const handleSearchQuestions = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await axios.get(
        `/practice-arena/questions/search?q=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(response.data);

      if (response.data.length === 0) {
        toast.info("No questions found matching your search");
      } else {
        toast.success(
          `Found ${response.data.length} questions matching your search`
        );
      }
    } catch (error) {
      console.error("Error searching for questions:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleLoadQuestion = useCallback(
    (question) => {
      const loadedFormData = {
        ...getDefaultFormData(moduleId),
        ...question,
        module: moduleId,
        marks: question.marks ? Number(question.marks) : 10,
        constraints: {
          timeLimit: question.constraints?.timeLimit
            ? Number(question.constraints.timeLimit)
            : 1000,
          memoryLimit: question.constraints?.memoryLimit
            ? Number(question.constraints.memoryLimit)
            : 256,
        },
      };

      setFormData(loadedFormData);
      setSearchResults([]);
      setSearchQuery("");
      toast.success(`Question "${question.title}" loaded successfully`);
    },
    [moduleId]
  );

  // Test case validation
  const validateAllTestCases = useCallback(async () => {
    return await simpleValidateAllTestCases(
      formData,
      setIsRunningTest,
      setTestCaseResults
    );
  }, [formData]);

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.questionBank || !formData.questionBank.trim()) {
      newErrors.questionBank = "Question Bank is required";
    }

    if (formData.type === "mcq") {
      const hasCorrectOption = formData.options.some(
        (option) => option.isCorrect
      );
      if (!hasCorrectOption) {
        newErrors.options = "At least one option must be marked as correct";
      }

      const emptyOptions = formData.options.some(
        (option) => !option.text.trim()
      );
      if (emptyOptions) {
        newErrors.optionsEmpty = "All options must have text";
      }
    } else if (formData.type === "programming") {
      if (formData.languages.length === 0) {
        newErrors.languages =
          "At least one programming language must be selected";
      }

      if (!formData.defaultLanguage) {
        newErrors.defaultLanguage = "A default language must be selected";
      }

      const invalidLanguages = formData.languages.some(
        (lang) => !lang.boilerplateCode
      );
      if (invalidLanguages) {
        newErrors.languageCode = "All languages must have boilerplate code";
      }

      if (formData.testCases.length === 0) {
        newErrors.testCases = "At least one test case is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        toast.error("Please fix the form errors before submitting");
        return;
      }

      if (formData.type === "programming" && formData.testCases.length > 0) {
        setIsRunningTest(true);

        try {
          const defaultLang = formData.languages.find(
            (lang) => lang.name === formData.defaultLanguage
          );

          if (!defaultLang || !defaultLang.solutionCode) {
            toast.error(
              "Please provide a solution code for the default language first"
            );
            setIsRunningTest(false);
            return;
          }

          const results = await validateAllTestCases();
          const allPassed = results.every((result) => result.passed);

          if (allPassed) {
            toast.success("All test cases validated successfully!");
            const finalFormData = { ...formData };
            if (formData.type === "mcq") {
              delete finalFormData.languages;
              delete finalFormData.defaultLanguage;
              delete finalFormData.testCases;
              delete finalFormData.examples;
              delete finalFormData.constraints;
            }
            onSave(finalFormData);
          } else {
            toast.error(
              "Cannot submit question until all test cases pass with your solution code."
            );
          }
        } catch (error) {
          console.error("Error validating test cases:", error);
          toast.error("Failed to validate test cases");
        } finally {
          setIsRunningTest(false);
        }
      } else {
        const finalFormData = { ...formData };
        if (formData.type === "mcq") {
          delete finalFormData.languages;
          delete finalFormData.defaultLanguage;
          delete finalFormData.testCases;
          delete finalFormData.examples;
          delete finalFormData.constraints;
        }
        onSave(finalFormData);
      }
    },
    [formData, validateForm, validateAllTestCases, onSave]
  );

  // Export to JSON functionality
  const handleExportToJSON = useCallback(() => {
    try {
      // Create a clean copy of the form data for export
      const exportData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        difficulty: formData.difficulty,
        marks: formData.marks,
        questionBank: formData.questionBank,
        tags: formData.tags,
        companies: formData.companies,
        hints: formData.hints,
        videoUrl: formData.videoUrl,
        articleUrl: formData.articleUrl,
        referenceUrl: formData.referenceUrl,
        editorial: formData.editorial || "",
        encryptedEditor: formData.encryptedEditor || false,
        encryptionSettings: formData.encryptionSettings || {
          allowPlainTextPaste: false,
        },
      };

      // Add type-specific fields
      if (formData.type === "programming") {
        exportData.languages = formData.languages;
        exportData.defaultLanguage = formData.defaultLanguage;
        exportData.testCases = formData.testCases;
        exportData.examples = formData.examples;
        exportData.constraints = formData.constraints;
      } else if (formData.type === "mcq") {
        exportData.options = formData.options;
      }

      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create a blob and download link
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename from question title
      const filename = formData.title
        ? `${formData.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`
        : "question.json";

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Question exported to JSON successfully!");
    } catch (error) {
      console.error("Error exporting to JSON:", error);
      toast.error("Failed to export question to JSON");
    }
  }, [formData]);

  // Handle cancel with confirmation
  const handleCancelClick = useCallback(() => {
    // Check if any form data has been entered
    const hasData =
      formData.title.trim() !== "" ||
      formData.description.trim() !== "" ||
      formData.questionBank.trim() !== "" ||
      formData.tags.length > 0 ||
      formData.companies.length > 0 ||
      formData.hints.length > 0 ||
      (formData.type === "programming" && formData.testCases.length > 0) ||
      (formData.type === "mcq" &&
        formData.options.some((opt) => opt.text.trim() !== ""));

    if (hasData) {
      setShowCancelConfirmation(true);
    } else {
      onCancel();
    }
  }, [formData, onCancel]);

  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirmation(false);
    onCancel();
  }, [onCancel]);

  const handleCancelConfirmation = useCallback(() => {
    setShowCancelConfirmation(false);
  }, []);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%", p: 3 }}>
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        aria-label="question form tabs"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Basic Info" />
        <Tab label={formData.type === "mcq" ? "Options" : "Languages"} />
        {formData.type === "programming" && <Tab label="Test Cases" />}
        <Tab label="Additional Details" />
        <Tab label="Editorial" />
        <Tab label="Upload JSON" />
        <Tab label="Search Questions" />
      </Tabs>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <BasicInfoTab
          formData={formData}
          errors={errors}
          onInputChange={handleInputChange}
          onNestedInputChange={handleNestedInputChange}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {formData.type === "mcq" ? (
          <MCQOptionsTab
            formData={formData}
            errors={errors}
            onOptionChange={handleOptionChange}
            onAddOption={addOption}
            onRemoveOption={removeOption}
          />
        ) : (
          <LanguagesTab
            formData={formData}
            errors={errors}
            availableRuntimes={availableRuntimes}
            isLoadingRuntimes={isLoadingRuntimes}
            onLanguageSelect={handleLanguageSelect}
            onRemoveLanguage={removeLanguage}
            onCodeChange={handleCodeChange}
            onSetDefaultLanguage={handleSetDefaultLanguage}
            onInputChange={handleInputChange}
          />
        )}
      </TabPanel>

      {formData.type === "programming" && (
        <TabPanel value={activeTab} index={2}>
          <TestCasesTab
            formData={formData}
            errors={errors}
            newTestCase={newTestCase}
            testCaseResults={testCaseResults}
            isRunningTest={isRunningTest}
            testCaseFileInputRef={testCaseFileInputRef}
            isUploadingTestCases={isUploadingTestCases}
            onTestCaseChange={handleTestCaseChange}
            onAddTestCase={addTestCase}
            onRemoveTestCase={removeTestCase}
            onToggleTestCaseVisibility={toggleTestCaseVisibility}
            onEditTestCase={editTestCase}
            onTestCaseFileUpload={handleTestCaseFileUpload}
            onTestCaseUploadButtonClick={handleTestCaseUploadButtonClick}
            onValidateAllTestCases={validateAllTestCases}
          />
        </TabPanel>
      )}

      <TabPanel
        value={activeTab}
        index={formData.type === "programming" ? 3 : 2}
      >
        <AdditionalDetailsTab
          formData={formData}
          newHint={newHint}
          newTag={newTag}
          newCompany={newCompany}
          onSetNewHint={setNewHint}
          onSetNewTag={setNewTag}
          onSetNewCompany={setNewCompany}
          onAddHint={handleAddHint}
          onRemoveHint={removeHint}
          onAddTag={handleAddTag}
          onRemoveTag={removeTag}
          onAddCompany={handleAddCompany}
          onRemoveCompany={removeCompany}
          onInputChange={handleInputChange}
        />
      </TabPanel>

      <TabPanel
        value={activeTab}
        index={formData.type === "programming" ? 4 : 3}
      >
        <EditorialTab formData={formData} onInputChange={handleInputChange} />
      </TabPanel>

      <TabPanel
        value={activeTab}
        index={formData.type === "programming" ? 5 : 4}
      >
        <UploadJsonTab
          fileInputRef={fileInputRef}
          isUploading={isUploading}
          onFileUpload={handleFileUpload}
          onUploadButtonClick={handleUploadButtonClick}
          onPasteJSON={handlePasteJSON}
        />
      </TabPanel>

      <TabPanel
        value={activeTab}
        index={formData.type === "programming" ? 6 : 5}
      >
        <SearchTab
          searchQuery={searchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          onSetSearchQuery={setSearchQuery}
          onSearchQuestions={handleSearchQuestions}
          onLoadQuestion={handleLoadQuestion}
        />
      </TabPanel>

      {/* Form Actions */}
      <Box sx={{ display: "flex", gap: 2, mt: 4, justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          onClick={handleCancelClick}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleExportToJSON}
          startIcon={<FileDownloadIcon />}
          sx={{
            bgcolor: "#FF9800",
            color: "white",
            "&:hover": {
              bgcolor: "#F57C00",
            },
          }}
        >
          Export to JSON
        </Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={
            isRunningTest ? <CircularProgress size={20} /> : <SaveIcon />
          }
          disabled={isRunningTest}
        >
          {isRunningTest
            ? "Validating..."
            : isEdit
            ? "Update Question"
            : "Create Question"}
        </Button>
      </Box>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={showCancelConfirmation}
        onClose={handleCancelConfirmation}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title">Confirm Cancellation</DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            You have unsaved changes. Are you sure you want to cancel? All
            progress will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirmation} color="primary">
            Continue Editing
          </Button>
          <Button
            onClick={handleConfirmCancel}
            color="error"
            variant="contained"
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PAQuestionForm;
