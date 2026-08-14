import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Button, Tabs, Tab, CircularProgress } from "@mui/material";
import { Save as SaveIcon, Close as CloseIcon, Download as DownloadIcon } from "@mui/icons-material";
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
import EditorialTab from "./tabs/EditorialTab";
import TabPanel from "./QuestionForm/TabPanel";
import BulkQuestionUpload from "./BulkQuestionUpload";
import SqlQuestionTab from "./QuestionForm/SqlQuestionTab";

// Import utilities and constants
import {
  LANGUAGES,
  getDefaultFormData,
  getDefaultSqlMeta,
} from "./QuestionForm/constants";
import {
  buildFormDataFromQuestionJson,
  codeExecutionApi,
  simpleValidateAllTestCases,
} from "./QuestionForm/utils";
import {
  generateSqlOutputs,
  validateSqlTestcases,
  toSqlErrorMessage,
} from "../../services/sqlQuestionApi";

const QuestionForm = ({
  initialData,
  onSave,
  onCancel,
  moduleId,
  cohortId,
  isEdit = false,
  onBulkUpload,
  bulkUploading = false,
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

  // SQL authoring states. `sqlGenerated` gates publishing: an author may only
  // publish output they have actually seen.
  const [sqlGenerating, setSqlGenerating] = useState(false);
  const [sqlValidating, setSqlValidating] = useState(false);
  const [sqlGenerated, setSqlGenerated] = useState(null);
  const [sqlValidation, setSqlValidation] = useState(null);
  const [sqlEngineError, setSqlEngineError] = useState(null);
  const [isUploadingTestCases, setIsUploadingTestCases] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize form data when initialData changes
  useEffect(() => {
    if (initialData) {
      const completeFormData = {
        ...getDefaultFormData(moduleId),
        ...initialData,
        module: moduleId || initialData.module,
        marks: initialData.marks ? Number(initialData.marks) : 10,
        constraints: {
          timeLimit: initialData.constraints?.timeLimit
            ? Number(initialData.constraints.timeLimit)
            : 1000,
          memoryLimit: initialData.constraints?.memoryLimit
            ? Number(initialData.constraints.memoryLimit)
            : 256,
        },
        encryptedEditor: initialData.encryptedEditor ?? false,
        encryptionSettings: {
          allowPlainTextPaste:
            initialData.encryptionSettings?.allowPlainTextPaste ?? false,
        },
        fillInTheBlank: initialData.fillInTheBlank ?? false,
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
      const { name, value } = e.target;

      if (name === "marks") {
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
      // SQL and MCQ share the same tab count: they have no Test Cases tab and
      // no bulk upload, so their last index is 5.
      const maxTabIndex =
        formData.type === "programming"
          ? !isEdit && onBulkUpload
            ? 7
            : 6
          : 5;
      if (newValue <= maxTabIndex) {
        setActiveTab(newValue);
      }
    },
    [formData.type, isEdit, onBulkUpload]
  );

  /** Keeps the SQL authoring block in form state and invalidates stale results. */
  const handleSqlMetaChange = useCallback((nextSqlMeta) => {
    setFormData((prev) => ({ ...prev, sqlMeta: nextSqlMeta }));
    // Any edit to schema, solution or seeds makes previously generated output
    // stale, so it must be regenerated before publishing.
    setSqlGenerated(null);
    setSqlValidation(null);
  }, []);

  /** Builds the payload shared by generate, validate and publish. */
  const buildSqlPayload = useCallback(() => {
    const sqlMeta = formData.sqlMeta || getDefaultSqlMeta();
    return {
      judgeQuestionId: sqlMeta.judgeQuestionId,
      judgeVersion: sqlMeta.judgeVersion || 1,
      title: formData.title,
      description: formData.description,
      difficultyLevel: formData.difficultyLevel,
      marks: formData.marks,
      schemaSql: sqlMeta.schemaSql,
      solutionSql: sqlMeta.solutionSql,
      boilerplateSql: sqlMeta.boilerplateSql,
      constraints: sqlMeta.constraints || [],
      testcases: (sqlMeta.testcases || []).map((tc) => ({
        id: tc.id,
        seedSql: tc.seedSql,
        visible: Boolean(tc.visible),
        ...(tc.expected ? { expected: tc.expected } : {}),
      })),
      hints: formData.hints || [],
      tags: formData.tags || [],
      companies: formData.companies || [],
      editorial: formData.editorial || "",
      overwrite: Boolean(sqlMeta.overwrite),
    };
  }, [formData]);

  const handleGenerateSqlOutputs = useCallback(async () => {
    if (!cohortId || !moduleId) {
      toast.error("Cohort or module is missing; cannot reach the SQL engine.");
      return;
    }
    setSqlGenerating(true);
    setSqlEngineError(null);
    setSqlValidation(null);
    try {
      const result = await generateSqlOutputs(cohortId, moduleId, buildSqlPayload());
      setSqlGenerated(result);
      // Store the generated rows so validation and publishing use the reviewed
      // output rather than re-deriving it.
      setFormData((prev) => ({
        ...prev,
        sqlMeta: {
          ...(prev.sqlMeta || {}),
          testcases: (prev.sqlMeta?.testcases || []).map((tc) => {
            const generated = (result.testcases || []).find((g) => g.id === tc.id);
            return generated ? { ...tc, expected: generated.expected } : tc;
          }),
        },
      }));
      toast.success(result.message || "Expected output generated");
    } catch (error) {
      const message = toSqlErrorMessage(error, "Failed to generate expected outputs");
      setSqlEngineError(message);
      toast.error(message);
    } finally {
      setSqlGenerating(false);
    }
  }, [buildSqlPayload, cohortId, moduleId]);

  const handleValidateSqlTestcases = useCallback(async () => {
    if (!cohortId || !moduleId) {
      toast.error("Cohort or module is missing; cannot reach the SQL engine.");
      return;
    }
    setSqlValidating(true);
    setSqlEngineError(null);
    try {
      const result = await validateSqlTestcases(cohortId, moduleId, buildSqlPayload());
      setSqlValidation(result);
      if (result.valid) toast.success(result.message || "Testcases validated");
      else toast.warning(result.message || "Some testcases do not match");
    } catch (error) {
      const message = toSqlErrorMessage(error, "Failed to validate testcases");
      setSqlEngineError(message);
      toast.error(message);
    } finally {
      setSqlValidating(false);
    }
  }, [buildSqlPayload, cohortId, moduleId]);

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

          const { formData: updatedFormData, error } =
            buildFormDataFromQuestionJson(questionData, moduleId);

          if (error) {
            toast.error(`Invalid question format. ${error}.`);
            setIsUploading(false);
            return;
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
        // Same mapper as the file upload path, so both imports behave alike.
        const { formData: updatedFormData, error } =
          buildFormDataFromQuestionJson(questionData, moduleId);

        if (error) {
          toast.error(`Invalid question format. ${error}.`);
          return;
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
    async (question) => {
      try {
        // The search only returns summary data, so we need to fetch the full question
        toast.info("Fetching full question data...");

        const response = await axios.get(
          `/practice-arena/questions/${question._id}`
        );
        const fullQuestion = response.data;

        // Create a clean copy of the question WITHOUT database IDs
        // This ensures each load creates a NEW independent question
        const {
          _id,
          createdAt,
          updatedAt,
          createdBy,
          questionBank,
          maintag,
          __v,
          ...questionDataWithoutIds
        } = fullQuestion;

        // Build the loaded form data, ensuring we don't lose any fields
        const loadedFormData = {
          ...getDefaultFormData(moduleId),
          title: questionDataWithoutIds.title || "",
          description: questionDataWithoutIds.description || "",
          type: questionDataWithoutIds.type || "programming",
          difficultyLevel: questionDataWithoutIds.difficultyLevel || "medium",
          marks: questionDataWithoutIds.marks
            ? Number(questionDataWithoutIds.marks)
            : 10,
          module: moduleId,
          // MCQ fields
          options:
            questionDataWithoutIds.options ||
            getDefaultFormData(moduleId).options,
          // Programming fields
          languages:
            questionDataWithoutIds.languages ||
            getDefaultFormData(moduleId).languages,
          defaultLanguage: questionDataWithoutIds.defaultLanguage || "java",
          testCases: questionDataWithoutIds.testCases || [],
          inputFormat: questionDataWithoutIds.inputFormat || "",
          outputFormat: questionDataWithoutIds.outputFormat || "",
          examples: questionDataWithoutIds.examples || [],
          constraints: {
            timeLimit: questionDataWithoutIds.constraints?.timeLimit
              ? Number(questionDataWithoutIds.constraints.timeLimit)
              : 1000,
            memoryLimit: questionDataWithoutIds.constraints?.memoryLimit
              ? Number(questionDataWithoutIds.constraints.memoryLimit)
              : 256,
          },
          // Additional fields
          hints: questionDataWithoutIds.hints || [],
          tags: questionDataWithoutIds.tags || [],
          companies: questionDataWithoutIds.companies || [],
          editorial: questionDataWithoutIds.editorial || "",
          encryptionSettings: questionDataWithoutIds.encryptionSettings || {
            allowPlainTextPaste: false,
          },
          fillInTheBlank: questionDataWithoutIds.fillInTheBlank || false,
        };

        setFormData(loadedFormData);
        setSearchResults([]);
        setSearchQuery("");
        toast.success(
          `Question "${
            questionDataWithoutIds.title
          }" loaded successfully with all data (${
            questionDataWithoutIds.testCases?.length || 0
          } test cases). This will create a new independent question for this cohort.`
        );
      } catch (error) {
        console.error("Error loading full question:", error);
        toast.error("Failed to load full question data. Please try again.");
      }
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
    } else if (formData.type === "sql") {
      const sqlMeta = formData.sqlMeta || {};
      const testcases = sqlMeta.testcases || [];

      if (!String(sqlMeta.judgeQuestionId || "").trim()) {
        newErrors.judgeQuestionId = "A SQL engine question id is required";
      }
      if (!String(sqlMeta.schemaSql || "").trim()) {
        newErrors.schemaSql = "schema.sql is required";
      }
      if (!String(sqlMeta.solutionSql || "").trim()) {
        newErrors.solutionSql = "solution.sql is required";
      }
      if (testcases.length === 0) {
        newErrors.sqlTestcases = "At least one testcase is required";
      }
      if (testcases.some((tc) => !String(tc.seedSql || "").trim())) {
        newErrors.sqlSeeds = "Every testcase needs seed SQL";
      }
      if (!testcases.some((tc) => tc.visible)) {
        newErrors.sqlVisible = "At least one testcase must be visible";
      }
      const ids = testcases.map((tc) => String(tc.id || "").trim());
      if (ids.some((id) => !id)) {
        newErrors.sqlTestcaseIds = "Every testcase needs an id";
      } else if (new Set(ids).size !== ids.length) {
        newErrors.sqlTestcaseIds = "Testcase ids must be unique";
      }
      // Publishing writes to shared storage and executes the solution, so it is
      // only allowed once the author has reviewed the generated output.
      if (!sqlGenerated) {
        newErrors.sqlGenerated =
          "Run Generate Outputs and review the results before submitting";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, sqlGenerated]);

  // Form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        const firstError = Object.values(errors)[0];
        toast.error(firstError || "Please fix the form errors before submitting");
        return;
      }

      // SQL questions are published through a dedicated endpoint: the engine
      // writes the assets to its own storage and regenerates the expected
      // output, then the question row is created locally.
      if (formData.type === "sql") {
        onSave({
          ...buildSqlPayload(),
          type: "sql",
          // Kept so the parent can display what was reviewed before publishing.
          generatedOutputColumns: sqlGenerated?.outputColumns || [],
        });
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
    [
      formData,
      validateForm,
      validateAllTestCases,
      onSave,
      buildSqlPayload,
      sqlGenerated,
      errors,
    ]
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
        : "cohort_question.json";

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

  const bulkUploadTabIndex =
    formData.type === "programming" && !isEdit && onBulkUpload ? 7 : -1;
  const isBulkUploadActive = activeTab === bulkUploadTabIndex;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
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
        <Tab
          label={
            formData.type === "mcq"
              ? "Options"
              : formData.type === "sql"
              ? "SQL Setup"
              : "Languages"
          }
        />
        {formData.type === "programming" && <Tab label="Test Cases" />}
        <Tab label="Additional Details" />
        <Tab label="Editorial" />
        <Tab label="Upload JSON" />
        <Tab label="Search Questions" />
        {formData.type === "programming" && !isEdit && onBulkUpload && (
          <Tab label="Bulk Upload" />
        )}
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
        {formData.type === "sql" ? (
          <SqlQuestionTab
            formData={formData}
            errors={errors}
            onSqlMetaChange={handleSqlMetaChange}
            onGenerateOutputs={handleGenerateSqlOutputs}
            onValidateTestcases={handleValidateSqlTestcases}
            generating={sqlGenerating}
            validating={sqlValidating}
            generated={sqlGenerated}
            validation={sqlValidation}
            engineError={sqlEngineError}
          />
        ) : formData.type === "mcq" ? (
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

      {bulkUploadTabIndex >= 0 && (
        <TabPanel value={activeTab} index={bulkUploadTabIndex}>
          <BulkQuestionUpload
            onUpload={onBulkUpload}
            onCancel={onCancel}
            loading={bulkUploading}
          />
        </TabPanel>
      )}

      {/* Form Actions */}
      {!isBulkUploadActive && (
      <Box sx={{ display: "flex", gap: 2, mt: 4, justifyContent: "space-between" }}>
        <Button 
          variant="outlined" 
          onClick={handleExportToJSON}
          startIcon={<DownloadIcon />}
          sx={{ 
            borderColor: "#4caf50",
            color: "#4caf50",
            "&:hover": {
              borderColor: "#45a049",
              bgcolor: "rgba(76, 175, 80, 0.1)"
            }
          }}
        >
          Export to JSON
        </Button>
        
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" onClick={onCancel} startIcon={<CloseIcon />}>
            Cancel
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
      </Box>
      )}
    </Box>
  );
};

export default QuestionForm;
