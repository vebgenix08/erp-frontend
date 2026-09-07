import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listClasses, listPrograms } from "../../academic-structure/api/academic-structure.api";
import type {
  AcademicClass,
  Program,
} from "../../academic-structure/model/academic-structure.types";
import {
  activateSubjectPlan,
  addAcademicResponsibility,
  addTeacherEligibility,
  addTimetableEntry,
  assignEmployeeCampus,
  assignOfferingTeacher,
  createSubjectPlan,
  createTimetableRevision,
  deactivateTimetableEntry,
  getClassSetupWorkspace,
  listAcademicResponsibilities,
  listCurriculumSubjects,
  listEmployeeCampusAssignments,
  listSubjectCatalogue,
  listSubjectComponents,
  listSubjectPlans,
  listTeacherEligibility,
  generateClassTimetable,
  publishTimetable,
  removeClassSetupSubject,
  saveClassSetupTiming,
  updateClassSetupSubject,
  updateTimetableEntry,
  validateTimetable,
} from "../../academic-planning/api/academic-planning.api";
import type {
  AcademicResponsibility,
  ClassSetupWorkspace,
  CurriculumSubject,
  EmployeeCampusAssignment,
  SubjectCatalogueItem,
  SubjectComponent,
  SubjectPlan,
  TeacherEligibility,
} from "../../academic-planning/model/academic-planning.types";
import { listEmployees } from "../../staff/api/staff.api";
import type { Employee } from "../../staff/model/staff.types";
import {
  generateClassRegistrationNumbers,
  generateSectionRollNumbers,
  listStudents,
} from "../../students/api/students.api";
import type { Student } from "../../students/model/student.types";
import { listCampusAcademicUnits } from "../../tenant-settings/api/settings.api";
import type { CampusAcademicUnit } from "../../tenant-settings/model/settings.types";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";

const academicYearStart = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00.000Z`).toISOString();

export interface AddClassSubjectInput {
  curriculumSubjectId: string;
  periodsByComponent: Record<string, number>;
}

export interface TimetableLessonInput {
  id?: string;
  dayOfWeek: string;
  periodSlotId: string;
  subjectOfferingId: string;
}

export interface ClassSetupTimingInput {
  name: string;
  applicableDays: string[];
  effectiveFrom: string;
  effectiveUntil?: string;
  slots: Array<{
    label: string;
    startTime: string;
    endTime: string;
    slotType: string;
    applicableDays?: string[];
  }>;
}

export function useClassSetup() {
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [params, setParams] = useSearchParams();
  const setParamsRef = useRef(setParams);
  setParamsRef.current = setParams;
  const initialContext = useRef({
    classId: params.get("classId") ?? "",
    sectionId: params.get("sectionId") ?? "",
  });
  const [units, setUnits] = useState<CampusAcademicUnit[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [workspace, setWorkspace] = useState<ClassSetupWorkspace | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [responsibilities, setResponsibilities] = useState<AcademicResponsibility[]>([]);
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubject[]>([]);
  const [catalogue, setCatalogue] = useState<SubjectCatalogueItem[]>([]);
  const [components, setComponents] = useState<SubjectComponent[]>([]);
  const [plans, setPlans] = useState<SubjectPlan[]>([]);
  const [eligibility, setEligibility] = useState<TeacherEligibility[]>([]);
  const [campusAssignments, setCampusAssignments] = useState<EmployeeCampusAssignment[]>([]);
  const [classId, setClassIdState] = useState(initialContext.current.classId);
  const [sectionId, setSectionIdState] = useState(initialContext.current.sectionId);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [generationIssues, setGenerationIssues] = useState<string[]>([]);

  const selectedClass = classes.find((item) => item.id === classId);
  const selectedProgram = programs.find((item) => item.id === selectedClass?.programId);
  const selectedUnit = units.find((item) => item.id === selectedProgram?.academicUnitId);
  const teachingEmployees = useMemo(
    () => employees.filter((item) => item.status === "ACTIVE" && item.staffCategory === "TEACHING"),
    [employees],
  );
  const employeeNames = useMemo(
    () => new Map(employees.map((item) => [item.id, item.fullName])),
    [employees],
  );

  const updateUrl = useCallback((nextClassId: string, nextSectionId?: string) => {
    setParamsRef.current(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("classId", nextClassId);
        if (nextSectionId) next.set("sectionId", nextSectionId);
        else next.delete("sectionId");
        return next;
      },
      { replace: true },
    );
  }, []);

  const loadWorkspace = useCallback(
    async (nextClassId: string, requestedSectionId?: string) => {
      if (!selectedCampus || !selectedAcademicYear || !nextClassId) return;
      setLoading(true);
      setError(null);
      try {
        const [
          nextWorkspace,
          nextEmployees,
          nextStudents,
          nextResponsibilities,
          nextCurricula,
          nextCatalogue,
          nextComponents,
          nextPlans,
          nextEligibility,
          nextCampusAssignments,
        ] = await Promise.all([
          getClassSetupWorkspace({
            campusId: selectedCampus.id,
            academicYearId: selectedAcademicYear.id,
            classId: nextClassId,
          }),
          listEmployees({ campusId: selectedCampus.id, status: "ACTIVE" }),
          listStudents({
            campusId: selectedCampus.id,
            academicYearId: selectedAcademicYear.id,
            classId: nextClassId,
            status: "ACTIVE",
          }),
          listAcademicResponsibilities({
            campusId: selectedCampus.id,
            academicYearId: selectedAcademicYear.id,
            academicLevelId: nextClassId,
            status: "ACTIVE",
          }),
          listCurriculumSubjects(),
          listSubjectCatalogue({ status: "ACTIVE" }),
          listSubjectComponents(),
          listSubjectPlans({
            campusId: selectedCampus.id,
            academicYearId: selectedAcademicYear.id,
            academicLevelId: nextClassId,
          }),
          listTeacherEligibility({ status: "ACTIVE" }),
          listEmployeeCampusAssignments({ campusId: selectedCampus.id, status: "ACTIVE" }),
        ]);
        setWorkspace(nextWorkspace);
        setEmployees(nextEmployees);
        setStudents(nextStudents);
        setResponsibilities(nextResponsibilities);
        setCurriculumSubjects(nextCurricula);
        setCatalogue(nextCatalogue);
        setComponents(nextComponents);
        setPlans(nextPlans);
        setEligibility(nextEligibility);
        setCampusAssignments(nextCampusAssignments);
        const validSection =
          requestedSectionId &&
          nextWorkspace.sections.some((item) => item.id === requestedSectionId)
            ? requestedSectionId
            : (nextWorkspace.sections[0]?.id ?? "");
        setClassIdState(nextClassId);
        setSectionIdState(validSection);
        updateUrl(nextClassId, validSection);
      } catch (value) {
        setError(value instanceof Error ? value.message : "Unable to load Class Setup");
      } finally {
        setLoading(false);
      }
    },
    [selectedAcademicYear, selectedCampus, updateUrl],
  );

  useEffect(() => {
    if (!selectedCampus || !selectedAcademicYear) return;
    let active = true;
    setLoading(true);
    Promise.all([
      listCampusAcademicUnits(selectedCampus.id),
      listPrograms(selectedCampus.id),
      listClasses(selectedCampus.id),
    ])
      .then(async ([nextUnits, nextPrograms, nextClasses]) => {
        if (!active) return;
        setUnits(nextUnits.filter((item) => item.status === "ACTIVE"));
        setPrograms(nextPrograms.filter((item) => item.status === "ACTIVE"));
        setClasses(nextClasses.filter((item) => item.status === "ACTIVE"));
        const requested = initialContext.current.classId;
        const initialClass =
          nextClasses.find((item) => item.id === requested && item.status === "ACTIVE") ??
          nextClasses.find((item) => item.status === "ACTIVE");
        if (initialClass)
          await loadWorkspace(initialClass.id, initialContext.current.sectionId || undefined);
        else setLoading(false);
      })
      .catch((value) => {
        if (active) {
          setError(value instanceof Error ? value.message : "Unable to load academic hierarchy");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loadWorkspace, selectedAcademicYear, selectedCampus]);

  const refresh = useCallback(async () => {
    if (classId) await loadWorkspace(classId, sectionId);
  }, [classId, loadWorkspace, sectionId]);

  const execute = useCallback(async (work: () => Promise<void>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await work();
      setNotice(message);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save Class Setup changes");
      throw value;
    } finally {
      setBusy(false);
    }
  }, []);

  const selectClass = useCallback(
    async (nextClassId: string) => {
      setGenerationIssues([]);
      await loadWorkspace(nextClassId);
    },
    [loadWorkspace],
  );

  const selectSection = useCallback(
    (nextSectionId: string) => {
      setSectionIdState(nextSectionId);
      if (classId) updateUrl(classId, nextSectionId);
    },
    [classId, updateUrl],
  );

  const assignSectionResponsibility = useCallback(
    async (
      targetSectionId: string,
      employeeId: string,
      responsibilityType: "CLASS_TEACHER" | "SECTION_INCHARGE",
    ) => {
      if (!selectedCampus || !selectedAcademicYear || !selectedClass || !employeeId) return;
      await execute(
        async () => {
          await addAcademicResponsibility({
            employeeId,
            campusId: selectedCampus.id,
            academicYearId: selectedAcademicYear.id,
            responsibilityType,
            ...(selectedUnit ? { academicUnitId: selectedUnit.id } : {}),
            programId: selectedClass.programId,
            academicLevelId: selectedClass.id,
            sectionId: targetSectionId,
            effectiveFrom: academicYearStart(selectedAcademicYear.startDate),
            replaceExisting: true,
          });
          await refresh();
        },
        responsibilityType === "CLASS_TEACHER"
          ? "Class teacher assignment saved."
          : "Section incharge assignment saved.",
      );
    },
    [execute, refresh, selectedAcademicYear, selectedCampus, selectedClass, selectedUnit],
  );

  const curriculumMap = useMemo(
    () => new Map(curriculumSubjects.map((item) => [item.id, item])),
    [curriculumSubjects],
  );

  const teacherNeedsQualification = useCallback(
    (offeringId: string, employeeId: string) => {
      const offering = workspace?.offerings.find((item) => item.id === offeringId);
      const subjectCatalogueId = offering
        ? curriculumMap.get(offering.curriculumSubjectId)?.subjectCatalogueId
        : undefined;
      if (!subjectCatalogueId) return true;
      return !eligibility.some(
        (item) =>
          item.employeeId === employeeId &&
          item.subjectCatalogueId === subjectCatalogueId &&
          item.status === "ACTIVE",
      );
    },
    [curriculumMap, eligibility, workspace],
  );

  const assignSectionSubjectTeacher = useCallback(
    async (offeringId: string, employeeId: string, qualificationReference?: string) => {
      if (!selectedCampus || !selectedAcademicYear || !employeeId) return;
      const offering = workspace?.offerings.find((item) => item.id === offeringId);
      const curriculum = offering ? curriculumMap.get(offering.curriculumSubjectId) : undefined;
      if (!offering || !curriculum)
        throw new Error("The selected section subject is not available.");
      const needsQualification = teacherNeedsQualification(offeringId, employeeId);
      if (needsQualification && !qualificationReference?.trim())
        throw new Error("A qualification reference is required for this subject teacher.");
      await execute(async () => {
        const hasCampusAccess = campusAssignments.some(
          (item) =>
            item.employeeId === employeeId &&
            item.campusId === selectedCampus.id &&
            item.availableForTeaching &&
            item.status === "ACTIVE",
        );
        if (!hasCampusAccess) {
          await assignEmployeeCampus({
            employeeId,
            campusId: selectedCampus.id,
            assignmentType: "TEACHING",
            availableForTeaching: true,
            effectiveFrom: academicYearStart(selectedAcademicYear.startDate),
          });
        }
        if (needsQualification) {
          await addTeacherEligibility({
            employeeId,
            subjectCatalogueId: curriculum.subjectCatalogueId,
            curriculumId: curriculum.curriculumId,
            programId: curriculum.programId,
            academicLevelIds: [curriculum.academicLevelId],
            qualificationReference: qualificationReference!.trim(),
            effectiveFrom: academicYearStart(selectedAcademicYear.startDate),
          });
        }
        await assignOfferingTeacher({
          subjectOfferingId: offeringId,
          employeeId,
          assignmentRole: "PRIMARY",
          workloadSharePercentage: 100,
          effectiveFrom: academicYearStart(selectedAcademicYear.startDate),
          replaceExistingPrimary: true,
        });
        await refresh();
      }, "Section subject teacher assignment saved.");
    },
    [
      campusAssignments,
      curriculumMap,
      execute,
      refresh,
      selectedAcademicYear,
      selectedCampus,
      teacherNeedsQualification,
      workspace,
    ],
  );

  const availableCurriculumSubjects = useMemo(() => {
    const planned = new Set(
      plans.filter((item) => item.status !== "CLOSED").map((item) => item.curriculumSubjectId),
    );
    return curriculumSubjects.filter(
      (item) =>
        item.academicLevelId === classId && item.status === "ACTIVE" && !planned.has(item.id),
    );
  }, [classId, curriculumSubjects, plans]);

  const addClassSubject = useCallback(
    async (input: AddClassSubjectInput) => {
      if (!selectedCampus || !selectedAcademicYear) return;
      const curriculum = curriculumSubjects.find((item) => item.id === input.curriculumSubjectId);
      if (!curriculum || curriculum.academicLevelId !== classId)
        throw new Error("Select a curriculum subject for this class.");
      const selectedComponents = components.filter(
        (item) => item.curriculumSubjectId === curriculum.id && item.status === "ACTIVE",
      );
      if (!selectedComponents.length)
        throw new Error("This subject has no active teaching component.");
      await execute(async () => {
        const plan = await createSubjectPlan({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          academicUnitId: curriculum.academicUnitId,
          curriculumId: curriculum.curriculumId,
          programId: curriculum.programId,
          academicLevelId: curriculum.academicLevelId,
          curriculumSubjectId: curriculum.id,
          appliesToAllSections: true,
          componentPlans: selectedComponents.map((item) => ({
            subjectComponentId: item.id,
            plannedPeriodsPerWeek:
              input.periodsByComponent[item.id] ?? item.baselinePeriodsPerWeek ?? 1,
            preferredSessionLength: item.preferredSessionLength || 1,
            isOverride: false,
          })),
        });
        await activateSubjectPlan(plan.id);
        await refresh();
      }, "Class subject added for every active section.");
    },
    [
      classId,
      components,
      curriculumSubjects,
      execute,
      refresh,
      selectedAcademicYear,
      selectedCampus,
    ],
  );

  const updateClassSubject = useCallback(
    async (subjectPlanId: string, periodsByComponent: Record<string, number>) => {
      if (!selectedCampus || !selectedAcademicYear || !classId) return;
      const plan = plans.find((item) => item.id === subjectPlanId);
      if (!plan) throw new Error("The class subject plan is unavailable.");
      await execute(async () => {
        const next = await updateClassSetupSubject({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          classId,
          subjectPlanId,
          componentPlans: plan.componentPlans.map((item) => ({
            subjectComponentId: item.subjectComponentId,
            plannedPeriodsPerWeek:
              periodsByComponent[item.subjectComponentId] ?? item.plannedPeriodsPerWeek,
          })),
        });
        setWorkspace(next);
        const refreshedPlans = await listSubjectPlans({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          academicLevelId: classId,
        });
        setPlans(refreshedPlans);
      }, "Class subject allocation updated. Validate the timetable before publishing.");
    },
    [classId, execute, plans, selectedAcademicYear, selectedCampus],
  );

  const removeClassSubject = useCallback(
    async (subjectPlanId: string, reason: string) => {
      if (!selectedCampus || !selectedAcademicYear || !classId) return;
      await execute(async () => {
        const next = await removeClassSetupSubject({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          classId,
          subjectPlanId,
          reason,
        });
        setWorkspace(next);
        setPlans((items) =>
          items.map((item) => (item.id === subjectPlanId ? { ...item, status: "CLOSED" } : item)),
        );
      }, "Class subject removed from the current academic-year plan.");
    },
    [classId, execute, selectedAcademicYear, selectedCampus],
  );

  const saveTiming = useCallback(
    async (input: ClassSetupTimingInput) => {
      if (!selectedCampus || !selectedAcademicYear || !classId) return;
      await execute(async () => {
        const next = await saveClassSetupTiming({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          classId,
          ...input,
        });
        setWorkspace(next);
        setGenerationIssues([]);
      }, "Working-day timings saved. Generate and validate the new timetable draft.");
    },
    [classId, execute, selectedAcademicYear, selectedCampus],
  );

  const generateDraft = useCallback(async () => {
    if (!selectedCampus || !selectedAcademicYear || !classId) return;
    await execute(async () => {
      const result = await generateClassTimetable({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        classId,
      });
      setWorkspace(result);
      setGenerationIssues(result.generation.issues);
      if (!result.generation.success)
        throw new Error(result.generation.issues.join(" ") || "Timetable draft is incomplete.");
    }, "Class timetable draft generated across all sections.");
  }, [classId, execute, selectedAcademicYear, selectedCampus]);

  const saveLesson = useCallback(
    async (input: TimetableLessonInput) => {
      const version = workspace?.currentVersion;
      const offering = workspace?.offerings.find((item) => item.id === input.subjectOfferingId);
      const assignment = workspace?.assignments.find(
        (item) =>
          item.subjectOfferingId === input.subjectOfferingId &&
          item.assignmentRole === "PRIMARY" &&
          item.status === "ACTIVE",
      );
      if (!version || version.status !== "DRAFT")
        throw new Error("Create a draft timetable before editing lessons.");
      if (!offering || !assignment)
        throw new Error("Assign a primary teacher before placing this subject.");
      await execute(
        async () => {
          const payload = {
            timetableVersionId: version.id,
            dayOfWeek: input.dayOfWeek,
            periodSlotIds: [input.periodSlotId],
            subjectOfferingId: input.subjectOfferingId,
            teachingAssignmentIds: [assignment.id],
            entryType: "REGULAR",
          };
          if (input.id) await updateTimetableEntry(input.id, payload);
          else await addTimetableEntry(payload);
          await refresh();
        },
        input.id ? "Timetable lesson updated." : "Timetable lesson added.",
      );
    },
    [execute, refresh, workspace],
  );

  const removeLesson = useCallback(
    async (id: string) => {
      await execute(async () => {
        await deactivateTimetableEntry(id);
        await refresh();
      }, "Timetable lesson removed.");
    },
    [execute, refresh],
  );

  const publish = useCallback(async () => {
    const version = workspace?.currentVersion;
    if (!version || version.status !== "DRAFT") return;
    await execute(async () => {
      const validation = await validateTimetable(version.id);
      if (validation.run.status !== "PASSED" || validation.run.hardConflictCount > 0) {
        throw new Error(
          validation.conflicts.map((item) => item.message).join(" ") ||
            "Resolve timetable conflicts before publishing.",
        );
      }
      await publishTimetable(version.id, validation.run.id);
      await refresh();
    }, "Timetable published successfully.");
  }, [execute, refresh, workspace]);

  const revise = useCallback(async () => {
    const version = workspace?.currentVersion;
    if (!version || version.status !== "PUBLISHED") return;
    await execute(async () => {
      await createTimetableRevision(version.id);
      await refresh();
    }, "Editable timetable revision created.");
  }, [execute, refresh, workspace]);

  const generateRegistrationNumbers = useCallback(async () => {
    if (!selectedCampus || !selectedAcademicYear || !classId) return;
    await execute(async () => {
      const result = await generateClassRegistrationNumbers({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        classId,
        clientRequestId: crypto.randomUUID(),
      });
      setStudents(result.students);
    }, "Class registration numbers are up to date.");
  }, [classId, execute, selectedAcademicYear, selectedCampus]);

  const generateRollNumbers = useCallback(
    async (regenerate: boolean) => {
      if (!selectedCampus || !selectedAcademicYear || !classId || !sectionId) return;
      await execute(
        async () => {
          const result = await generateSectionRollNumbers({
            campusId: selectedCampus.id,
            academicYearId: selectedAcademicYear.id,
            classId,
            sectionId,
            regenerate,
            clientRequestId: crypto.randomUUID(),
          });
          setStudents((current) => [
            ...current.filter((item) => item.enrollment.sectionId !== sectionId),
            ...result.students,
          ]);
        },
        regenerate
          ? "Section roll numbers regenerated."
          : "Missing section roll numbers generated.",
      );
    },
    [classId, execute, sectionId, selectedAcademicYear, selectedCampus],
  );

  return {
    selectedCampus,
    selectedAcademicYear,
    units,
    programs,
    classes,
    workspace,
    employees,
    teachingEmployees,
    employeeNames,
    students,
    responsibilities,
    curriculumSubjects,
    catalogue,
    components,
    plans,
    availableCurriculumSubjects,
    selectedClass,
    selectedProgram,
    selectedUnit,
    classId,
    sectionId,
    loading,
    busy,
    error,
    notice,
    generationIssues,
    selectClass,
    selectSection,
    assignSectionResponsibility,
    assignSectionSubjectTeacher,
    teacherNeedsQualification,
    addClassSubject,
    updateClassSubject,
    removeClassSubject,
    saveTiming,
    generateDraft,
    saveLesson,
    removeLesson,
    publish,
    revise,
    generateRegistrationNumbers,
    generateRollNumbers,
    refresh,
  };
}
